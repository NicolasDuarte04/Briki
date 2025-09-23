"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MessageRole = "user" | "system";

export function Message({
  role,
  content,
  className,
}: {
  role: MessageRole;
  content: string | React.ReactNode;
  className?: string;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("w-full", className)}>
      {isUser ? (
        <div className="max-w-full">
          <div className="rounded-lg bg-primary text-primary-foreground px-3 py-2 inline-block">
            {content}
          </div>
        </div>
      ) : (
        <Card className="p-3 text-sm">{content}</Card>
      )}
    </div>
  );
}

export default Message;


