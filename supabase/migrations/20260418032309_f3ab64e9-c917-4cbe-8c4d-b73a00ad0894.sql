-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  area TEXT,
  state TEXT,
  phone TEXT,
  trust_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Power outage reports
CREATE TABLE public.power_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  state TEXT NOT NULL,
  disco TEXT,
  status TEXT NOT NULL CHECK (status IN ('light', 'no_light', 'partial')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_power_reports_created ON public.power_reports (created_at DESC);
CREATE INDEX idx_power_reports_area ON public.power_reports (state, area);

-- Fuel stations
CREATE TABLE public.fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  area TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fuel_stations_area ON public.fuel_stations (state, area);

-- Fuel reports (price + availability)
CREATE TABLE public.fuel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.fuel_stations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('pms', 'diesel', 'gas', 'kerosene')),
  available BOOLEAN NOT NULL,
  price_naira NUMERIC(10,2),
  queue_level TEXT CHECK (queue_level IN ('none', 'short', 'long')),
  notes TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fuel_reports_station ON public.fuel_reports (station_id, created_at DESC);

-- Votes (one per user per report)
CREATE TABLE public.report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('power', 'fuel')),
  report_id UUID NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_type, report_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

-- Security definer for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, area, state, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'area',
    NEW.raw_user_meta_data ->> 'state',
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vote count trigger to keep upvotes synced
CREATE OR REPLACE FUNCTION public.recalc_report_upvotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _report_id UUID;
  _report_type TEXT;
  _total INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _report_id := OLD.report_id; _report_type := OLD.report_type;
  ELSE
    _report_id := NEW.report_id; _report_type := NEW.report_type;
  END IF;

  SELECT COALESCE(SUM(vote), 0) INTO _total
  FROM public.report_votes
  WHERE report_type = _report_type AND report_id = _report_id;

  IF _report_type = 'power' THEN
    UPDATE public.power_reports SET upvotes = _total WHERE id = _report_id;
  ELSIF _report_type = 'fuel' THEN
    UPDATE public.fuel_reports SET upvotes = _total WHERE id = _report_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER report_votes_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.report_votes
FOR EACH ROW EXECUTE FUNCTION public.recalc_report_upvotes();

-- RLS POLICIES

-- profiles: public read, owner write
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- user_roles: users see their own; admins see all
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- power_reports: anyone authenticated can read; users insert their own; owners or admins update/delete
CREATE POLICY "Power reports readable by all" ON public.power_reports FOR SELECT USING (true);
CREATE POLICY "Users create power reports" ON public.power_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own power reports" ON public.power_reports FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own power reports" ON public.power_reports FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- fuel_stations: public read; authenticated create
CREATE POLICY "Fuel stations readable by all" ON public.fuel_stations FOR SELECT USING (true);
CREATE POLICY "Authenticated create stations" ON public.fuel_stations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners or mods update stations" ON public.fuel_stations FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete stations" ON public.fuel_stations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- fuel_reports
CREATE POLICY "Fuel reports readable by all" ON public.fuel_reports FOR SELECT USING (true);
CREATE POLICY "Users create fuel reports" ON public.fuel_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own fuel reports" ON public.fuel_reports FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own fuel reports" ON public.fuel_reports FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- report_votes
CREATE POLICY "Users view all votes" ON public.report_votes FOR SELECT USING (true);
CREATE POLICY "Users cast own votes" ON public.report_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users change own votes" ON public.report_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users remove own votes" ON public.report_votes FOR DELETE USING (auth.uid() = user_id);