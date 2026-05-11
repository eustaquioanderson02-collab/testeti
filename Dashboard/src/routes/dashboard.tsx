import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Embers } from "@/components/Embers";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Tigre da Fortuna" }] }),
  component: Dashboard,
});

const GAME_URL = "http://localhost";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => {
        if (!localStorage.getItem("ft_token")) navigate({ to: "/auth", search: { mode: "login" } });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [user, navigate]);

  const handleLaunchGame = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:3059/api/game/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.url;
      }
    } catch {
      alert("Erro ao iniciar o jogo.");
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gold/60">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <SiteHeader />
      <Embers count={15} />

      <main className="relative pt-24 pb-16 px-4 sm:px-6 mx-auto max-w-6xl">
        <div className="animate-fade-up">
          <p className="text-xs tracking-widest text-gold/60 uppercase">Olá, {user.fullName.split(" ")[0]}</p>
          <h1 className="text-4xl font-display mt-1">Painel da Fortuna</h1>
        </div>

        {/* SALDO */}
        <div className="mt-8 ornate-frame rounded-2xl p-8 sm:p-10 relative overflow-hidden animate-fade-up">
          <div className="absolute inset-0 bg-gradient-fire opacity-30" />
          <div className="relative">
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Saldo Real (Sacável)</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-display text-gradient-gold">R$ {user.real_balance?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold/70">Saldo Bônus (Jogo)</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-display text-foreground/80">R$ {user.bonus_balance?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" onClick={handleLaunchGame}>🎰 Jogar Agora</Button>
              <Link to="/dashboard/deposit"><Button variant="gold" size="lg">+ Depositar PIX</Button></Link>
              <Link to="/dashboard/withdraw"><Button variant="outline" size="lg" className="border-gold/40 text-gold hover:bg-gold/10">Solicitar Saque</Button></Link>
            </div>
          </div>
        </div>

        {/* HISTÓRICO */}
        <div className="mt-8 ornate-frame rounded-2xl p-6 sm:p-8 animate-fade-up">
          <h2 className="text-xl font-display text-gradient-gold mb-4">Histórico de Transações</h2>
          {user.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transação ainda. Faça seu primeiro depósito!</p>
          ) : (
            <ul className="divide-y divide-gold/10">
              {user.transactions.map(tx => (
                <li key={tx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tx.type === "deposit" ? "Depósito PIX" : "Saque PIX"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleString("pt-BR")} {tx.pixKey && `· ${tx.pixKey}`}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.type === "deposit" ? "text-gold" : "text-foreground"}`}>
                      {tx.type === "deposit" ? "+" : "-"}R$ {tx.amount.toFixed(2)}
                    </p>
                    <p className={`text-xs ${tx.status === "completed" ? "text-gold/70" : tx.status === "pending" ? "text-secondary" : "text-destructive"}`}>{tx.status === "completed" ? "Concluído" : tx.status === "pending" ? "Pendente" : "Falhou"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Outlet />
    </div>
  );
}
