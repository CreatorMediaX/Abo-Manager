import { PROVIDERS } from "@/data/providers";
import { Subscription } from "@/lib/types";

// Helper to calculate next payment/cancellation dates
export function calculateCancellationDate(startDate: string, noticePeriodDays: number, interval: string): Date {
  // Simplified logic for demo
  // Real world would be complex (monthly vs yearly contracts, exact start date alignment)
  const today = new Date();
  const noticeDate = new Date(today);
  noticeDate.setDate(today.getDate() + noticePeriodDays);
  
  // Find next month/year end that fits
  // This is a placeholder for complex contract logic
  const targetDate = new Date(noticeDate);
  targetDate.setDate(targetDate.getDate() + 1); // Tomorrow at earliest
  
  return targetDate;
}

export function generateCancellationPDF(subscription: Subscription, userName: string, userAddress: string = "") {
  // Lazy load jspdf to avoid bundle bloat if not used
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const provider = subscription.providerId ? PROVIDERS[subscription.providerId] : null;
    const providerName = provider ? provider.name : subscription.name;
    const providerAddress = provider?.postalAddress || "Address Unknown - Check Provider Website";
    
    const today = new Date().toLocaleDateString();

    doc.setFont("helvetica", "normal");
    
    // Sender (User)
    doc.setFontSize(10);
    doc.text(userName, 20, 20);
    if(userAddress) doc.text(userAddress, 20, 25);
    
    // Date
    doc.text(today, 170, 20);
    
    // Recipient (Provider)
    doc.setFontSize(12);
    doc.text(providerName, 20, 50);
    doc.setFontSize(10);
    const addressLines = doc.splitTextToSize(providerAddress, 80);
    doc.text(addressLines, 20, 56);
    
    // Subject
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Cancellation of Subscription / Contract`, 20, 90);
    
    // Body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const bodyText = `Dear Sir or Madam,

I hereby cancel my subscription/contract for ${subscription.name} effective immediately or at the earliest possible date.

Contract / Customer Number: ________________________ (Please fill in if known)

Please confirm receipt of this cancellation and the termination date in writing.
Please also revoke any direct debit authorizations.

Sincerely,

${userName}`;

    doc.text(bodyText, 20, 110);
    
    // Save
    doc.save(`Cancellation_${subscription.name.replace(/\s+/g, '_')}.pdf`);
  });
}

export function generateICSFile(subscriptions: Subscription[]) {
  let icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SubControl//Subscription Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  subscriptions.forEach(sub => {
    if (!sub.active) return;
    
    const now = new Date();
    const nextPayment = new Date(sub.nextPaymentDate);
    // Simple recurrent event generator for next 12 occurrences for demo
    // Real ICS libraries handle RRULE better
    
    // Just add next payment for now
    const startDate = nextPayment.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(nextPayment.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; // 1 hour duration
    
    icsContent += `BEGIN:VEVENT
UID:${sub.id}@subcontrol.app
DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:Payment: ${sub.name} (${sub.price} ${sub.currency})
DESCRIPTION:Subscription payment for ${sub.name}.
STATUS:CONFIRMED
END:VEVENT
`;

    // Cancellation reminder if needed (e.g., 7 days before notice period ends)
    // Simplified logic
  });

  icsContent += "END:VCALENDAR";
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'subscriptions.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
