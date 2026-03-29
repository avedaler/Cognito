import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

function ThinkLogMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="ThinkLog">
      <path
        d="M12 3C8.13 3 5 6.13 5 10C5 12.76 6.59 15.17 8.9 16.38V19H15.1V16.38C17.41 15.17 19 12.76 19 10C19 6.13 15.87 3 12 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        className="text-primary" fill="none"
      />
      <rect x="9.5" y="19" width="5" height="1.5" rx="0.75" fill="currentColor" className="text-primary" opacity="0.7" />
      <rect x="10.5" y="20.5" width="3" height="1" rx="0.5" fill="currentColor" className="text-primary" opacity="0.4" />
      <circle cx="9.5" cy="10" r="1.25" fill="currentColor" className="text-primary" />
      <circle cx="12" cy="8.5" r="1.25" fill="currentColor" className="text-primary" />
      <circle cx="14.5" cy="10" r="1.25" fill="currentColor" className="text-primary" />
    </svg>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register(data.email, data.password, data.name);
      setLocation("/");
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      if (msg.includes("409") || msg.includes("already")) {
        setError("That email is already registered.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <ThinkLogMark size={40} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">ThinkLog</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Start thinking more clearly</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-5">Create an account</h2>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
              data-testid="error-register"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Your name"
                        autoComplete="name"
                        data-testid="input-name"
                        {...field}
                      />
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
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        data-testid="input-email"
                        {...field}
                      />
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
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-register-submit"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-primary hover:underline cursor-pointer" data-testid="link-login">
                Sign in
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
