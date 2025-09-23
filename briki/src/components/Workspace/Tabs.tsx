"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CaseBrief from "@/components/Workspace/CaseBrief";

export type WorkspaceTab =
  | "case-brief"
  | "policies"
  | "comparisons"
  | "proposal"
  | "renewals";

export function WorkspaceTabs() {
  return (
    <Tabs defaultValue="case-brief" className="w-full">
      <TabsList className="grid grid-cols-5">
        <TabsTrigger value="case-brief">Case Brief</TabsTrigger>
        <TabsTrigger value="policies" disabled>
          Policies
        </TabsTrigger>
        <TabsTrigger value="comparisons" disabled>
          Comparisons
        </TabsTrigger>
        <TabsTrigger value="proposal" disabled>Proposal</TabsTrigger>
        <TabsTrigger value="renewals" disabled>Renewals</TabsTrigger>
      </TabsList>
      <TabsContent value="case-brief" className="mt-4">
        <CaseBrief />
      </TabsContent>
    </Tabs>
  );
}

export default WorkspaceTabs;


