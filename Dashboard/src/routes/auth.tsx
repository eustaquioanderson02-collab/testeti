import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Embers } from "@/components/Embers";
import { toast } from "sonner";
import { z } from "zod";

type Search = { mode?: "login" | "register" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "login" ? "login" : "register",
  }),
  head: () => ({ meta: [{ title: "Acessar — Tigre da Fortuna" }] }),
  component: Auth,
});

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Nome muito curto").max(100),
  cpf: z.string().trim().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().regex(/^\d{10,11}$/, "Telefone inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

function Auth() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isLogin = mode === "login";

  const [form, setForm] = useState({ fullName: "", cpf: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const r = await login(form.email, form.password);
      setLoading(false);
      if (!r.ok) return toast.error(r.error);
      toast.success("Bem-vindo de volta");
      navigate({ to: "/dashboard" });
    } else {
      const parsed = registerSchema.safeParse(form);
      if (!parsed.success) {
        setLoading(false);
        return toast.error(parsed.error.issues[0].message);
      }
      const r = await register(parsed.data);
      setLoading(false);
      if (!r.ok) return toast.error(r.error);
      toast.success("Cadastro completo");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16 bg-gradient-hero">
      <Embers count={25} />
      <Link to="/" className="absolute top-6 left-6 text-gold/70 hover:text-gold text-sm">← Voltar</Link>

      <div className="relative w-full max-w-md ornate-frame rounded-2xl p-8 animate-fade-up">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐯</div>
          <h1 className="text-3xl font-display text-gradient-gold">{isLogin ? "Entrar" : "Despertar o Tigre"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isLogin ? "Acesse sua conta" : "Crie sua conta para começar"}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <>
              <Field label="Nome completo"><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Seu nome" /></Field>
              <Field label="CPF"><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "") })} placeholder="Apenas números" maxLength={11} /></Field>
              <Field label="Telefone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} placeholder="DDD + número" maxLength={11} /></Field>
            </>
          )}
          <Field label="E-mail"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@email.com" /></Field>
          <Field label="Senha"><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••" /></Field>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>Novo por aqui? <Link to="/auth" search={{ mode: "register" }} className="text-gold hover:underline">Cadastre-se</Link></>
          ) : (
            <>Já tem conta? <Link to="/auth" search={{ mode: "login" }} className="text-gold hover:underline">Entrar</Link></>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-gold/80">{label}</Label>
      {children}
    </div>
  );
}
