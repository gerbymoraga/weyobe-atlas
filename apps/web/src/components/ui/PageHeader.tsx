export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-4xl text-bone md:text-5xl">{title}</h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-lg text-[var(--muted)]">{subtitle}</p>
      ) : null}
    </header>
  );
}
