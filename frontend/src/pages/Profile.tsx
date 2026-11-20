import { ChangeEvent, FormEvent, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const { user } = await api.updateProfile(name);
      setUser(user);
      setMsg("Saved");
    } catch (e: any) { setErr(e.message); }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null); setMsg(null);
    try {
      const { user } = await api.uploadAvatar(f);
      setUser(user);
      setMsg("Avatar updated");
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h2 className="font-serif text-4xl text-gold mb-8">Your profile</h2>
      <div className="gold-border bg-feltdark/50 p-6 rounded-lg space-y-6">
        <div className="flex items-center gap-6">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-24 h-24 rounded-full object-cover gold-border" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-feltdark gold-border grid place-items-center text-3xl font-serif">
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm text-ivory/60">Username</div>
            <div className="font-medium">{user.username}</div>
            <div className="text-sm text-ivory/60 mt-2">Chips</div>
            <div className="text-gold font-medium">🪙 {user.chips}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-ivory/60 mb-1">Avatar (PNG / JPEG / WebP, max 2 MB)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile}
                 className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gold file:text-feltdark hover:file:bg-yellow-400" />
        </div>

        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm text-ivory/60">Display name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn-gold">Save</button>
        </form>

        {msg && <div className="text-emerald-400 text-sm">{msg}</div>}
        {err && <div className="text-red-400 text-sm">{err}</div>}
      </div>
    </div>
  );
}
