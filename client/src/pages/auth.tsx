import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: any) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: err?.message || "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" aria-label="Cognito">
              <circle cx="16" cy="16" r="14" fill="hsl(var(--primary))" opacity="0.12" />
              <circle cx="16" cy="16" r="10" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" />
              <circle cx="16" cy="10" r="2.5" fill="hsl(var(--primary))" />
              <path d="M16 14 L16 22" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 18 L20 18" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight">Cognito</h1>
            <p className="text-sm text-muted-foreground">Your private thinking diary</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-center">
              {mode === "login" ? "Sign in to your diary" : "Create your private diary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  data-testid="input-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !username || !password} data-testid="button-auth-submit">
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid="button-toggle-auth-mode"
              >
                {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Your entries are stored privately on this server.
        </p>
      </div>
    </div>
  );
}
