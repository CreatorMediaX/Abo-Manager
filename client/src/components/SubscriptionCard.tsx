import { Subscription } from "@/lib/types";
import { format, differenceInDays, parseISO } from "date-fns";
import { Calendar, CreditCard, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { PROVIDERS } from "@/data/providers";

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel: (id: string) => void;
}

export function SubscriptionCard({ subscription, onCancel }: SubscriptionCardProps) {
  const nextPayment = parseISO(subscription.nextPaymentDate);
  const daysUntilPayment = differenceInDays(nextPayment, new Date());
  
  const isUrgent = daysUntilPayment <= 7 && daysUntilPayment >= 0;
  const isOverdue = daysUntilPayment < 0;
  
  const provider = subscription.providerId ? PROVIDERS[subscription.providerId] : null;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md border-border/50 bg-card/40 backdrop-blur-sm ${!subscription.active ? 'opacity-60 grayscale' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <CardTitle className="font-heading text-xl">{subscription.name}</CardTitle>
             {provider && (
               <ShieldCheck className="h-4 w-4 text-blue-400" aria-label="Verified Provider" />
             )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal uppercase tracking-wider">{subscription.category}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight">
            {subscription.price.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{subscription.currency}</span>
          </div>
          <div className="text-xs text-muted-foreground capitalize">{subscription.interval}</div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-3">
        {subscription.active ? (
          <div className="space-y-2 text-sm">
            <div className={`flex items-center gap-2 ${isUrgent ? 'text-orange-500 font-medium' : isOverdue ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
              <Calendar className="h-4 w-4" />
              <span>
                {isOverdue 
                  ? `Overdue by ${Math.abs(daysUntilPayment)} days` 
                  : isUrgent 
                    ? `Due in ${daysUntilPayment} days` 
                    : `Next: ${format(nextPayment, "MMM d, yyyy")}`}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>{subscription.paymentMethod}</span>
            </div>
            
            {subscription.noticePeriodDays > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs mt-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{subscription.noticePeriodDays} days notice required</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 bg-muted/50 rounded text-center text-muted-foreground text-sm">
            Cancelled on {subscription.cancellationDate ? format(parseISO(subscription.cancellationDate), "MMM d, yyyy") : "Unknown date"}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        {subscription.active && (
          <Link href={`/cancel/${subscription.id}`} className="w-full">
            <Button variant="outline" className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
              Cancel Subscription
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
