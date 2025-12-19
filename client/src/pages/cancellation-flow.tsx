import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useSubscriptions } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, ExternalLink, AlertTriangle, ArrowLeft, ArrowRight, Download, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import confetti from "canvas-confetti";
import { PROVIDERS } from "@/data/providers";
import { calculateCancellationDate, generateCancellationPDF } from "@/lib/generators";

export default function CancellationFlow() {
  const [, params] = useRoute("/cancel/:id");
  const [, setLocation] = useLocation();
  const { subscriptions, cancelSubscription } = useSubscriptions();
  const { user } = useAuth();
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

  const provider = subscription.providerId ? PROVIDERS[subscription.providerId] : null;

  // Calculate generic steps based on provider data or fallback
  const steps = provider ? [
    `Go to ${provider.name}'s website and log in.`,
    provider.cancelUrl ? `Navigate to the cancellation page.` : "Navigate to account settings -> Subscriptions.",
    "Follow the on-screen instructions to confirm cancellation.",
    provider.noticePeriodInfo ? `Note: ${provider.noticePeriodInfo}` : "Check for any confirmation email."
  ] : [
    "Check the provider's website for a 'Billing' or 'Subscription' section.",
    "Look for 'Cancel Subscription' or 'Downgrade'.",
    "If no online option, you may need to email them.",
  ];

  const calculatedCancelDate = calculateCancellationDate(
    subscription.startDate, 
    subscription.noticePeriodDays, 
    subscription.interval
  );

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

  const emailTemplate = `To whom it may concern,

I would like to cancel my subscription for ${subscription.name} associated with email ${user?.email}.

Please confirm the cancellation and the effective end date.

Thank you,
${user?.name || "Customer"}`;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Link>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Cancel {subscription.name}</h1>
        <p className="text-muted-foreground">Assisted cancellation process</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-4">
             <AlertTriangle className="h-8 w-8 text-orange-500" />
             <div>
               <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Notice Period</p>
               <p className="text-lg font-bold">{subscription.noticePeriodDays} Days</p>
             </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
             <CheckCircle2 className="h-8 w-8 text-blue-500" />
             <div>
               <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Earliest End Date</p>
               <p className="text-lg font-bold">{format(calculatedCancelDate, "MMM d, yyyy")}</p>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step {step + 1} of {steps.length + 2}</span>
            <div className="flex gap-1">
              {Array.from({ length: steps.length + 2 }).map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
          <CardTitle>
            {step < steps.length 
              ? `Step ${step + 1}` 
              : step === steps.length
                ? "Send Official Notice" 
                : "Confirm Cancellation"}
          </CardTitle>
        </CardHeader>

        <CardContent className="min-h-[200px] flex flex-col justify-center">
          {step < steps.length ? (
            <div className="space-y-6">
              <p className="text-lg leading-relaxed">{steps[step]}</p>
              
              {step === 0 && provider?.url && (
                <div className="p-4 bg-accent/20 border border-accent rounded-lg flex items-center gap-4">
                  <ExternalLink className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="font-medium">Direct Link</p>
                    <a href={provider.cancelUrl || provider.url} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:text-primary transition-colors">
                      Open {provider.name} Website
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : step === steps.length ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">If you couldn't cancel online, use these tools to send a formal request.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => copyToClipboard(emailTemplate)}>
                   <Mail className="h-6 w-6" />
                   <span>Copy Email Template</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => generateCancellationPDF(subscription, user?.name || "Customer")}>
                   <Download className="h-6 w-6" />
                   <span>Download PDF Letter</span>
                </Button>
              </div>
              
              {provider?.postalAddress && (
                 <div className="p-3 bg-muted rounded text-sm font-mono mt-4">
                   <p className="font-bold mb-1">Send to:</p>
                   {provider.postalAddress}
                 </div>
              )}
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
                <p>Important: Clicking "Finish" only updates your local tracking. Ensure you have actually completed the cancellation process.</p>
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
          
          {step < (steps.length + 1) ? (
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
