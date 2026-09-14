import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import Skeleton from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <PageShell className="bg-background px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl" aria-busy="true">
        <Card tone="subtle" className="p-5 sm:p-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-7 h-10 w-full max-w-3xl" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-3/5 max-w-xl" />
        </Card>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
          <Card className="p-5 sm:p-6">
            <Skeleton className="h-8 w-56" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full" />
              ))}
            </div>
          </Card>
          <Card className="h-80 p-5 sm:p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-6 h-12 w-full" />
            <Skeleton className="mt-4 h-20 w-full" />
            <Skeleton className="mt-6 h-11 w-full rounded-full" />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
