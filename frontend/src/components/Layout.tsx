import { Link, NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-gold/20 bg-feltdark/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl text-gold tracking-wide">
            Maison <span className="text-ivory">Blackjack</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {user ? (
              <>
                <NavLink to="/play" className={({ isActive }) => isActive ? "text-gold" : "hover:text-gold"}>Play</NavLink>
                <NavLink to="/profile" className={({ isActive }) => isActive ? "text-gold" : "hover:text-gold"}>Profile</NavLink>
		<NavLink to="/leaderboard" className={({isActive}) => isActive ? "text-gold" : "hover:text-gold"}>Leaderboard</NavLink>
		<NavLink to="/how-to-play" className="hover:text-yellow-400">How to play</NavLink>

                {user.isAdmin && (
                  <NavLink to="/admin" className={({ isActive }) => isActive ? "text-gold" : "hover:text-gold"}>Admin</NavLink>
                )}
                <span className="text-gold font-medium">🪙 {user.chips}</span>
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover gold-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-feltdark gold-border grid place-items-center text-xs">
                      {user.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block">{user.displayName}</span>
                </div>
                <button className="btn-ghost" onClick={async () => { await logout(); nav("/"); }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hover:text-gold">Login</NavLink>
                <NavLink to="/register" className="btn-gold">Sign up</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gold/10 py-6 text-center text-xs text-ivory/40">
        Maison Blackjack · Honeypot project · Educational use only
      </footer>
    </div>
  );
}
