export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm px-4">
        <p className="text-center text-2xl font-bold mb-6">🐾 BarkBuddy</p>
        {children}
      </div>
    </div>
  );
}
