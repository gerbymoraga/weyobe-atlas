export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[color-mix(in_srgb,var(--bone)_8%,transparent)] ${className}`}
    />
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-dashed border-[var(--line)] px-6 py-10 text-center">
      <p className="font-display text-xl text-bone">{title}</p>
      <p className="mt-2 font-body text-[var(--muted)]">{body}</p>
    </div>
  );
}
