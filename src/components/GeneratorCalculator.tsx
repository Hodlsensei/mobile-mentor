import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Fuel, Clock, Coins } from "lucide-react";
import { formatNaira } from "@/lib/nigeria";

// Approximate fuel consumption (litres/hour) at 50% load by gen size in KVA
const consumptionByKva = (kva: number) => {
  if (kva <= 1) return 0.4;
  if (kva <= 2.5) return 0.7;
  if (kva <= 5) return 1.4;
  if (kva <= 10) return 2.5;
  if (kva <= 25) return 5.5;
  if (kva <= 50) return 10;
  if (kva <= 100) return 18;
  return 0.18 * kva;
};

export const GeneratorCalculator = () => {
  const [kva, setKva] = useState("3");
  const [hours, setHours] = useState("4");
  const [fuelType, setFuelType] = useState<"pms" | "diesel">("pms");
  const [pricePerLitre, setPricePerLitre] = useState("1200");
  const [tankSize, setTankSize] = useState("15");

  const result = useMemo(() => {
    const k = parseFloat(kva) || 0;
    const h = parseFloat(hours) || 0;
    const price = parseFloat(pricePerLitre) || 0;
    const tank = parseFloat(tankSize) || 0;
    const lph = consumptionByKva(k) * (fuelType === "diesel" ? 0.85 : 1);
    const totalLitres = lph * h;
    const totalCost = totalLitres * price;
    const dailyCost = lph * 24 * price;
    const tankRuntime = lph > 0 ? tank / lph : 0;
    return { lph, totalLitres, totalCost, dailyCost, tankRuntime };
  }, [kva, hours, fuelType, pricePerLitre, tankSize]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Generator Calculator</h3>
            <p className="text-sm text-muted-foreground">Plan your fuel & runtime</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kva">Generator size (KVA)</Label>
              <Input id="kva" type="number" min="0.5" step="0.5" value={kva} onChange={(e) => setKva(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours">Hours running/day</Label>
              <Input id="hours" type="number" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select value={fuelType} onValueChange={(v) => setFuelType(v as typeof fuelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pms">PMS (Petrol)</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price per litre (₦)</Label>
              <Input id="price" type="number" min="0" value={pricePerLitre} onChange={(e) => setPricePerLitre(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tank">Tank size (litres)</Label>
            <Input id="tank" type="number" min="0" value={tankSize} onChange={(e) => setTankSize(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <ResultCard icon={Fuel} label="Fuel needed today" value={`${result.totalLitres.toFixed(2)} L`} sub={`${result.lph.toFixed(2)} L/hr at 50% load`} />
        <ResultCard icon={Coins} label="Cost today" value={formatNaira(result.totalCost)} sub={`${formatNaira(result.dailyCost)} if running 24 hrs`} highlight />
        <ResultCard icon={Clock} label="Tank runtime" value={`${result.tankRuntime.toFixed(1)} hrs`} sub={`On a ${tankSize}L tank`} />
        <p className="px-1 text-xs text-muted-foreground">
          ⚠️ Estimates based on average consumption at 50% load. Actual usage varies by generator condition, load, and fuel quality.
        </p>
      </div>
    </div>
  );
};

const ResultCard = ({ icon: Icon, label, value, sub, highlight }: { icon: typeof Fuel; label: string; value: string; sub: string; highlight?: boolean }) => (
  <div className={`rounded-xl border p-5 shadow-card ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  </div>
);
