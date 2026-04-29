export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_600px_400px_at_50%_30%,oklch(0.62_0.23_25/0.18),transparent_60%)]"
      />
      {children}
    </div>
  );
}
