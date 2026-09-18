
export default async function MagicProposalPage({
  params,
}: {
  params: Promise<{ magicTokenSlug: string }>;
}) {
  await params;
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">This proposal link has expired</h1>
      <p className="mt-4 text-slate-600">
        Please ask your SolarDream advisor for a new secure portal link.
      </p>
    </main>
  );
}
