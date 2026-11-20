async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: opts.body && !(opts.body instanceof FormData)
      ? { "Content-Type": "application/json", ...(opts.headers || {}) }
      : opts.headers,
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  me: () => req<{ user: any }>("/api/auth/me"),
  login: (username: string, password: string) =>
    req<{ user: any }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string, displayName: string) =>
    req<{ user: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, displayName }),
    }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  updateProfile: (displayName: string) =>
    req<{ user: any }>("/api/profile", { method: "PUT", body: JSON.stringify({ displayName }) }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return req<{ user: any }>("/api/profile/avatar", { method: "POST", body: fd });
  },
  gameState: () => req<{ game: any; chips: number }>("/api/game/state"),
  deal: (bet: number) =>
    req<{ game: any; chips: number; finished: boolean }>("/api/game/deal", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  hit: () => req<any>("/api/game/hit", { method: "POST" }),
  stand: () => req<any>("/api/game/stand", { method: "POST" }),
  double: () => req<any>("/api/game/double", { method: "POST" }),
  split: () => req<any>("/api/game/split", { method: "POST" }),
  adminUsers: () => req<{ users: any[] }>("/api/admin/users"),
  adminToggle: (id: number) =>
    req<{ user: any }>(`/api/admin/users/${id}/toggle`, { method: "POST" }),
adminDeleteUser: (id: number) =>
  req<{ ok: true }>(`/api/admin/users/${id}`, { method: "DELETE" }),
adminGiveChips: (id: number, amount: number) =>
  req<{ user: any }>(`/api/admin/users/${id}/chips`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  }),
leaderboard: () => req<{ leaderboard: any[] }>("/api/leaderboard"),


};
