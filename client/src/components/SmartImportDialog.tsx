import { useAuth } from "@/lib/auth";
import { useSubscriptions } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileUp, Sparkles, CheckCircle2, AlertCircle, X, FileText, FileSpreadsheet } from "lucide-react";
import { useState, useCallback } from "react";
import Papa from "papaparse";
import { 
  analyzeImportedTransactions, 
  parseCSVRow, 
  detectColumns,
  type ParsedTransaction,
  type SubscriptionCandidate
} from "@/lib/importer";
import { parsePDFFile } from "@/lib/pdf-extractor";
import { toast } from "@/hooks/use-toast";

export function SmartImportDialog() {
  const { user } = useAuth();
  const { addSubscription, updateSubscription, subscriptions } = useSubscriptions();
  
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'results'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'pdf'>('csv');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    date?: string;
    description?: string;
    amount?: string;
    currency?: string;
  }>({});
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [ignoredCandidates, setIgnoredCandidates] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPDFScanned, setIsPDFScanned] = useState(false);
  const [pdfRawText, setPdfRawText] = useState('');

  const reset = () => {
    setStep('upload');
    setFileName('');
    setFileType('csv');
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({});
    setTransactions([]);
    setCandidates([]);
    setSelectedCandidates([]);
    setIgnoredCandidates([]);
    setIsPDFScanned(false);
    setPdfRawText('');
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsAnalyzing(true);
    
    // Determine file type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setFileType(isPDF ? 'pdf' : 'csv');
    
    if (isPDF) {
      // Handle PDF upload
      try {
        const result = await parsePDFFile(file);
        
        if (result.isScanned) {
          setIsPDFScanned(true);
          setPdfRawText(result.rawText);
          toast({ 
            title: "Scanned PDF detected", 
            description: "This appears to be a scanned document. Text extraction may be limited. Try using a digital bank statement export.",
            variant: "destructive" 
          });
          setIsAnalyzing(false);
          return;
        }
        
        if (result.transactions.length === 0) {
          toast({ 
            title: "No transactions found", 
            description: "Could not detect any transactions in this PDF. Please ensure it's a bank statement or transaction export.",
            variant: "destructive" 
          });
          setIsAnalyzing(false);
          return;
        }
        
        // Convert PDF transactions to ParsedTransaction format
        const parsed: ParsedTransaction[] = result.transactions.map(tx => ({
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          raw: tx.raw,
        }));
        
        setTransactions(parsed);
        
        // Automatically analyze PDF transactions
        setTimeout(() => {
          const found = analyzeImportedTransactions(parsed, subscriptions);
          setCandidates(found);
          setSelectedCandidates(found.map((_, i) => i));
          setIgnoredCandidates([]);
          setStep('results');
          setIsAnalyzing(false);
          
          if (found.length === 0) {
            toast({ 
              title: "No subscriptions detected", 
              description: `Analyzed ${parsed.length} transactions but couldn't find recurring patterns.`,
            });
          } else {
            toast({
              title: `Found ${found.length} potential subscriptions`,
              description: `From ${parsed.length} transactions. Review and import.`,
            });
          }
        }, 1000);
        
      } catch (error: any) {
        setIsAnalyzing(false);
        toast({ 
          title: "PDF parsing failed", 
          description: error.message || "Could not parse PDF file. Ensure it's a valid bank statement.",
          variant: "destructive" 
        });
      }
    } else {
      // Handle CSV upload
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            toast({ title: "Empty file", description: "The CSV file contains no data.", variant: "destructive" });
            setIsAnalyzing(false);
            return;
          }
          
          const headers = results.meta.fields || [];
          setHeaders(headers);
          setCsvData(results.data);
          
          // Auto-detect columns
          const detected = detectColumns(headers);
          setColumnMapping(detected);
          
          // If all required columns detected, proceed to preview
          if (detected.date && detected.description && detected.amount) {
            setStep('preview');
          } else {
            setStep('mapping');
          }
          
          setIsAnalyzing(false);
        },
        error: (error) => {
          setIsAnalyzing(false);
          toast({ 
            title: "Error parsing file", 
            description: error.message || "Could not parse CSV file",
            variant: "destructive" 
          });
        }
      });
    }
  }, [subscriptions]);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    
    // Parse transactions
    const parsed: ParsedTransaction[] = [];
    csvData.forEach(row => {
      const tx = parseCSVRow(row, columnMapping);
      if (tx) parsed.push(tx);
    });
    
    if (parsed.length === 0) {
      toast({ 
        title: "No valid transactions", 
        description: "Could not parse any transactions from the file. Please check column mappings.",
        variant: "destructive"
      });
      setIsAnalyzing(false);
      return;
    }
    
    setTransactions(parsed);
    
    // Analyze for subscriptions
    setTimeout(() => {
      const found = analyzeImportedTransactions(parsed, subscriptions);
      setCandidates(found);
      setSelectedCandidates(found.map((_, i) => i));
      setIgnoredCandidates([]);
      setStep('results');
      setIsAnalyzing(false);
      
      if (found.length === 0) {
        toast({ 
          title: "No subscriptions detected", 
          description: `Analyzed ${parsed.length} transactions but couldn't find recurring patterns.`,
        });
      } else {
        toast({
          title: `Found ${found.length} potential subscriptions`,
          description: `From ${parsed.length} transactions. Review and import.`,
        });
      }
    }, 1000);
  }, [csvData, columnMapping, subscriptions]);

  const handleImport = async () => {
    let imported = 0;
    let updated = 0;
    
    for (const index of selectedCandidates) {
      if (ignoredCandidates.includes(index)) continue;
      
      const candidate = candidates[index];
      
      // Check if subscription already exists
      const existing = subscriptions.find(sub => 
        sub.name.toLowerCase() === candidate.subscription.name?.toLowerCase() ||
        (sub.providerId && sub.providerId === candidate.subscription.providerId)
      );
      
      if (existing) {
        // Update existing subscription (price change, next payment)
        await updateSubscription(existing.id, {
          price: candidate.subscription.price,
          nextPaymentDate: candidate.subscription.nextPaymentDate,
        });
        updated++;
      } else {
        // Create new subscription
        await addSubscription({
          ...candidate.subscription,
          id: crypto.randomUUID(),
        } as any);
        imported++;
      }
    }
    
    toast({ 
      title: "Import complete", 
      description: `Imported ${imported} new subscriptions, updated ${updated} existing.`
    });
    
    setOpen(false);
    reset();
  };

  const toggleCandidate = (index: number) => {
    setSelectedCandidates(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const ignoreCandidate = (index: number) => {
    setIgnoredCandidates(prev => [...prev, index]);
    setSelectedCandidates(prev => prev.filter(i => i !== index));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-blue-500';
    if (confidence >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-smart-import">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Smart Import
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>Smart Import</DialogTitle>
              <DialogDescription>
                Upload a CSV or PDF export from your bank, PayPal, or financial app. We'll detect recurring subscriptions automatically.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" data-testid="dropzone-upload">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center animate-pulse">
                        <Sparkles className="h-10 w-10 mb-3 text-primary animate-spin" />
                        <p className="text-sm font-medium">Analyzing file...</p>
                        <p className="text-xs text-muted-foreground">This may take a moment</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-4 mb-3">
                          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">CSV or PDF bank statements</p>
                      </>
                    )}
                  </div>
                  <Input 
                    type="file" 
                    className="hidden" 
                    accept=".csv,.pdf,application/pdf" 
                    onChange={handleFileUpload} 
                    disabled={isAnalyzing}
                    data-testid="input-file-upload"
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: COLUMN MAPPING */}
        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle>Map CSV Columns</DialogTitle>
              <DialogDescription>
                Tell us which columns contain the transaction data. We've pre-selected likely matches.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="text-sm text-muted-foreground">
                File: <span className="font-medium">{fileName}</span> ({csvData.length} rows)
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Date Column *</Label>
                  <Select value={columnMapping.date || ''} onValueChange={(v) => setColumnMapping(prev => ({...prev, date: v}))}>
                    <SelectTrigger data-testid="select-date-column">
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Description/Merchant Column *</Label>
                  <Select value={columnMapping.description || ''} onValueChange={(v) => setColumnMapping(prev => ({...prev, description: v}))}>
                    <SelectTrigger data-testid="select-description-column">
                      <SelectValue placeholder="Select description column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Amount Column *</Label>
                  <Select value={columnMapping.amount || ''} onValueChange={(v) => setColumnMapping(prev => ({...prev, amount: v}))}>
                    <SelectTrigger data-testid="select-amount-column">
                      <SelectValue placeholder="Select amount column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Currency Column (optional)</Label>
                  <Select value={columnMapping.currency || 'none'} onValueChange={(v) => setColumnMapping(prev => ({...prev, currency: v === 'none' ? undefined : v}))}>
                    <SelectTrigger data-testid="select-currency-column">
                      <SelectValue placeholder="Select currency column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button 
                onClick={() => setStep('preview')}
                disabled={!columnMapping.date || !columnMapping.description || !columnMapping.amount}
                data-testid="button-continue-preview"
              >
                Continue to Preview
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>Preview & Analyze</DialogTitle>
              <DialogDescription>
                Review the first few transactions to ensure correct mapping.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {csvData.slice(0, 5).map((row, i) => {
                  const tx = parseCSVRow(row, columnMapping);
                  return (
                    <Card key={i} className="p-3">
                      {tx ? (
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <div className="font-medium">{tx.description}</div>
                            <div className="text-muted-foreground text-xs">{tx.date}</div>
                          </div>
                          <div className="font-bold">{tx.amount.toFixed(2)} {tx.currency}</div>
                        </div>
                      ) : (
                        <div className="text-destructive text-sm">Invalid row data</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>Back to Mapping</Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing} data-testid="button-analyze">
                {isAnalyzing ? 'Analyzing...' : `Analyze ${csvData.length} Transactions`}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP 4: RESULTS */}
        {step === 'results' && (
          <>
            <DialogHeader>
              <DialogTitle>Found {candidates.length} Subscriptions</DialogTitle>
              <DialogDescription>
                Review detected subscriptions and choose which to import.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {candidates.map((candidate, index) => {
                  const isIgnored = ignoredCandidates.includes(index);
                  const existing = subscriptions.find(sub => 
                    sub.name.toLowerCase() === candidate.subscription.name?.toLowerCase()
                  );
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-start space-x-3 p-4 rounded-lg border ${isIgnored ? 'opacity-50 bg-muted/30' : 'bg-card'}`}
                      data-testid={`candidate-${index}`}
                    >
                      <Checkbox 
                        id={`sub-${index}`} 
                        checked={selectedCandidates.includes(index) && !isIgnored}
                        onCheckedChange={() => toggleCandidate(index)}
                        disabled={isIgnored}
                      />
                      <div className="grid gap-2 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <label
                              htmlFor={`sub-${index}`}
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              {candidate.subscription.name}
                              <Badge variant="outline" className={`${getConfidenceColor(candidate.confidence)} text-white text-xs`}>
                                {getConfidenceLabel(candidate.confidence)} {candidate.confidence}%
                              </Badge>
                              {existing && (
                                <Badge variant="secondary" className="text-xs">
                                  Update
                                </Badge>
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {candidate.reason} • {candidate.interval}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {candidate.subscription.price?.toFixed(2)} {candidate.subscription.currency}
                            </div>
                            <p className="text-xs text-muted-foreground">per {candidate.interval}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {!isIgnored && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => ignoreCandidate(index)}
                              className="text-xs h-7"
                            >
                              <X className="h-3 w-3 mr-1" /> Ignore
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <div className="flex justify-between w-full items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedCandidates.length} selected, {ignoredCandidates.length} ignored
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('preview')}>Back</Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={selectedCandidates.length === 0}
                    data-testid="button-import-selected"
                  >
                    Import {selectedCandidates.length} Subscriptions
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
