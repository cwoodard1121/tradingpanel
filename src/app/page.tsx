export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-brand text-xs font-mono uppercase tracking-[0.25em] mb-4">
          ₿ BTC Risk &amp; Journal
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Setting things up…</h1>
        <p className="text-content-secondary mt-3 leading-relaxed">
          Your trading panel — risk calculator, journal, and prop-firm
          analytics — is being built. This placeholder confirms the app deploys
          cleanly on Vercel.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-content-muted text-sm">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          Deploy pipeline live
        </div>
      </div>
    </main>
  );
}
