"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useUI } from "@/lib/ui/state";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, ArrowDown } from "lucide-react";
import Message, { type MessageRole, type MessageAgentMeta } from "@/components/Chat/Message";
import { useTranslations } from "next-intl";
import { ProvenanceChip, type ProvenanceTag } from "@/components/Sourcing/ProvenanceChip";

interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: React.ReactNode;
  agent?: MessageAgentMeta;
  isSeeded?: boolean;
}

const SOURCING_PROVENANCE: ProvenanceTag[] = ["API", "Portal", "PDF"];

const ConversationPane: React.FC<{ className?: string }> = ({ className }) => {
  const brief = useUI((state) => state.brief);
  const isSourcing = useUI((state) => state.isSourcing);
  const startSourcing = useUI((state) => state.startSourcing);
  const sourcingTranslations = useTranslations("sourcing.status");
  const chatTranslations = useTranslations("chat");
  // const composer = useTranslations("composer");
  const initialSystem = useMemo(() => {
    const parts: string[] = [];
    if (brief.businessType) parts.push(`Business: ${brief.businessType}`);
    if (brief.employees) parts.push(`Employees: ${brief.employees}`);
    if (brief.coverage) parts.push(`Coverage: ${brief.coverage}`);
    if (brief.freeText) parts.push(`Notes: ${brief.freeText}`);
    return parts.length
      ? `I captured your brief. ${parts.join(" · ")}`
      : "Tell me about your client or paste details to get started.";
  }, [brief]);

  const seededConversation = useMemo<ChatMessage[]>(() => {
    const { businessType, employees, coverage, freeText } = brief;
    const coverageText = formatCoverage(coverage);
    const businessText = businessType ?? "our client";
    const locationHint = hasBogota(businessType) ? "" : " in Bogotá";
    const intro = `Hey Briki, I’m prepping quotes for ${businessText}${locationHint}.`;
    const headcount = employees
      ? `We’re ${employees} people and need ${coverageText || "coverage options"} without slowing onboarding.`
      : `We need ${coverageText || "coverage options"} without slowing onboarding.`;
    const briefNotes = freeText ? ` The brief notes: ${freeText}` : "";

    const assistantCoverageFocus = coverageText || "coverage";
    const assistantTeamFocus = employees ? `${employees}-person tech team` : "team";
    const assistantLocation = hasBogota(businessType) ? "Bogotá" : "your market";
    const assistantMessage = `Got it. I’ll spin up sourcing for ${assistantCoverageFocus} that fits a ${assistantTeamFocus} in ${assistantLocation}. Want me to queue the compliance checklist once appetite comes back?`;

        return [
      { role: "system", content: initialSystem, isSeeded: true },
      {
        role: "user",
        content: `${intro} ${headcount}${briefNotes}`.trim(),
        isSeeded: true,
      },
      {
        role: "assistant",
        content: assistantMessage,
            agent: { label: chatTranslations("agents.sourcing"), tag: chatTranslations("agent.prompt.label") },
        isSeeded: true,
      },
    ];
  }, [brief, chatTranslations, initialSystem]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => seededConversation);
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const trimmed = value.trim();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const prevIsSourcingRef = useRef(isSourcing);
  const hasMountedRef = useRef(false);
  const [showJumpToNewest, setShowJumpToNewest] = useState(false);
  const pendingRafRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const sourcingStatusCopy = useMemo(() => {
    const rawMicroSteps = sourcingTranslations.raw("microSteps");
    const microSteps = Array.isArray(rawMicroSteps)
      ? rawMicroSteps.filter((step): step is string => typeof step === "string")
      : [];

    return {
      body: sourcingTranslations("body"),
      sourcesLabel: sourcingTranslations("sourcesLabel"),
      microStepsLabel: sourcingTranslations("microStepsLabel"),
      microSteps,
    };
  }, [sourcingTranslations]);

  const isNearBottom = useCallback((el: HTMLElement) => {
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const sentinel = bottomSentinelRef.current;
      if (sentinel && typeof sentinel.scrollIntoView === "function") {
        sentinel.scrollIntoView({ behavior, block: "end" });
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior });
      }
      shouldStickToBottomRef.current = true;
    },
    []
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const nearBottom = isNearBottom(target);
      shouldStickToBottomRef.current = nearBottom;
      if (nearBottom) {
        setShowJumpToNewest(false);
      } else {
        // Show jump to latest if there are new messages while scrolled up
        const hasNewerMessages = lastMessageRef.current && lastMessageRef.current.nextElementSibling !== bottomSentinelRef.current;
        if (hasNewerMessages) {
          setShowJumpToNewest(true);
        }
      }
    },
    [isNearBottom]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const lastMessage = messages[messages.length - 1];
    const isFromUser = lastMessage?.role === "user";

    if (shouldStickToBottomRef.current || isFromUser) {
      const behavior = hasMountedRef.current ? "smooth" : "auto";
      requestAnimationFrame(() => scrollToBottom(behavior));
      setShowJumpToNewest(false);
      shouldStickToBottomRef.current = true;
    } else {
      setShowJumpToNewest(true);
    }

    hasMountedRef.current = true;
  }, [messages, scrollToBottom]);


  useEffect(() => {
    if (isSourcing && !prevIsSourcingRef.current) {
      setMessages((prev) => {
        const hasStatusMessage = prev.some(
          (message) => message.role === "assistant" && message.id === "sourcing-status"
        );

        if (hasStatusMessage) {
          return prev.map((message) =>
            message.id === "sourcing-status"
              ? {
                  ...message,
                  content: (
                    <SourcingStatusMessage
                      body={sourcingStatusCopy.body}
                      sources={SOURCING_PROVENANCE}
                      sourcesLabel={sourcingStatusCopy.sourcesLabel}
                      microSteps={sourcingStatusCopy.microSteps}
                      microStepsLabel={sourcingStatusCopy.microStepsLabel}
                    />
                  ),
                }
              : message
          );
        }

        return [
          ...prev,
          {
            id: "sourcing-status",
            role: "assistant",
            content: (
              <SourcingStatusMessage
                body={sourcingStatusCopy.body}
                sources={SOURCING_PROVENANCE}
                sourcesLabel={sourcingStatusCopy.sourcesLabel}
                microSteps={sourcingStatusCopy.microSteps}
                microStepsLabel={sourcingStatusCopy.microStepsLabel}
              />
            ),
            agent: { label: chatTranslations("agents.sourcing") },
          },
        ];
      });
    }

    prevIsSourcingRef.current = isSourcing;
  }, [chatTranslations, isSourcing, sourcingStatusCopy]);

  useEffect(() => {
    const handleResize = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (shouldStickToBottomRef.current) {
        scrollToBottom("auto");
      } else {
        if (isNearBottom(container)) {
          setShowJumpToNewest(false);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (!container) {
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isNearBottom, scrollToBottom]);

  // Adjust scroll position when late content (images, dynamic blocks, fonts) changes layout
  useEffect(() => {
    const container = scrollContainerRef.current;
    const contentEl = contentRef.current;
    if (!container || !contentEl) return;

    const scheduleAdjust = () => {
      if (pendingRafRef.current) cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        if (shouldStickToBottomRef.current || isNearBottom(container)) {
          scrollToBottom("auto");
          setShowJumpToNewest(false);
        }
      });
    };

    const contentResizeObserver = new ResizeObserver(() => {
      scheduleAdjust();
    });
    contentResizeObserver.observe(contentEl);

    // Track image load/error within messages
    const images = Array.from(contentEl.querySelectorAll("img"));
    const removeImageListeners: Array<() => void> = [];
    images.forEach((img) => {
      const onImgEvent = () => scheduleAdjust();
      if (!img.complete) {
        img.addEventListener("load", onImgEvent, { once: true });
        img.addEventListener("error", onImgEvent, { once: true });
        removeImageListeners.push(() => {
          img.removeEventListener("load", onImgEvent as EventListener);
          img.removeEventListener("error", onImgEvent as EventListener);
        });
      }
    });

    // Font loading events (helps when web fonts swap in)
    let removeFontsListeners: (() => void) | undefined;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts && typeof fonts.addEventListener === "function") {
      const onFontsDone = () => scheduleAdjust();
      fonts.addEventListener("loadingdone", onFontsDone);
      fonts.addEventListener("loadingerror", onFontsDone);
      removeFontsListeners = () => {
        fonts.removeEventListener("loadingdone", onFontsDone);
        fonts.removeEventListener("loadingerror", onFontsDone);
      };
    } else if (fonts && fonts.ready && typeof fonts.ready.then === "function") {
      fonts.ready.then(() => scheduleAdjust());
    }

    return () => {
      contentResizeObserver.disconnect();
      removeImageListeners.forEach((off) => off());
      if (removeFontsListeners) removeFontsListeners();
      if (pendingRafRef.current) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
    };
  }, [isNearBottom, scrollToBottom, messages]);

  useEffect(() => {
    // Only update messages if seeded conversation has actually changed
    setMessages((prev) => {
      if (!prev.length) return seededConversation;
      
      // Check if the seeded messages are already up to date
      const systemSeed = seededConversation[0];
      const seededUser = seededConversation[1];
      const seededAssistant = seededConversation[2];
      
      const systemMatches = prev[0]?.role === "system" && 
        prev[0]?.content === systemSeed?.content;
      const userMatches = prev[1]?.isSeeded && 
        prev[1]?.content === seededUser?.content;
      const assistantIndex = seededUser ? 2 : 1;
      const assistantMatches = prev[assistantIndex]?.isSeeded && 
        prev[assistantIndex]?.content === seededAssistant?.content &&
        prev[assistantIndex]?.agent?.label === seededAssistant?.agent?.label;
      
      // If all seeded messages match, no update needed
      if (systemMatches && userMatches && assistantMatches) {
        return prev;
      }
      
      // Otherwise, update the seeded messages
      const next = [...prev];

      if (systemSeed) {
        if (!next[0] || next[0].role !== "system") {
          next.unshift(systemSeed);
        } else if (next[0].content !== systemSeed.content) {
          const updatedSystem: ChatMessage = { ...next[0], content: systemSeed.content };
          if (systemSeed.isSeeded !== undefined) {
            updatedSystem.isSeeded = systemSeed.isSeeded;
          } else {
            delete updatedSystem.isSeeded;
          }
          next[0] = updatedSystem;
        }
      }

      if (seededUser) {
        if (!next[1] || !next[1].isSeeded) {
          next.splice(1, 0, seededUser);
        } else if (next[1].content !== seededUser.content) {
          next[1] = { ...next[1], content: seededUser.content };
        }
      }

      if (seededAssistant) {
        const assistantMessage = next[assistantIndex];
        if (!assistantMessage || !assistantMessage.isSeeded) {
          next.splice(assistantIndex, 0, seededAssistant);
        } else if (
          assistantMessage.content !== seededAssistant.content ||
          assistantMessage.agent?.label !== seededAssistant.agent?.label ||
          assistantMessage.agent?.tag !== seededAssistant.agent?.tag
        ) {
          const updatedAssistant: ChatMessage = {
            ...assistantMessage,
            content: seededAssistant.content,
          };
          if (seededAssistant.agent !== undefined) {
            updatedAssistant.agent = seededAssistant.agent;
          } else {
            delete updatedAssistant.agent;
          }
          next[assistantIndex] = updatedAssistant;
        }
      }

      return next;
    });
  }, [seededConversation]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) {
      return;
    }
    node.style.height = "auto";
    const maxHeight = 220;
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${nextHeight}px`;
  }, [value]);

  function sendMessage() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const container = scrollContainerRef.current;
    const nearBottom = container ? isNearBottom(container) : true;
    shouldStickToBottomRef.current = nearBottom;
    
    const newUserMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setValue("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantResponse: ChatMessage = {
        role: "assistant",
        content: "Thanks! I’ll hand this to the sourcing flow so you can pick a direction.",
        agent: { label: chatTranslations("agents.sourcing") },
      };
      setMessages((prev) => [...prev, assistantResponse]);
      setIsTyping(false);
      if (!isSourcing) {
        startSourcing();
      }
    }, 1200);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  return (
    <div className={cn("h-full flex flex-col overflow-hidden", className)}>
      <div className="relative flex-1 flex flex-col">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          <div ref={contentRef} className="space-y-4">
            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              const prevMessage = messages[idx - 1];
              const nextMessage = messages[idx + 1];
              const isGroupStart = !prevMessage || prevMessage.role !== m.role;
              const isGroupEnd = !nextMessage || nextMessage.role !== m.role;
              const messageTabIndex = isLast ? -1 : undefined;
              const displayTimestamp = new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={m.id ?? idx}
                  className={cn(
                    "flex items-end gap-2",
                    m.role === "user" ? "justify-end" : "justify-start",
                    !isGroupEnd ? "mb-1" : "mb-4"
                  )}
                >
                  <div className={cn(
                    "w-full max-w-[95%]",
                    m.role === "assistant" && "pr-4"
                  )}>
                    <Message
                      role={m.role}
                      content={m.content}
                      {...(m.agent ? { agent: m.agent } : {})}
                      ref={isLast ? lastMessageRef : undefined}
                      {...(messageTabIndex !== undefined ? { tabIndex: messageTabIndex } : {})}
                      isGroupStart={isGroupStart}
                      isGroupEnd={isGroupEnd}
                      timestamp={displayTimestamp}
                    />
                  </div>
                </div>
              );
            })}
             {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="w-full max-w-[95%] pr-4">
                  <Message
                    role="assistant"
                    content={chatTranslations("typing")}
                    {...{
                      agent: { label: chatTranslations("agents.sourcing") },
                    }}
                    isTyping
                  />
                </div>
              </div>
            )}
            <div ref={bottomSentinelRef} aria-hidden className="h-1" />
          </div>
        </div>
        {showJumpToNewest ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto h-8 rounded-full bg-background/80 px-4 text-xs shadow-md backdrop-blur-sm hover:bg-background"
              onClick={() => {
                scrollToBottom();
                requestAnimationFrame(() => {
                  lastMessageRef.current?.focus({ preventScroll: true });
                });
                setShowJumpToNewest(false);
              }}
            >
              <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
              {chatTranslations("jumpToNewest")}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="sticky bottom-0 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-t">
        <form
          onSubmit={onSubmit}
          className={cn(
            "relative p-3",
            "focus-within:bg-background/95"
          )}
        >
          <Textarea
            ref={composerRef}
            rows={1}
            placeholder={chatTranslations("placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "w-full pr-16",
              "min-h-[52px] max-h-[220px] resize-none",
              "bg-transparent border-none shadow-none",
              "py-3.5 pl-4",
              "text-base leading-relaxed text-foreground",
              "placeholder:text-muted-foreground/70",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            style={{ overflowY: "auto" }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              disabled={!trimmed || isTyping}
              variant={trimmed ? "default" : "secondary"}
              size="icon"
              className={cn(
                "h-9 w-9 rounded-lg",
                trimmed && !isTyping
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              aria-label={chatTranslations("send")}
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConversationPane;

function formatCoverage(coverage?: string) {
  if (!coverage) return "";
  const parts = coverage
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
  if (!parts.length) return "";
  if (parts.length === 1) return `${parts[0]} coverage`;
  const last = parts.pop();
  return `${parts.join(", ")} and ${last} coverage`;
}

function hasBogota(text?: string) {
  if (!text) return false;
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("bogota");
}

interface SourcingStatusMessageProps {
  body: string;
  sources: ProvenanceTag[];
  sourcesLabel: string;
  microSteps?: string[];
  microStepsLabel?: string;
}

function SourcingStatusMessage({
  body,
  sources,
  sourcesLabel,
  microSteps,
  microStepsLabel,
}: SourcingStatusMessageProps) {
  const sourcesTitleId = useId();
  const microStepsTitleId = useId();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-foreground/90">{body}</p>

      <div>
        <span id={sourcesTitleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
          {sourcesLabel}
        </span>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="list"
          aria-labelledby={sourcesTitleId}
        >
          {sources.map((source) => (
            <ProvenanceChip
              key={source}
              provenance={source}
              role="listitem"
              tabIndex={0}
              ariaLabel={`${source} ${sourcesLabel.toLowerCase()}`}
            />
          ))}
        </div>
      </div>

      {microSteps && microSteps.length > 0 ? (
        <div>
          <span id={microStepsTitleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
            {microStepsLabel}
          </span>
          <ol
            className="mt-2 space-y-1 text-xs text-muted-foreground"
            aria-labelledby={microStepsTitleId}
          >
            {microSteps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex items-start gap-2">
                <span className="mt-[6px] inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
                <span className="flex-1 leading-relaxed text-foreground/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
