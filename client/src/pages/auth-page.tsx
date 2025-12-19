import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export default function AuthPage() {
  const { login, register, isLoading } = useAuth();
  
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onLogin = async (data: z.infer<typeof authSchema>) => {
    await login(data.email, data.password);
  };

  const onRegister = async (data: z.infer<typeof authSchema>) => {
    await register(data.email, data.name || "User", data.password);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-primary/20 via-background to-background p-8 flex flex-col justify-center items-center text-center md:text-left md:items-start relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        
        <div className="relative z-10 max-w-lg mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <span className="font-heading font-bold text-3xl tracking-tight">SubControl</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 tracking-tight">
            Take back control of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">subscriptions</span>.
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Stop paying for services you don't use. Track your recurring expenses, get notified before payments, and cancel with ease.
          </p>

          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Bank-grade encryption for your data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <Lock className="h-4 w-4" />
              </div>
              <span>Private by design - stored locally</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-card/30 backdrop-blur-sm">
        <Card className="w-full max-w-md border-border shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Login or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="name@example.com" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Logging in..." : "Login"}
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onRegister)} className="space-y-4">
                     <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="John Doe" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="name@example.com" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="password" placeholder="Create a password" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground bg-muted/30 py-4">
             <p>Note: This is a secure demo mode.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
