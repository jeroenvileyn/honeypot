import { useEffect, useState } from "react";
import { api } from "../lib/api";

type U = {
  id: number; username: string; displayName: string;
  chips: number; isAdmin: boolean; isEnabled: boolean; createdAt: string;
};

export default function Admin() {
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [chipInputs, setChipInputs] = useState<Record<number, string>>({});

  const load = async () => {
    try { setUsers((await api.adminUsers()).users); }
    catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: number) => {
    try { await api.adminToggle(id); load(); }
    catch (e: any) { setErr(e.message); }
  };

  const giveChips = async (id: number) => {
    const raw = chipInputs[id];
    const amount = parseInt(raw ?? "0", 10);
    if (!Number.isFinite(amount) || amount === 0) return;
    try {
      await api.adminGiveChips(id, amount);
      setChipInputs({ ...chipInputs, [id]: "" });
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const deleteUser = async (u: U) => {
    if (u.isAdmin) return;
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete user");
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Admin · Patrons</h1>
      {err && <p className="text-red-400 mb-2">{err}</p>}

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="py-2">ID</th>
            <th>Username</th>
            <th>Display</th>
            <th>Chips</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Give chips</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isAdminAccount = u.username === "admin";
            return (
              <tr key={u.id} className="border-b border-white/5">
                <td className="py-2">{u.id}</td>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>🪙 {u.chips}</td>
                <td>{u.isAdmin ? "Admin" : "Player"}</td>
                <td>{u.isEnabled ? "Enabled" : "Disabled"}</td>
                <td>{u.createdAt}</td>
                <td>
                  <input
                    value={chipInputs[u.id] ?? ""}
                    onChange={(e) =>
                      setChipInputs({ ...chipInputs, [u.id]: e.target.value })
                    }
                    placeholder="±chips"
                    className="w-24 px-2 py-1 bg-black/30 border border-white/10 rounded mr-2"
                  />
                  <button
                    onClick={() => giveChips(u.id)}
                    className="px-2 py-1 bg-gold/20 hover:bg-gold/30 rounded"
                  >
                    Give
                  </button>
                </td>
                <td className="space-x-2">
                  <button
                    onClick={() => toggle(u.id)}
                    disabled={isAdminAccount}
                    title={isAdminAccount ? "Cannot disable the admin account" : ""}
                    className="px-2 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10"
                  >
                    {u.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={u.isAdmin}
                    title={u.isAdmin ? "Cannot delete admin account" : "Delete user"}
                    className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
