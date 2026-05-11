import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import tigerImg from "@/assets/fortune-tiger.png";
import heroBg from "@/assets/hero-bg.jpg";
import { Embers } from "@/components/Embers";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tigre da Fortuna — Entre na lenda" },
      { name: "description", content: "Uma experiência cinematográfica inspirada no tigre da fortuna. Cadastre-se, deposite via PIX e jogue." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const tigerRef = useRef<HTMLImageElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleEnter = async () => {
    if (user) {
      navigate({ to: "/dashboard" });
    } else {
      // Inicia como convidado ou redireciona para o jogo diretamente
      try {
        const res = await fetch("http://localhost:3059/api/game/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "guest_" + Math.random().toString(36).substring(7) }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.url;
        }
      } catch {
        navigate({ to: "/auth", search: { mode: "register" } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroBg})`,
            transform: `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0005})`,
            filter: `blur(${Math.min(scrollY * 0.02, 8)}px) brightness(0.6)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
        <Embers count={40} />

        <div className="relative z-10 mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-8 items-center">
          <div className="animate-fade-up text-center md:text-left">
            <p className="font-display tracking-[0.4em] text-gold/80 text-xs sm:text-sm mb-4">幸运 · FORTUNA AWAITS</p>
            <h1 className="text-5xl sm:text-7xl font-bold leading-[0.95]">
              <span className="block text-gradient-gold">Tigre</span>
              <span className="block text-foreground">da Fortuna</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto md:mx-0">
              Uma jornada cinematográfica entre o ouro, o fogo e a lenda. Desperte o espírito do tigre e entre na experiência.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <Button variant="hero" size="xl" onClick={handleEnter}>
                <span className="relative z-10">Entrar no Jogo</span>
              </Button>
              <Link to="/auth" search={{ mode: "login" }}>
                <Button variant="gold" size="xl">Já tenho conta</Button>
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center" style={{ transform: `translateY(${-scrollY * 0.15}px)` }}>
            <div className="absolute inset-0 bg-gradient-fire blur-3xl animate-pulse-glow" />
            <img
              ref={tigerRef}
              src={tigerImg}
              alt="Tigre da Fortuna estilizado em ouro"
              width={1024}
              height={1024}
              className="relative w-full max-w-md animate-float-slow drop-shadow-[0_0_60px_oklch(0.82_0.17_82/0.6)]"
              style={{ transform: `scale(${1 + scrollY * 0.0008}) rotate(${scrollY * 0.02}deg)` }}
            />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gold/60 text-xs tracking-widest animate-pulse">▼ ROLE PARA DESPERTAR ▼</div>
      </section>

      {/* PILARES */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6">
          {[
            { t: "Depósito Instantâneo", d: "PIX integrado com QR code e código copia-e-cola.", i: "⚡" },
            { t: "Saque Rápido", d: "Solicite saque na sua chave PIX em poucos cliques.", i: "💰" },
            { t: "Experiência Premium", d: "Interface cinematográfica, fluida e responsiva.", i: "🎬" },
          ].map((f, i) => (
            <div key={f.t} className="ornate-frame rounded-xl p-8 text-center hover:scale-[1.02] transition-transform" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="text-4xl mb-4">{f.i}</div>
              <h3 className="text-xl font-display text-gradient-gold mb-2">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-fire opacity-50" />
        <Embers count={20} />
        <div className="relative mx-auto max-w-3xl text-center ornate-frame rounded-2xl p-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gradient-gold mb-4">A lenda começa agora</h2>
          <p className="text-muted-foreground mb-8">Crie sua conta e desperte o tigre. Entretenimento responsável e experiência de alto nível.</p>
          <Button variant="hero" size="xl" onClick={handleEnter}>Despertar o Tigre</Button>
        </div>
      </section>

      <footer className="border-t border-gold/20 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tigre da Fortuna · Jogue com responsabilidade
      </footer>
    </div>
  );
}
