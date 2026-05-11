import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type User = {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  password: string;
  balance: number;
  real_balance: number;
  bonus_balance: number;
  is_first_deposit: number;
  transactions: Transaction[];
};

export type Transaction = {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "completed" | "failed";
  date: string;
  pixKey?: string;
};

type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: Omit<User, "id" | "balance" | "transactions" | "real_balance" | "bonus_balance" | "is_first_deposit">) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  deposit: (amount: number) => Promise<any>;
  withdraw: (amount: number, pixKey: string, keyType: string) => Promise<{ ok: boolean; error?: string }>;
};

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE = "ft_users_v1";
const SESSION = "ft_session_v1";

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; }
}
function saveUsers(u: User[]) { localStorage.setItem(STORAGE, JSON.stringify(u)); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch("/api/user/me", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (data.success) setUser({ ...data.user, id: token }); // Usando token como ID simplificado
      else logout();
    } catch { logout(); }
  };

  useEffect(() => {
    const token = localStorage.getItem("ft_token");
    if (token) fetchUser(token);
  }, []);

  const logout = () => {
    localStorage.removeItem("ft_token");
    setUser(null);
  };

  return (
    <Ctx.Provider value={{
      user,
      login: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (data.success) {
            localStorage.setItem("ft_token", data.token);
            setUser({ ...data.user, id: data.token });
            return { ok: true };
          }
          return { ok: false, error: data.message };
        } catch { return { ok: false, error: "Erro de conexão" }; }
      },
      register: async (data) => {
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const dataRes = await res.json();
          if (dataRes.success) {
            localStorage.setItem("ft_token", dataRes.token);
            setUser({ ...dataRes.user, id: dataRes.token });
            return { ok: true };
          }
          return { ok: false, error: dataRes.message };
        } catch { return { ok: false, error: "Erro de conexão" }; }
      },
      logout,
      deposit: async (amount) => {
        // Implementar via SigiloPay
        const res = await fetch("/api/payment/deposit", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: user?.id || ""
          },
          body: JSON.stringify({ amount }),
        });
        return await res.json();
      },
      withdraw: async (amount, pixKey, keyType) => {
        try {
          const res = await fetch("/api/payment/withdraw", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: user?.id || ""
            },
            body: JSON.stringify({ amount, pixKey, keyType }),
          });
          const data = await res.json();
          if (data.success) {
            fetchUser(user?.id || ""); // Atualiza saldo
            return { ok: true };
          }
          return { ok: false, error: data.message };
        } catch { return { ok: false, error: "Erro de conexão" }; }
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
