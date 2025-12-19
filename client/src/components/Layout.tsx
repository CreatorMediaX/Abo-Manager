import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, Settings, ShieldCheck, Menu, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/add", label: "Add Subscription", icon: Plus },
    // { href: "/settings", label: "Settings", icon: Settings }, // Future
  ];

  const isActive = (path: string) => location === path;

  // Simple Avatar Initials
  const initials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() 
    : "U";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-heading font-bold text-lg tracking-tight">SubControl</span>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card/30 p-6 gap-8 fixed h-full">
        <div className="flex items-center gap-2 px-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="font-heading font-bold text-xl tracking-tight">SubControl</span>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-card/50 border border-border rounded-lg">
           <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
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
        
        <div className="mt-auto space-y-4">
          <div className="bg-gradient-to-br from-primary/20 to-transparent p-4 rounded-xl border border-primary/10">
            <h4 className="font-medium text-sm mb-1">Privacy First</h4>
            <p className="text-xs text-muted-foreground">Your data is stored locally in your browser. No servers.</p>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
