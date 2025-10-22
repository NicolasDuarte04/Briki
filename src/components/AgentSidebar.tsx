"use client";

import { useUI } from "@/lib/ui/state";
import SidebarChatPanel from "@/components/SidebarChatPanel";
import SidebarNav from "@/components/SidebarNav";

export default function AgentSidebar() {
  const { cases, chatPanelOpen } = useUI();
  return chatPanelOpen ? <SidebarChatPanel cases={cases} /> : <SidebarNav />;
}


