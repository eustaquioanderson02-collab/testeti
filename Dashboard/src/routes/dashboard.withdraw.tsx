import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/withdraw")({
  head: () => ({ meta: [{ title: "Solicitar saque" }] }),
  component: Withdraw,
});

function Withdraw() {
  const { user, withdraw } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [keyType, setKeyType] = useState("CPF");
  const [pixKey, setPixKey] = useState("");

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.active) return toast.error("Cadastro inativo. Complete seus dados.");
    if (!pixKey.trim()) return toast.error("Informe a chave PIX");
    const v = parseFloat(amount);
    const r = withdraw(v, pixKey.trim(), keyType);
    if (!r.ok) return toast.error(r.error);
    toast.success("Saque solicitado");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-up">
      <div className="ornate-frame rounded-2xl p-8 w-full max-w-md relative">
        <Link to="/dashboard" className="absolute top-4 right-4 text-muted-foreground hover:text-gold">✕</Link>
        <h2 className="text-2xl font-display text-gradient-gold mb-1">Solicitar Saque</h2>
        <p className="text-sm text-muted-foreground mb-6">Saldo disponível: <span className="text-gold">R$ {user.balance.toFixed(2)}</span></p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-gold/80">Valor (R$)</Label>
            <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-gold/80">Tipo de chave</Label>
            <Select value={keyType} onValueChange={setKeyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="E-mail">E-mail</SelectItem>
                <SelectItem value="Telefone">Telefone</SelectItem>
                <SelectItem value="Aleatória">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-gold/80">Chave PIX</Label>
            <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Sua chave" required />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full">Solicitar saque</Button>
        </form>
      </div>
    </div>
  );
}
