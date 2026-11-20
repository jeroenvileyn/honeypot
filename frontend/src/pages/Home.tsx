import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="max-w-5xl mx-auto px-6 py-20 text-center">
      <p className="text-gold tracking-[0.4em] text-xs uppercase">Established for the Honeypot Project</p>
      <h1 className="font-serif text-6xl md:text-7xl mt-4 text-ivory">
        A refined evening of <span className="text-gold italic">Blackjack</span>.
      </h1>
      <p className="mt-6 text-ivory/70 max-w-2xl mx-auto">
        Take a seat at the felt. Every new patron receives <span className="text-gold">500 chips</span> on the house.
        Hit, stand, double, split — the dealer stands on seventeen.
      </p>
      <div className="mt-10 flex gap-4 justify-center">
        {user ? (
          <Link to="/play" className="btn-gold text-lg px-6 py-3">Enter the salon</Link>
        ) : (
          <>
            <Link to="/register" className="btn-gold text-lg px-6 py-3">Open an account</Link>
            <Link to="/login" className="btn-ghost text-lg px-6 py-3">I already have one</Link>
          </>
        )}
      </div>
    </div>
  );
}
