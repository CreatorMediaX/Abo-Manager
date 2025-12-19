import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  register: (email: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Simulate checking session
    const storedUser = localStorage.getItem("subcontrol_user_session");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    // Mock login - in a real app this would hit the API
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Fake network delay
    
    // For demo purposes, we'll just create a session for this email
    // In a real app, we'd verify password hash
    const mockUser = {
      id: btoa(email), // Simple fake ID
      email,
      name: email.split("@")[0],
    };
    
    setUser(mockUser);
    localStorage.setItem("subcontrol_user_session", JSON.stringify(mockUser));
    setIsLoading(false);
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });
    setLocation("/");
  };

  const register = async (email: string, name: string) => {
    // Mock register
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser = {
      id: btoa(email),
      email,
      name,
    };
    
    setUser(newUser);
    localStorage.setItem("subcontrol_user_session", JSON.stringify(newUser));
    setIsLoading(false);
    toast({
      title: "Account created",
      description: "Welcome to SubControl!",
    });
    setLocation("/");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("subcontrol_user_session");
    toast({
      title: "Logged out",
      description: "See you next time.",
    });
    setLocation("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <Component />;
}
