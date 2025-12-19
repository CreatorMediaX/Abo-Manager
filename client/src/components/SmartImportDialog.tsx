import { useAuth } from "@/lib/auth";
import { useSubscriptions } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import Papa from "papaparse";
import { analyzeImportedTransactions } from "@/lib/importer";
import { toast } from "@/hooks/use-toast";

export function SmartImportDialog() {
  const { addSubscription } = useSubscriptions();
  const [step, setStep] = useState(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Simulate processing delay for "AI" feel
        setTimeout(() => {
          const found = analyzeImportedTransactions(results.data);
          setCandidates(found);
          setSelectedIndices(found.map((_, i) => i)); // Select all by default
          setStep(1);
          setIsAnalyzing(false);
          
          if (found.length === 0) {
             toast({ title: "No subscriptions found", description: "We couldn't detect any recurring patterns in this file." });
             setStep(0);
          }
        }, 1500);
      },
      error: () => {
        setIsAnalyzing(false);
        toast({ title: "Error parsing file", variant: "destructive" });
      }
    });
  };

  const handleImport = () => {
    let count = 0;
    selectedIndices.forEach(index => {
      addSubscription(candidates[index]);
      count++;
    });
    toast({ title: `Imported ${count} subscriptions`, description: "They have been added to your dashboard." });
    setStep(0);
    setCandidates([]);
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <Dialog open={step > 0} onOpenChange={(open) => !open && setStep(0)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Smart Import
        </Button>
      </DialogTrigger>
      
      {/* Hidden file input trick triggered by parent if needed, but here we use the dialog content */}
      <DialogContent className="sm:max-w-md">
        {step === 0 && (
          // This state is actually unreachable via trigger as currently implemented (trigger opens dialog), 
          // but good for structure if we move trigger logic.
          // For now, let's just show the upload UI when dialog opens via trigger if we modify the trigger logic
          // But standard DialogTrigger just opens content. So we put Step 0 content here.
           <>
            <DialogHeader>
              <DialogTitle>Smart Import from Bank/PayPal</DialogTitle>
              <DialogDescription>
                Upload a CSV export from your bank, PayPal, or Klarna. We'll detect your subscriptions automatically.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center animate-pulse">
                        <Sparkles className="h-8 w-8 mb-2 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Analyzing transactions...</p>
                      </div>
                    ) : (
                      <>
                        <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload CSV</p>
                        <p className="text-xs text-muted-foreground">.csv files supported</p>
                      </>
                    )}
                  </div>
                  <Input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isAnalyzing} />
                </label>
              </div>
            </div>
           </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Found {candidates.length} Subscriptions</DialogTitle>
              <DialogDescription>
                Review and select the subscriptions you want to import.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {candidates.map((sub, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50">
                    <Checkbox 
                      id={`sub-${index}`} 
                      checked={selectedIndices.includes(index)}
                      onCheckedChange={() => toggleSelection(index)}
                    />
                    <div className="grid gap-1.5 leading-none w-full">
                      <label
                        htmlFor={`sub-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{sub.name}</span>
                          <span className="font-bold">{sub.price.toFixed(2)} {sub.currency}</span>
                        </div>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {sub.interval} • via {sub.paymentMethod}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={handleImport}>Import Selected</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
