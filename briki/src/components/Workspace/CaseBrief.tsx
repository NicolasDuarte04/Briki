"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUI } from "@/lib/ui/state";

export default function CaseBrief() {
  const { brief } = useUI();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Brief</CardTitle>
      </CardHeader>
      <CardContent className="text-sm grid gap-2">
        <div>
          <div className="text-muted-foreground">Business Type</div>
          <div>{brief.businessType ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Employees</div>
          <div>{brief.employees ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Coverage</div>
          <div>{brief.coverage ?? "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}


