export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className="relative flex min-h-dvh flex-col gap-y-4 border-x bg-background pt-20">
      {children}
    </main>
  );
}
