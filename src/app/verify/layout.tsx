export default function VerificationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body data-solar-ui="customer" className="min-h-screen bg-[#F0EEE9] text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
