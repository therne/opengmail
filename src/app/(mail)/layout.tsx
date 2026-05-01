import { GmailShell } from "@/components/gmail-clone";

export default function MailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="h-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <GmailShell>{children}</GmailShell>
    </main>
  );
}
