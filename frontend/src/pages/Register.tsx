import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [d, setD] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { user } = await api.register(u, p, d || u);
      setUser(user);
      nav("/play");
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h2 className="font-serif text-4xl text-gold mb-6">Join the salon</h2>
      <form onSubmit={submit} className="space-y-4 gold-border bg-feltdark/50 p-6 rounded-lg">
        <input className="input" placeholder="Username (3–24, letters/digits/_)" value={u} onChange={e => setU(e.target.value)} />
        <input className="input" placeholder="Display name (optional)" value={d} onChange={e => setD(e.target.value)} />
        <input className="input" type="password" placeholder="Password (min 8 chars)" value={p} onChange={e => setP(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? "…" : "Create account"}</button>
        <p className="text-sm text-ivory/60 text-center">
          Already a patron? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
