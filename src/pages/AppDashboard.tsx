import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { PowerReports } from "@/components/PowerReports";
import { FuelReports } from "@/components/FuelReports";
import { GeneratorCalculator } from "@/components/GeneratorCalculator";
import { CommunityFeed } from "@/components/CommunityFeed";
import { Zap, Fuel, Calculator, Users } from "lucide-react";

const AppDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader />
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live power, fuel, and community reports across Nigeria.</p>
        </div>

        <Tabs defaultValue="power" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
            <TabsTrigger value="power" className="gap-2"><Zap className="h-4 w-4" /><span className="hidden sm:inline">Power</span></TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2"><Fuel className="h-4 w-4" /><span className="hidden sm:inline">Fuel</span></TabsTrigger>
            <TabsTrigger value="generator" className="gap-2"><Calculator className="h-4 w-4" /><span className="hidden sm:inline">Generator</span></TabsTrigger>
            <TabsTrigger value="feed" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Feed</span></TabsTrigger>
          </TabsList>

          <TabsContent value="power" className="mt-6"><PowerReports /></TabsContent>
          <TabsContent value="fuel" className="mt-6"><FuelReports /></TabsContent>
          <TabsContent value="generator" className="mt-6"><GeneratorCalculator /></TabsContent>
          <TabsContent value="feed" className="mt-6"><CommunityFeed /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AppDashboard;
