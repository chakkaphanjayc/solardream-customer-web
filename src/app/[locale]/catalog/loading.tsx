import Skeleton from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh max-w-[90vw] px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-4 w-28 rounded-full bg-slate-200/45" />
          <Skeleton className="h-12 w-full max-w-3xl rounded-3xl bg-slate-200/45 sm:h-16" />
          <Skeleton className="h-5 w-full max-w-2xl rounded-full bg-slate-200/35" />
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full md:w-64 lg:w-72 shrink-0">
            <div className="space-y-4 rounded-[32px] border border-slate-200/60 bg-[#F0EEE9]/80 p-5 shadow-md shadow-slate-200/20 md:p-6">
              <Skeleton className="h-5 w-32 rounded-full bg-slate-200/45" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-10 w-full rounded-full bg-slate-200/40" />
                <Skeleton className="h-10 w-full rounded-full bg-slate-200/40" />
                <Skeleton className="h-10 w-full rounded-full bg-slate-200/40" />
                <Skeleton className="h-10 w-5/6 rounded-full bg-slate-200/40" />
              </div>
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-24 rounded-full bg-slate-200/35" />
                <Skeleton className="h-12 w-full rounded-2xl bg-slate-200/40" />
                <Skeleton className="h-12 w-full rounded-2xl bg-slate-200/40" />
              </div>
            </div>
          </aside>

          <div className="w-full flex-1 space-y-6">
            <Skeleton className="h-6 w-40 rounded-full bg-slate-200/40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[32px] border border-slate-200/60 bg-[#F0EEE9] shadow-md shadow-slate-200/20"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none bg-slate-200/35" />
                  <div className="space-y-4 p-4 md:p-6">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full bg-slate-200/40" />
                        <Skeleton className="h-5 w-16 rounded-full bg-slate-200/40" />
                      </div>
                      <Skeleton className="h-6 w-4/5 rounded-full bg-slate-200/45" />
                      <Skeleton className="h-4 w-full rounded-full bg-slate-200/35" />
                      <Skeleton className="h-4 w-3/4 rounded-full bg-slate-200/35" />
                    </div>
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <Skeleton className="h-5 w-24 rounded-full bg-slate-200/45" />
                      <Skeleton className="h-11 w-full rounded-full bg-[#B7D1EA]/35" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
