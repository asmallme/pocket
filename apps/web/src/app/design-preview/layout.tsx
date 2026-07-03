export default function DesignPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative left-1/2 w-screen max-w-5xl -translate-x-1/2 px-4">
      {children}
    </div>
  );
}
