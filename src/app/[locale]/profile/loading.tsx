import { PageShell } from "@/components/ui/page-shell";
import Skeleton from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <PageShell
      as="main"
      className="w-full bg-background px-4 pb-16 pt-8 text-foreground sm:px-6 sm:pt-10 lg:px-8 lg:pt-28"
    >
      <div aria-busy="true" className="mx-auto w-full max-w-6xl pb-6">
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-6 w-full max-w-2xl" />
        </div>

        <div className="mt-8 flex items-center gap-4 border-y border-border py-5">
          <Skeleton className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-11 w-36 sm:block" />
        </div>

        <div className="mt-7 flex gap-2 border-b border-border pb-1">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-32" />
        </div>

        <Card className="mt-6 min-h-[32rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-7 h-11 w-32" />
        </Card>
      </div>
    </PageShell>
  );
}
