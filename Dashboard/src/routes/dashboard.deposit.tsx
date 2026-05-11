import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/deposit")({
  head: () => ({ meta: [{ title: "Recarregar Saldo | Fortune Tiger" }] }),
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
      toast.error("Erro na conexão com o servidor");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-[400px] bg-gradient-to-br from-[#1a1410] to-[#2a1f18] rounded-[40px] p-8 relative border border-yellow-500/30 shadow-[0_30px_100px_rgba(0,0,0,1)] border-t-4 border-t-yellow-500 overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/10 blur-[80px] rounded-full" />
        
        <Link to="/dashboard" className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-black/40 rounded-full text-white/50 hover:text-yellow-500 transition-all z-10">✕</Link>
        
        <div className="text-center mb-8 relative">
            <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">🐯</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 uppercase tracking-tighter">Recarregar</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1 font-bold">
              Saldo: R$ {(user.real_balance + user.bonus_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
        </div>

        {!generated ? (
          <div className="space-y-6 relative">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setAmount(maskCurrency("12000")); generate(promo1); }}
                className="group p-5 rounded-3xl bg-yellow-500/5 border border-yellow-500/20 text-center hover:bg-yellow-500/10 transition-all active:scale-95"
              >
                <div className="bg-yellow-500/20 text-yellow-500 text-[9px] font-black py-1 px-2 rounded-full inline-block mb-2">OFERTA 1</div>
                <p className="text-2xl font-black text-white">R$ {promo1}</p>
                <p className="text-[10px] text-yellow-500 font-bold mt-1">+ R$ {promo1} BÔNUS</p>
              </button>
              
              <button 
                onClick={() => { setAmount(maskCurrency("20000")); generate(promo2); }}
                className="group p-5 rounded-3xl bg-yellow-500/5 border border-yellow-500/20 text-center hover:bg-yellow-500/10 transition-all active:scale-95"
              >
                <div className="bg-yellow-500/20 text-yellow-500 text-[9px] font-black py-1 px-2 rounded-full inline-block mb-2">OFERTA 2</div>
                <p className="text-2xl font-black text-white">R$ {promo2}</p>
                <p className="text-[10px] text-yellow-500 font-bold mt-1">+ R$ {promo2} BÔNUS</p>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-yellow-500/60 font-black ml-1">Valor Personalizado</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={amount} 
                  onChange={e => setAmount(maskCurrency(e.target.value))} 
                  className="w-full text-center text-3xl font-black h-20 bg-black/60 border-2 border-yellow-500/20 rounded-3xl focus:border-yellow-500 transition-all outline-none text-white shadow-inner"
                  placeholder="R$ 0,00"
                />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-full" />
              </div>
            </div>

            <Button 
                onClick={() => generate()} 
                disabled={loading}
                className="w-full h-20 text-xl font-black rounded-3xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_15px_30px_rgba(234,179,8,0.2)] uppercase"
            >
              {loading ? "Processando..." : "Gerar PIX Agora"}
            </Button>
            
            <p className="text-[9px] text-center text-white/30 uppercase tracking-[0.2em] font-bold">Pagamento Instantâneo via SigiloPay</p>
          </div>
        ) : (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
            <div className="inline-block p-4 rounded-[35px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <img src={generated.qr} alt="QR Code PIX" className="w-[200px] h-[200px] rounded-2xl" />
            </div>
            
            <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total a Pagar</p>
                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tighter">
                  {amount}
                </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => { navigator.clipboard.writeText(generated.code); toast.success("Código PIX Copiado!"); }}
                className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-yellow-500 font-black text-lg transition-all active:scale-95"
              >
                COPIAR CÓDIGO PIX
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setGenerated(null)}
                className="w-full text-white/40 hover:text-white uppercase text-xs font-bold tracking-widest"
              >
                Voltar e Alterar Valor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
