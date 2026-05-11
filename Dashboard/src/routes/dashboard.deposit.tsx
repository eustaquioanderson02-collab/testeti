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
  const [amount, setAmount] = useState("120");
  const [generated, setGenerated] = useState<{ code: string; qr: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const generate = async (val?: number) => {
    const v = val || parseFloat(amount.replace("R$ ", "").replace(".", "").replace(",", "."));
    if (!v || v < 2) return toast.error("Valor mínimo R$ 2,00");
    
    setLoading(true);
    try {
      const res = await deposit(v);
      if (res.success) {
        setGenerated({ code: res.copy_paste, qr: res.qr_code });
        toast.success("PIX Gerado com Sucesso!");
      } else {
        toast.error(res.message || "Erro ao gerar PIX");
      }
    } catch (e) {
      toast.error("Erro na conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const isFirst = user.is_first_deposit === 1;
  const promo1 = isFirst ? 120 : 170;
  const promo2 = isFirst ? 200 : 250;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl p-4 animate-fade-up">
      <div className="ornate-frame bg-[#1a1410] rounded-3xl p-8 w-full max-w-md relative border border-gold/20 shadow-2xl">
        <Link to="/dashboard" className="absolute top-6 right-6 text-muted-foreground hover:text-gold transition-colors">✕</Link>
        <div className="text-center mb-8">
            <div className="text-4xl mb-2">🐯</div>
            <h2 className="text-3xl font-display text-gradient-gold">Recarregar Saldo</h2>
            <p className="text-sm text-muted-foreground">Escolha uma oferta ou digite um valor</p>
        </div>

        {!generated ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => generate(promo1)}
                className="p-4 rounded-2xl bg-gold/5 border border-gold/20 text-left hover:bg-gold/10 transition group"
              >
                <p className="text-xs text-gold/60 uppercase font-bold">Promoção 1</p>
                <p className="text-xl font-display text-white">R$ {promo1}</p>
                <p className="text-[10px] text-gold font-bold">+ R$ {promo1} BÔNUS</p>
              </button>
              <button 
                onClick={() => generate(promo2)}
                className="p-4 rounded-2xl bg-gold/5 border border-gold/20 text-left hover:bg-gold/10 transition group"
              >
                <p className="text-xs text-gold/60 uppercase font-bold">Promoção 2</p>
                <p className="text-xl font-display text-white">R$ {promo2}</p>
                <p className="text-[10px] text-gold font-bold">+ R$ {promo2} BÔNUS</p>
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-gold/60 ml-1">Valor Personalizado</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="text-center text-2xl h-16 bg-black/40 border-gold/20 rounded-2xl focus:ring-gold"
                placeholder="R$ 0,00"
              />
            </div>

            <Button 
                variant="hero" 
                size="lg" 
                onClick={() => generate()} 
                disabled={loading}
                className="w-full h-16 text-lg rounded-2xl shadow-lg shadow-gold/10"
            >
              {loading ? "Gerando..." : "GERAR PIX AGORA"}
            </Button>
            
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">Pagamento Instantâneo via SigiloPay</p>
          </div>
        ) : (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="inline-block p-4 rounded-3xl bg-white border-4 border-gold shadow-xl">
              <img src={generated.qr} alt="QR Code PIX" width={220} height={220} className="rounded-xl" />
            </div>
            
            <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Valor Gerado</p>
                <p className="text-4xl font-display text-gradient-gold">R$ {parseFloat(amount).toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <Button 
                variant="gold" 
                onClick={() => { navigator.clipboard.writeText(generated.code); toast.success("Código PIX Copiado!"); }}
                className="w-full h-14 rounded-xl text-md"
              >
                COPIAR CÓDIGO PIX
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setGenerated(null)}
                className="w-full border-gold/20 text-gold/60 hover:text-gold"
              >
                Alterar Valor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
