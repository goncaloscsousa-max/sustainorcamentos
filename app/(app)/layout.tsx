import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader userName={session.user.name} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
