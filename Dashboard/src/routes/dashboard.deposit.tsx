import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/deposit")({
  head: () => ({ meta: [{ title: "Depósito Premium | Fortune Tiger" }] }),
  component: Deposit,
});

function Deposit() {
  const { user, deposit } = useAuth();
  const [amount, setAmount] = useState("R$ 120,00");
  const [generated, setGenerated] = useState<{ code: string; qr: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const generate = async (val?: number) => {
    let numericValue = val;
    if (!numericValue) {
      numericValue = parseFloat(amount.replace("R$ ", "").replace(/\./g, "").replace(",", "."));
    }
    
    if (!numericValue || numericValue < 1) return toast.error("Valor mínimo R$ 1,00");
    
    setLoading(true);
    try {
      const res = await deposit(numericValue);
      if (res.success) {
        setGenerated({ code: res.copy_paste, qr: res.qr_code });
        toast.success("PIX Gerado com Sucesso!");
      } else {
        toast.error(res.message || "Erro ao gerar PIX");
      }
    } catch (e) {
      toast.error("Erro na conexão");
    } finally {
      setLoading(false);
    }
  };

  const maskCurrency = (val: string) => {
    let value = val.replace(/\D/g, "");
    if(value === "") return "";
    let n = (parseInt(value) / 100).toFixed(2);
    let s = n.replace(".", ",");
    return "R$ " + s.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  };

  const promo1 = 120;
  const promo2 = 200;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-gradient-to-br from-[#1a1410] to-[#2a1f18] rounded-[35px] p-8 relative border border-yellow-500/30 shadow-[0_30px_100px_rgba(0,0,0,1)] border-t-4 border-t-yellow-500">
        
        <Link to="/dashboard" className="absolute top-6 right-6 text-white/30 hover:text-white transition-all">✕ Fechar</Link>
        
        <div className="text-center mb-6">
            <div className="text-6xl mb-2 drop-shadow-lg">🐯</div>
            <h2 className="text-2xl font-black text-yellow-500 uppercase">Recarregar Saldo</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">
              Saldo Atual: R$ {(user.real_balance + user.bonus_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
        </div>

        {!generated ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setAmount(maskCurrency("12000")); generate(promo1); }}
                className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-center hover:bg-yellow-500/10 transition-all active:scale-95"
              >
                <div className="text-xl font-black text-white">R$ {promo1}</div>
                <div className="text-[9px] text-yellow-500 font-bold mt-1">+ R$ {promo1} BÔNUS</div>
              </button>
              
              <button 
                onClick={() => { setAmount(maskCurrency("20000")); generate(promo2); }}
                className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-center hover:bg-yellow-500/10 transition-all active:scale-95"
              >
                <div className="text-xl font-black text-white">R$ {promo2}</div>
                <div className="text-[9px] text-yellow-500 font-bold mt-1">+ R$ {promo2} BÔNUS</div>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-yellow-500/60 font-black ml-1">Valor Personalizado</label>
              <input 
                type="text" 
                value={amount} 
                onChange={e => setAmount(maskCurrency(e.target.value))} 
                className="w-full text-center text-3xl font-black h-16 bg-black/60 border-2 border-yellow-500/20 rounded-2xl focus:border-yellow-500 transition-all outline-none text-white shadow-inner"
              />
            </div>

            <Button 
                onClick={() => generate()} 
                disabled={loading}
                className="w-full h-16 text-lg font-black rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 text-black hover:brightness-110 active:scale-95 transition-all shadow-lg uppercase"
            >
              {loading ? "Processando..." : "Gerar PIX Agora"}
            </Button>
            
            <p className="text-[9px] text-center text-white/30 uppercase tracking-widest font-bold">Seguro via SigiloPay</p>
          </div>
        ) : (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
            <div className="inline-block p-4 rounded-[30px] bg-white shadow-xl">
              <img src={generated.qr} alt="QR Code PIX" className="w-[180px] h-[180px] rounded-xl" />
            </div>
            
            <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase font-bold">Valor Total</p>
                <p className="text-4xl font-black text-white">{amount}</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => { navigator.clipboard.writeText(generated.code); toast.success("Código PIX Copiado!"); }}
                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-yellow-500 font-black text-md transition-all"
              >
                COPIAR CÓDIGO PIX
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setGenerated(null)}
                className="w-full text-white/40 hover:text-white uppercase text-[10px] font-bold tracking-widest"
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
