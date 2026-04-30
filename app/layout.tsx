import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getBranding } from "@/lib/branding/config";

export function generateMetadata(): Metadata {
  const b = getBranding();
  return {
    title: b.brandName,
    description: `Plataforma de apoio à orçamentação — ${b.companyLegalName}.`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={cn("h-full", "antialiased", "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
