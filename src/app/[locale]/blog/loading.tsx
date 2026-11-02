import { PageShell } from "@/components/ui/page-shell";
import Skeleton from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <PageShell
      as="div"
      className="bg-[var(--background)] px-5 pb-24 pt-28 text-[var(--sd-ink)] sm:px-8 sm:pb-32 sm:pt-36"
    >
      <div className="mx-auto max-w-7xl" aria-busy="true">
        {/* Header Skeleton */}
        <div className="mb-12 max-w-3xl sm:mb-16">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="mt-4 h-12 w-full max-w-xl" />
          <Skeleton className="mt-4 h-6 w-full max-w-md" />
        </div>

        {/* Featured Article Hero Skeleton */}
        <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--sd-card)]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Skeleton className="min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] w-full" />
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12">
              <div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-6 h-10 w-full" />
                <Skeleton className="mt-4 h-5 w-full" />
                <Skeleton className="mt-2 h-5 w-4/5" />
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills Skeleton */}
        <div className="mt-12 flex items-center justify-between border-b border-[var(--border)] pb-6">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
          <Skeleton className="h-5 w-28" />
        </div>

        {/* 2-Column Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--sd-card)]"
            >
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="p-6 sm:p-7">
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="mt-4 h-7 w-4/5" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
                <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
