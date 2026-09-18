import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GST Reconcile Pro | Enterprise GST Reconciliation & Audit",
  description: "Automated GST Reconciliation software for Indian accountants, CAs and enterprises reconciling Purchase Books, GSTR-2A, GSTR-2B, and GSTR-3B.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
