"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import React, { forwardRef } from "react";
import MessageAgent from "@/components/Chat/MessageAgent";

export type MessageRole = "user" | "assistant" | "system";

export interface MessageAgentMeta {
  label: string;
  icon?: React.ReactNode;
  actions?: string[];
  tag?: string;
}

interface MessageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  role: MessageRole;
  content: string | React.ReactNode;
  agent?: MessageAgentMeta;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  isTyping?: boolean;
  timestamp?: string;
  onApprove?: () => void;
  /** Callback cuando el usuario hace clic en una referencia a PDF */
  onPdfReferenceClick?: (field: string, page: number, analysisId?: string) => void;
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(function Message(
  { role, content, agent, className, isGroupStart, isGroupEnd, isTyping, timestamp, onApprove, onPdfReferenceClick, ...rest },
  ref
) {
  const isUser = role === "user";
  const isStringContent = typeof content === "string";
  // Timestamp is handled inside the agent card for accessibility context

  if (isTyping) {
    return (
      <Card
        ref={ref}
        className={cn(
          "flex items-center gap-3 p-4 border-border/70 bg-background/95 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.35)]",
          "rounded-t-2xl rounded-br-2xl rounded-bl-md"
        )}
      >
        <div className="flex h-2 w-2 animate-pulse rounded-full bg-primary/80 delay-100" />
        <div className="flex h-2 w-2 animate-pulse rounded-full bg-primary/80 delay-200" />
        <div className="flex h-2 w-2 animate-pulse rounded-full bg-primary/80 delay-300" />
        <span className="sr-only">{content}</span>
      </Card>
    );
  }

  return (
    <div ref={ref} className={cn("w-full", className)} {...rest}>
      {isUser ? (
        <div className="max-w-full">
          <div
            className={cn(
              "inline-flex max-w-full items-start gap-2 bg-primary px-4 py-2.5 text-primary-foreground",
              "rounded-t-2xl rounded-bl-2xl",
              isGroupStart && "rounded-tr-2xl",
              !isGroupStart && "rounded-tr-md",
              isGroupEnd && "rounded-br-2xl",
              !isGroupEnd && "rounded-br-md"
            )}
          >
            <span className="sr-only">Broker:</span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm leading-relaxed break-words">{content}</span>
              {timestamp && isGroupEnd && (
                <span className="text-[12px] leading-none text-foreground/70 self-end mt-1">{timestamp}</span>
              )}
            </div>
          </div>
        </div>
      ) : role === "assistant" ? (
        <MessageAgent
          className={cn(
            "rounded-t-2xl rounded-br-2xl",
            isGroupStart && "rounded-tl-2xl",
            !isGroupStart && "rounded-tl-md",
            isGroupEnd && "rounded-bl-2xl",
            !isGroupEnd && "rounded-bl-md"
          )}
          {...(agent?.label ? { title: agent.label } : {})}
          {...(agent?.tag ? { tagLabel: agent.tag } : {})}
          {...(timestamp ? { timestamp } : {})}
          /* Si el contenido es string, pasarlo como stringContent para renderizado Markdown */
          {...(isStringContent 
            ? { stringContent: content as string } 
            : { body: <div className="break-words">{content}</div> }
          )}
          onApprove={onApprove || (() => {})}
          {...(onPdfReferenceClick ? { onPdfReferenceClick } : {})}
        />
      ) : (
        <div className="max-w-full">
          <div className="inline-flex w-full items-start gap-2 rounded-lg border border-border/70 bg-muted/40 px-4 py-2 text-xs leading-relaxed text-foreground/80">
            <span className="sr-only">System note:</span>
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" aria-hidden />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div
                className={cn(
                  "break-words",
                  isStringContent ? "whitespace-pre-wrap" : undefined
                )}
              >
                {content}
              </div>
              {timestamp && isGroupEnd && (
                <span className="text-[12px] leading-none text-foreground/70 self-end mt-1">{timestamp}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});


export default Message;

