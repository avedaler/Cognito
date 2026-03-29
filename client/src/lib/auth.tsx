import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "./queryClient";

interface User {
  id: number;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/api/auth/me")
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { email, password, name });
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <ThinkLogLogo size={32} className="text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

// Inline logo used in loading state
function ThinkLogLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="ThinkLog"
      className={className}
    >
      <path
        d="M12 2C8.5 2 5.5 4.5 5.5 8C5.5 10.5 7 12.5 9 13.5V16H15V13.5C17 12.5 18.5 10.5 18.5 8C18.5 4.5 15.5 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="9" y="16" width="6" height="2" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="10" y="18" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.4" />
      <circle cx="9.5" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="14.5" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
