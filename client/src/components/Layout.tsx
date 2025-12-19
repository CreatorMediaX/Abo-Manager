import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, Settings, ShieldCheck, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/add", label: "Add Subscription", icon: Plus },
    // { href: "/settings", label: "Settings", icon: Settings }, // Future
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-heading font-bold text-lg tracking-tight">SubControl</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r border-border">
            <div className="flex flex-col gap-8 mt-8">
              <div className="flex items-center gap-2 px-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span className="font-heading font-bold text-2xl tracking-tight">SubControl</span>
              </div>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card/30 p-6 gap-8 fixed h-full">
        <div className="flex items-center gap-2 px-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="font-heading font-bold text-xl tracking-tight">SubControl</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="mt-auto">
          <div className="bg-gradient-to-br from-primary/20 to-transparent p-4 rounded-xl border border-primary/10">
            <h4 className="font-medium text-sm mb-1">Privacy First</h4>
            <p className="text-xs text-muted-foreground">Your data is stored locally in your browser. No servers.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
