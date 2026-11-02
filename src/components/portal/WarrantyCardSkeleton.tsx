type WarrantyCardSkeletonProps = {
  loadingLabel: string;
};

export function WarrantyCardSkeleton({ loadingLabel }: WarrantyCardSkeletonProps) {
  return (
    <div
      data-bagui="page"
      data-solar-surface="atelier"
      aria-busy="true"
      className="solar-warranty-portal min-h-dvh px-4 py-8 md:px-8 md:py-10"
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {loadingLabel}
      </p>
      <div aria-hidden="true" className="mx-auto max-w-5xl space-y-6 animate-pulse motion-reduce:animate-none">
        <header className="flex items-center justify-between gap-4">
          <div className="solar-warranty-skeleton h-10 w-36 rounded-full" />
          <div className="solar-warranty-skeleton h-4 w-32 rounded-full" />
        </header>
        <section className="solar-warranty-panel space-y-7 p-6 md:p-9">
          <div className="flex flex-col justify-between gap-5 md:flex-row">
            <div className="space-y-3">
              <div className="solar-warranty-skeleton h-4 w-44 rounded-full" />
              <div className="solar-warranty-skeleton h-10 w-64 max-w-full rounded-xl" />
              <div className="solar-warranty-skeleton h-4 w-72 max-w-full rounded-full" />
            </div>
            <div className="solar-warranty-skeleton h-10 w-36 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="solar-warranty-skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="solar-warranty-skeleton h-16 rounded-2xl" />
        </section>
        <section className="solar-warranty-panel space-y-5 p-6 md:p-8">
          <div className="solar-warranty-skeleton h-7 w-52 rounded-xl" />
          <div className="solar-warranty-skeleton h-20 rounded-2xl" />
          <div className="solar-warranty-skeleton h-20 rounded-2xl" />
        </section>
      </div>
    </div>
  );
}
