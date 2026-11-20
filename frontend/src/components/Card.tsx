type C = { r: string; s: string };

export function Card({ card }: { card: C }) {
  if (card.r === "?") return <div className="card-back" />;
  const red = card.s === "♥" || card.s === "♦";
  return (
    <div className="card-face">
      <div className={`text-xl leading-none ${red ? "suit-red" : "suit-black"}`}>
        <div>{card.r}</div>
        <div>{card.s}</div>
      </div>
      <div className={`text-xl leading-none self-end rotate-180 ${red ? "suit-red" : "suit-black"}`}>
        <div>{card.r}</div>
        <div>{card.s}</div>
      </div>
    </div>
  );
}

export function Hand({ cards }: { cards: C[] }) {
  return (
    <div className="flex gap-2">
      {cards.map((c, i) => (
        <Card key={i} card={c} />
      ))}
    </div>
  );
}
