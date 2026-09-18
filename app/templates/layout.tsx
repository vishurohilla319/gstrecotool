import { AppLayout } from "@/components/AppLayout";

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
