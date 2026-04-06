import { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, setAuthToken, getAuthToken } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

// Simple in-memory session store — survives React re-renders, lost on page reload
// (cookies and localStorage are blocked in sandboxed iframes)
let _sessionUser: User | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  // Seed from module-level cache so hot-reloads don't log you out
  const [user, setUser] = useState<User | null>(_sessionUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      setAuthToken(data.token);
      _sessionUser = { id: data.id, username: data.username };
      setUser(_sessionUser);
      qc.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", { username, password });
      const data = await res.json();
      setAuthToken(data.token);
      _sessionUser = { id: data.id, username: data.username };
      setUser(_sessionUser);
      qc.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    _sessionUser = null;
    setUser(null);
    qc.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
