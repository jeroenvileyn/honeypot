import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { user } = await api.login(u, p);
      setUser(user);
      nav("/play");
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h2 className="font-serif text-4xl text-gold mb-6">Welcome back</h2>
      <form onSubmit={submit} className="space-y-4 gold-border bg-feltdark/50 p-6 rounded-lg">
        <input className="input" placeholder="Username" value={u} onChange={e => setU(e.target.value)} autoComplete="username" />
        <input className="input" type="password" placeholder="Password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? "…" : "Sign in"}</button>
        <p className="text-sm text-ivory/60 text-center">
          New here? <Link to="/register" className="text-gold hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
