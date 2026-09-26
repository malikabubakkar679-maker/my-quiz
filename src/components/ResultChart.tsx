export function ResultRing({ value, size = 180, label, sublabel }: { value: number; size?: number; label: string; sublabel?: string }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring-g)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-4xl font-bold">{label}</p>
          {sublabel && <p className="text-xs text-muted">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function AnalysisBar({ correct, wrong, unanswered }: { correct: number; wrong: number; unanswered: number }) {
  const total = Math.max(1, correct + wrong + unanswered);
  const rows = [
    { label: "Correct", value: correct, color: "bg-success" },
    { label: "Incorrect", value: wrong, color: "bg-danger" },
    { label: "Unanswered", value: unanswered, color: "bg-white/30" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
        {rows.map((r) => <div key={r.label} className={r.color} style={{ width: `${(r.value / total) * 100}%` }} />)}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${r.color}`} />
            <span className="text-muted">{r.label}</span>
            <b className="ml-auto sm:ml-0">{r.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
