import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/deposit")({
  head: () => ({ meta: [{ title: "Depositar via PIX" }] }),
  component: Deposit,
});

function Deposit() {
  const { user, deposit } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("50");
  const [generated, setGenerated] = useState<{ code: string; qr: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!user) return null;

  const generate = () => {
    const v = parseFloat(amount);
    if (!v || v < 1) return toast.error("Valor mínimo R$ 1,00");
    const code = `00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540${v.toFixed(2).length}${v.toFixed(2)}5802BR5913TIGRE FORTUNA6009SAO PAULO62070503***6304${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=18-10-10&color=E8C870&data=${encodeURIComponent(code)}`;
    setGenerated({ code, qr });
  };

  const confirm = () => {
    setConfirming(true);
    setTimeout(() => {
      deposit(parseFloat(amount));
      toast.success(`R$ ${parseFloat(amount).toFixed(2)} creditado!`);
      navigate({ to: "/dashboard" });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-up">
      <div className="ornate-frame rounded-2xl p-8 w-full max-w-md relative">
        <Link to="/dashboard" className="absolute top-4 right-4 text-muted-foreground hover:text-gold">✕</Link>
        <h2 className="text-2xl font-display text-gradient-gold mb-1">Depósito via PIX</h2>
        <p className="text-sm text-muted-foreground mb-6">Gere o pagamento e copie o código.</p>

        {!generated ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gold/80">Valor (R$)</Label>
              <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="text-lg" />
            </div>
            <div className="flex gap-2">
              {[20, 50, 100, 200].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 py-2 rounded-md border border-gold/30 text-gold hover:bg-gold/10 text-sm transition">R$ {v}</button>
              ))}
            </div>
            <Button variant="hero" size="lg" onClick={generate} className="w-full">Gerar pagamento</Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="inline-block p-3 rounded-lg bg-gold/5 border border-gold/30">
              <img src={generated.qr} alt="QR Code PIX" width={240} height={240} className="rounded" />
            </div>
            <p className="text-2xl font-display text-gradient-gold">R$ {parseFloat(amount).toFixed(2)}</p>
            <div className="text-left">
              <Label className="text-xs uppercase tracking-wider text-gold/80">Copia e cola</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={generated.code} className="font-mono text-xs" />
                <Button variant="gold" onClick={() => { navigator.clipboard.writeText(generated.code); toast.success("Copiado!"); }}>Copiar</Button>
              </div>
            </div>
            <Button variant="hero" size="lg" onClick={confirm} disabled={confirming} className="w-full">
              {confirming ? "Confirmando..." : "Já paguei (simular confirmação)"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
