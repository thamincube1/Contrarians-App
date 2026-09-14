export default function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="tag" style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}
