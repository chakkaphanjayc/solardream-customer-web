import { PageShell } from "@/components/ui/page-shell";
import Skeleton from "@/components/ui/skeleton";

export default function WorksLoading() {
  return (
    <PageShell
      as="div"
      className="solar-works-page !bg-transparent px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8"
    >
      <div className="mx-auto max-w-7xl" aria-busy="true">
        {/* Header Skeleton */}
        <div className="grid items-end gap-8 rounded-3xl border border-[var(--border)] bg-[var(--sd-card)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-5 w-40 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-14 w-full max-w-xl" />
            <Skeleton className="mt-4 h-6 w-full max-w-lg" />
          </div>
          <div className="rounded-2xl bg-[var(--muted)] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-10 w-20" />
            <Skeleton className="mt-2 h-4 w-36" />
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--sd-card)] p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>

        {/* 6 Card Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-[28px] border border-[var(--border)] bg-[var(--sd-card)] p-6 min-h-[22rem] sm:min-h-[25rem]"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="my-auto h-28 w-full rounded-2xl bg-[var(--muted)]" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-6 w-4/5" />
                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
