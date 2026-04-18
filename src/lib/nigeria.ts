// Nigerian states & DisCos for dropdowns
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

export const DISCOS = [
  "AEDC (Abuja)", "BEDC (Benin)", "EEDC (Enugu)", "EKEDC (Eko)", "IBEDC (Ibadan)",
  "IKEDC (Ikeja)", "JED (Jos)", "KAEDCO (Kaduna)", "KEDCO (Kano)", "PHED (Port Harcourt)", "YEDC (Yola)",
] as const;

export const FUEL_TYPES = [
  { value: "pms", label: "PMS (Petrol)" },
  { value: "diesel", label: "Diesel (AGO)" },
  { value: "gas", label: "Cooking Gas (LPG)" },
  { value: "kerosene", label: "Kerosene (DPK)" },
] as const;

export const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export const timeAgo = (date: string | Date) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
