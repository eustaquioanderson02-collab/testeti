import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/40 border-b border-gold/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🐯</span>
          <span className="font-display text-lg tracking-widest text-gradient-gold">FORTUNA</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="text-foreground/80 hover:text-gold transition-colors hidden sm:inline">Painel</Link>
              <span className="text-gold font-medium">R$ {user.balance.toFixed(2)}</span>
              <button onClick={logout} className="text-muted-foreground hover:text-gold transition-colors">Sair</button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "login" }} className="text-foreground/80 hover:text-gold transition-colors">Entrar</Link>
              <Link to="/auth" search={{ mode: "register" }} className="px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-medium text-sm hover:scale-105 transition-transform">Cadastrar</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
