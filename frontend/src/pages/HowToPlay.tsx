import { Link } from "react-router-dom";

export default function HowToPlay() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-12 border-b border-yellow-600/20 pb-8">
        <h1 className="text-5xl font-serif text-yellow-400 mb-3 tracking-tight">
          How to Play Blackjack
        </h1>
        <p className="text-gray-400 italic">A gentleman's guide to the game of 21.</p>
      </header>

      <Section title="The Goal">
        <p>
          Beat the dealer by getting a hand total closer to{" "}
          <span className="text-yellow-400 font-semibold">21</span> than theirs —
          without going over. Cross 21 and you{" "}
          <span className="text-red-400 font-semibold">bust</span> (instant loss).
        </p>
      </Section>

      <Section title="Card Values">
        <div className="grid sm:grid-cols-3 gap-4">
          <ValueCard rank="2 – 10" desc="Face value" />
          <ValueCard rank="J  Q  K" desc="Worth 10" />
          <ValueCard rank="A" desc="Worth 1 or 11" />
        </div>
      </Section>

      <Section title="How a Round Works">
        <ol className="space-y-3">
          {[
            "Place your bet.",
            "You and the dealer each get 2 cards (one of the dealer's is hidden).",
            "Choose your move: hit, stand, double, or split.",
            "The dealer reveals their hidden card and draws until they reach 17 or more.",
            "The hand closer to 21 wins.",
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="text-yellow-400 font-serif text-xl shrink-0 w-8">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-gray-200 pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Your Moves">
        <div className="grid sm:grid-cols-2 gap-4">
          <Move name="Hit" desc="Take another card." />
          <Move name="Stand" desc="Keep your current hand." />
          <Move name="Double Down" desc="Double your bet, take exactly one more card." />
          <Move name="Split" desc="If dealt a pair, split into two separate hands." />
        </div>
      </Section>

      <Section title="Payouts">
        <div className="grid sm:grid-cols-2 gap-3">
          <Payout label="Blackjack (A + 10-value)" value="3 : 2" highlight />
          <Payout label="Regular win" value="1 : 1" />
          <Payout label="Push (tie)" value="Bet returned" />
          <Payout label="Bust / lose" value="Bet forfeited" red />
        </div>
      </Section>

      <p className="text-center italic text-gray-500 mt-16 mb-4">
        "Play the odds, not the omens."
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-serif text-yellow-400 mb-5">{title}</h2>
      <div className="text-gray-200 leading-relaxed">{children}</div>
    </section>
  );
}

function ValueCard({ rank, desc }: { rank: string; desc: string }) {
  return (
    <div className="border border-yellow-600/30 rounded-lg p-5 text-center bg-black/20">
      <div className="text-2xl font-serif text-yellow-400 mb-1">{rank}</div>
      <div className="text-sm text-gray-400">{desc}</div>
    </div>
  );
}

function Move({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="border border-yellow-600/20 rounded-lg p-4 bg-black/20">
      <div className="text-yellow-400 font-semibold mb-1">{name}</div>
      <div className="text-sm text-gray-300">{desc}</div>
    </div>
  );
}

function Payout({
  label,
  value,
  highlight,
  red,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex justify-between items-center border border-yellow-600/20 rounded-lg px-4 py-3 bg-black/20">
      <span className="text-gray-300 text-sm">{label}</span>
      <span
        className={
          highlight
            ? "text-yellow-400 font-serif text-lg"
            : red
              ? "text-red-400 font-serif"
              : "text-gray-100 font-serif"
        }
      >
        {value}
      </span>
    </div>
  );
}
