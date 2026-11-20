import { useEffect, useState } from "react";
import { Hand } from "../components/Card";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Card = { r: string; s: string };
type HandT = { cards: Card[]; bet: number; done: boolean; value: number; result: string | null };
type GameT = {
  dealer: Card[]; dealerValue: number;
  hands: HandT[]; active: number;
  payout?: number;
} | null;

export default function Play() {
  const { user, refresh } = useAuth();
  const [game, setGame] = useState<GameT>(null);
  const [finished, setFinished] = useState(false);
  const [bet, setBet] = useState(25);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (data: { game: any; chips: number; finished?: boolean }) => {
    setGame(data.game);
    setFinished(!!data.finished);
    refresh();
  };

  const load = async () => {
    try {
      const data = await api.gameState();
      if (data.game) { setGame(data.game); setFinished(false); }
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const action = async (fn: () => Promise<any>) => {
    setErr(null); setBusy(true);
    try { apply(await fn()); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const startNew = () => action(() => api.deal(bet));
  const newRound = () => { setGame(null); setFinished(false); };

  const activeHand = game?.hands[game.active];
  const canDouble = activeHand && activeHand.cards.length === 2 && !activeHand.done && (user?.chips ?? 0) >= activeHand.bet;
  const canSplit = activeHand && game!.hands.length === 1 && activeHand.cards.length === 2 &&
    rankVal(activeHand.cards[0].r) === rankVal(activeHand.cards[1].r) && (user?.chips ?? 0) >= activeHand.bet;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="felt-table rounded-3xl p-8 md:p-12 min-h-[520px] flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold/70">Dealer</div>
            <div className="text-2xl font-serif">
              {game ? `Hand · ${game.dealerValue}` : "Awaiting wager"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-gold/70">Bank</div>
            <div className="text-gold font-medium text-xl">🪙 {user?.chips}</div>
          </div>
        </div>

        <div className="min-h-[120px] flex items-center justify-center">
          {game ? <Hand cards={game.dealer} /> : <div className="text-ivory/40 italic">Place a bet to deal</div>}
        </div>

        <div className="my-6 border-t border-gold/20" />

        <div className="min-h-[140px] flex items-end justify-center gap-8 flex-wrap">
          {game?.hands.map((h, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${i === game.active && !finished ? "scale-105" : "opacity-80"} transition`}>
              <Hand cards={h.cards} />
              <div className="text-sm">
                <span className="text-ivory/70">Bet 🪙 {h.bet}</span>
                <span className="mx-2">·</span>
                <span>{h.value}</span>
                {h.result && (
                  <span className={`ml-2 font-medium ${
                    h.result === "win" || h.result === "blackjack" ? "text-emerald-400"
                    : h.result === "push" ? "text-ivory/70"
                    : "text-red-400"}`}>
                    {h.result.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {!game && <div className="text-ivory/40 italic">Your hand will appear here</div>}
        </div>

        <div className="mt-auto pt-8">
          {err && <div className="text-red-400 text-sm mb-3 text-center">{err}</div>}
          {!game || finished ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {finished && game?.payout !== undefined && (
                <div className="w-full text-center text-gold font-serif text-2xl mb-2">
                  {game.payout > 0 ? `You receive 🪙 ${game.payout}` : "House takes the round"}
                </div>
              )}
              <label className="text-ivory/70 text-sm">Wager</label>
              <input type="number" min={5} max={1000} value={bet}
                     onChange={e => setBet(Math.max(5, Math.min(1000, parseInt(e.target.value || "0"))))}
                     className="input w-28" />
              <div className="flex gap-2">
                {[25, 50, 100, 250].map(v => (
                  <button key={v} className="btn-ghost" onClick={() => setBet(v)}>🪙 {v}</button>
                ))}
              </div>
              <button className="btn-gold" onClick={finished ? () => { newRound(); startNew(); } : startNew} disabled={busy}>
                {finished ? "Deal again" : "Deal"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button className="btn-gold" disabled={busy} onClick={() => action(api.hit)}>Hit</button>
              <button className="btn-ghost" disabled={busy} onClick={() => action(api.stand)}>Stand</button>
              <button className="btn-ghost" disabled={busy || !canDouble} onClick={() => action(api.double)}>Double</button>
              <button className="btn-ghost" disabled={busy || !canSplit} onClick={() => action(api.split)}>Split</button>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-ivory/40 mt-6">
        Dealer stands on 17 · Blackjack pays 3:2 · Down to zero chips and the house grants 500 more.
      </p>
    </div>
  );
}

function rankVal(r: string) { return ["10","J","Q","K"].includes(r) ? 10 : r === "A" ? 11 : parseInt(r); }
