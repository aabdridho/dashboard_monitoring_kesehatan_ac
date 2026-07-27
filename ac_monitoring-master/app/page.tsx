import { OverviewGrid } from "@/features/dashboard/overview-grid";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Dashboard
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">
          Pantauan real-time kesehatan sistem AC dan penggunaan energi.
        </p>
      </header>
      <OverviewGrid />
    </div>
  );
}
