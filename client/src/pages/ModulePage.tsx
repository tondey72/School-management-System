interface ModulePageProps {
  title: string;
  description: string;
}

export function ModulePage({ title, description }: ModulePageProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h2 className="font-heading text-3xl font-extrabold">{title}</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
      </header>

      <div className="card-surface p-5">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          This module is now routed and authenticated. Next step is connecting this screen to its corresponding API data and workflows.
        </p>
      </div>
    </section>
  );
}
