import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useSubscriptions } from "@/lib/storage";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AddSubscription() {
  const { addSubscription } = useSubscriptions();
  const [, setLocation] = useLocation();

  const handleSubmit = (data: any) => {
    addSubscription(data);
    setLocation("/");
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
           <h1 className="text-3xl font-heading font-bold">Add Subscription</h1>
           <p className="text-muted-foreground">Track a new recurring expense.</p>
        </div>
      </div>
      
      <SubscriptionForm 
        onSubmit={handleSubmit} 
        onCancel={() => setLocation("/")} 
      />
    </div>
  );
}
