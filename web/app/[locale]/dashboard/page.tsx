import { AppLayout }      from "@/components/AppLayout";
import { DashboardClient } from "@/components/DashboardClient";
import { ChatWidget }      from "@/components/ChatWidget";

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardClient />
      {/* Floating Grok-powered chat assistant */}
      <ChatWidget />
    </AppLayout>
  );
}
