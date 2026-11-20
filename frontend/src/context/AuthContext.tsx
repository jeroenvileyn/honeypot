import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";

export type User = {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  chips: number;
  isAdmin: boolean;
  isEnabled: boolean;
} | null;

type Ctx = {
  user: User;
  loading: boolean;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, setUser, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
