import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useSubscriptions } from "@/lib/storage";
import { getCancellationGuide } from "@/data/cancellation-guides";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, ExternalLink, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import confetti from "canvas-confetti";

export default function CancellationFlow() {
  const [, params] = useRoute("/cancel/:id");
  const [, setLocation] = useLocation();
  const { subscriptions, cancelSubscription } = useSubscriptions();
  const [step, setStep] = useState(0);

  const id = params?.id;
  const subscription = subscriptions.find(s => s.id === id);

  if (!subscription) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Subscription not found</h2>
        <Link href="/"><Button className="mt-4">Go Home</Button></Link>
      </div>
    );
  }

  const guide = getCancellationGuide(subscription.provider || subscription.name);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleFinish = () => {
    if (id) {
      cancelSubscription(id);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => setLocation("/"), 2000);
    }
  };

  const filledTemplate = guide.template
    ?.replace("[Your Name]", "Me") // In a real app, user profile
    .replace("[Service Name]", subscription.name)
    .replace("[Date]", format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Link>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Cancel {subscription.name}</h1>
        <p className="text-muted-foreground">Follow these steps to stop the payments.</p>
      </div>

      <Card className="bg-card border-border shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step {step + 1} of {guide.steps.length + (filledTemplate ? 2 : 1)}</span>
            <div className="flex gap-1">
              {Array.from({ length: guide.steps.length + (filledTemplate ? 2 : 1) }).map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
          <CardTitle>
            {step < guide.steps.length 
              ? `Step ${step + 1}` 
              : step === guide.steps.length && filledTemplate 
                ? "Cancellation Letter" 
                : "Confirm Cancellation"}
          </CardTitle>
        </CardHeader>

        <CardContent className="min-h-[200px] flex flex-col justify-center">
          {step < guide.steps.length ? (
            <div className="space-y-6">
              <p className="text-lg leading-relaxed">{guide.steps[step]}</p>
              
              {step === 0 && guide.url && (
                <div className="p-4 bg-accent/20 border border-accent rounded-lg flex items-center gap-4">
                  <ExternalLink className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="font-medium">Direct Link</p>
                    <a href={guide.url} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:text-primary transition-colors">
                      Open {guide.name} Cancellation Page
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : step === guide.steps.length && filledTemplate ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Here is a template you can use if you need to email or mail them.</p>
              <div className="relative p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                {filledTemplate}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => copyToClipboard(filledTemplate)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold">You did it!</h3>
              <p className="text-muted-foreground">
                Once you have confirmed with the provider, mark this subscription as cancelled in SubControl to stop tracking it as an active expense.
              </p>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm flex items-start gap-3 text-left">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>Important: Clicking "Finish" only updates your local tracking. Ensure you have actually completed the cancellation process with {subscription.provider || subscription.name}.</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          
          {step < (guide.steps.length + (filledTemplate ? 1 : 0)) ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
              Mark as Cancelled
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
