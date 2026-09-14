export interface Stat {
  label: string;
  value: string;
  note: string;
  tone?: string;
}

export default function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="grid border-b-2"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, borderColor: "rgba(32,30,29,.4)" }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="py-[18px] px-[22px] pb-5 border-r"
          style={{ borderColor: "rgba(32,30,29,.18)" }}
        >
          <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
            {s.label}
          </div>
          <div
            className="tabnum text-[30px] font-extrabold tracking-tight leading-[1.15] mt-1.5"
            style={{ color: s.tone || "#201e1d" }}
          >
            {s.value}
          </div>
          <div className="text-xs" style={{ color: "#605d5d" }}>
            {s.note}
          </div>
        </div>
      ))}
    </div>
  );
}
