import { useSubscriptions } from "@/lib/storage";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Upload, Filter, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORIES } from "@/lib/types";
import { Link } from "wouter";

export default function Dashboard() {
  const { subscriptions, loading, cancelSubscription, exportData, importData } = useSubscriptions();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (sub.provider && sub.provider.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || sub.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [subscriptions, searchTerm, categoryFilter]);

  const activeSubs = filteredSubs.filter(s => s.active);
  const totalMonthlyCost = activeSubs.reduce((acc, sub) => {
    // Simple normalization for demo purposes (assuming EUR base or ignored currency diffs)
    let monthlyPrice = sub.price;
    if (sub.interval === "yearly") monthlyPrice = sub.price / 12;
    if (sub.interval === "weekly") monthlyPrice = sub.price * 4;
    if (sub.interval === "quarterly") monthlyPrice = sub.price / 3;
    return acc + monthlyPrice;
  }, 0);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    activeSubs.forEach(sub => {
      if (!data[sub.category]) data[sub.category] = 0;
      data[sub.category] += 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [activeSubs]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importData(e.target.files[0]);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading your financial freedom...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back. You are tracking {subscriptions.length} subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
           <label className="cursor-pointer">
              <Input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
           </label>
           <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" /> Export
           </Button>
           <Link href="/add">
             <Button size="sm">
               <Plus className="mr-2 h-4 w-4" /> Add New
             </Button>
           </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-sm font-medium text-muted-foreground">Monthly Spend</h3>
          <div className="text-4xl font-bold mt-2 tracking-tight">€{totalMonthlyCost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Estimated recurring costs</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
           <h3 className="text-sm font-medium text-muted-foreground">Active Subscriptions</h3>
           <div className="text-4xl font-bold mt-2 tracking-tight">{activeSubs.length}</div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
           <div className="h-24 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={categoryData}
                   cx="50%"
                   cy="50%"
                   innerRadius={25}
                   outerRadius={40}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {categoryData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="text-right">
             <div className="text-sm font-medium">Top Category</div>
             <div className="text-lg font-bold text-primary">
               {categoryData.sort((a,b) => b.value - a.value)[0]?.name || "None"}
             </div>
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card/30 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search subscriptions..." 
            className="pl-9 bg-background/50" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px] bg-background/50">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubs.length > 0 ? (
          filteredSubs.map((sub) => (
            <SubscriptionCard 
              key={sub.id} 
              subscription={sub} 
              onCancel={cancelSubscription} 
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-8 w-8 opacity-20" />
              <p>No subscriptions found matching your filters.</p>
              <Button variant="link" onClick={() => {setSearchTerm(""); setCategoryFilter("all")}}>Clear Filters</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
