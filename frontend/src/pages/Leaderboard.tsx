import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Entry = {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  chips: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard()
      .then(d => setEntries(d.leaderboard))
      .catch(e => setErr(e.message));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      {err && <p className="text-red-400 mb-3">{err}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-white/10">
            <th className="py-2">#</th>
            <th>Player</th>
            <th className="text-right">Chips</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.id} className="border-b border-white/5">
              <td className="py-2">{i + 1}</td>
              <td className="flex items-center gap-2 py-2">
                {e.avatar ? (
                  <img src={e.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
                    {e.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {e.displayName}
              </td>
              <td className="text-right font-mono">🪙 {e.chips}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
