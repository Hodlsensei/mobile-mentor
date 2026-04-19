import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NIGERIAN_STATES, FUEL_TYPES } from "@/lib/nigeria";
import { Bell, BellOff, Filter, X } from "lucide-react";

export interface FilterState {
  state: string;
  area: string;
  fuelType?: string;
  last24h: boolean;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  showFuelType?: boolean;
  alertEnabled?: boolean;
  onAlertToggle?: (enabled: boolean) => void;
  alertCapable?: boolean;
}

const ALL = "__all__";

export const ReportFilters = ({ filters, onChange, showFuelType, alertEnabled, onAlertToggle, alertCapable }: Props) => {
  const hasActive = filters.state || filters.area || filters.fuelType || filters.last24h;

  const reset = () => onChange({ state: "", area: "", fuelType: showFuelType ? "" : undefined, last24h: false });

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filters
        </div>

        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">State</Label>
          <Select
            value={filters.state || ALL}
            onValueChange={(v) => onChange({ ...filters, state: v === ALL ? "" : v })}
          >
            <SelectTrigger className="h-9"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={ALL}>All states</SelectItem>
              {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">Area</Label>
          <Input
            className="h-9"
            placeholder="e.g. Lekki"
            value={filters.area}
            onChange={(e) => onChange({ ...filters, area: e.target.value })}
          />
        </div>

        {showFuelType && (
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-xs">Fuel type</Label>
            <Select
              value={filters.fuelType || ALL}
              onValueChange={(v) => onChange({ ...filters, fuelType: v === ALL ? "" : v })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All fuels</SelectItem>
                {FUEL_TYPES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-md border border-input px-3 h-9">
          <Switch
            id="last24h"
            checked={filters.last24h}
            onCheckedChange={(v) => onChange({ ...filters, last24h: v })}
          />
          <Label htmlFor="last24h" className="cursor-pointer text-sm">Last 24h</Label>
        </div>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}

        {onAlertToggle && (
          <Button
            variant={alertEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => onAlertToggle(!alertEnabled)}
            disabled={!alertCapable || (!filters.state && !filters.area)}
            className="h-9"
            title={!filters.state && !filters.area ? "Pick a state or area first" : "Notify me about new reports"}
          >
            {alertEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {alertEnabled ? "Alerts on" : "Alert me"}
          </Button>
        )}
      </div>
    </div>
  );
};
