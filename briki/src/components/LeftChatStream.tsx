"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Composer from "@/components/Chat/Composer";

interface ChatItem {
	id: string;
	role: "broker" | "briki";
	agent?: string; // for briki messages
	content: string;
}

const MOCK_MESSAGES: ChatItem[] = [
	{ id: "m1", role: "broker", content: "Hey Briki, I need options for ACME's renewal — targeting better cyber terms." },
	{ id: "m2", role: "briki", agent: "Sourcing", content: "I can source markets and appetite instantly. Want me to draft outreach?" },
	{ id: "m3", role: "broker", content: "Yes — and include last year’s loss controls and MFA attestation." },
	{ id: "m4", role: "briki", agent: "Compliance", content: "Added required controls. Do you want a sanctions screen on ACME contacts?" },
];

const DEFAULT_ACTIONS = ["Approve", "Edit", "Re-run"] as const;
type ActionLabel = (typeof DEFAULT_ACTIONS)[number];

const ACTION_ARIA_LABELS: Record<ActionLabel, string> = {
	Approve: "Approve agent suggestion",
	Edit: "Edit agent response",
	"Re-run": "Re-run agent workflow",
};

export default function LeftChatStream({ className }: { className?: string }) {
    const [messages, setMessages] = useState<ChatItem[]>(MOCK_MESSAGES);
    const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        bottomSentinelRef.current?.scrollIntoView({ behavior, block: "end" });
    }, []);

    useEffect(() => {
        // Ensure we start at the bottom on mount
        scrollToBottom("auto");
    }, [scrollToBottom]);

    useEffect(() => {
        // Auto-scroll after new messages append
        scrollToBottom("smooth");
    }, [messages, scrollToBottom]);

    function handleSend(text: string) {
        const newItem: ChatItem = {
            id: `m-${Date.now()}`,
            role: "broker",
            content: text,
        };
        setMessages((prev) => [...prev, newItem]);
    }

	return (
		<div className={cn("flex h-screen w-full flex-col", className)}>
			<div className="flex-1 overflow-hidden">
				<div
					ref={scrollContainerRef}
					className="flex h-full flex-col overflow-y-auto px-3"
					role="log"
					aria-live="polite"
					aria-relevant="additions"
				>
					<div className="pt-3 pb-2">
						<h2 className="text-sm font-semibold text-muted-foreground">Conversation</h2>
					</div>
					<div className="flex flex-1 flex-col">
						<div className="flex flex-col gap-3 pb-3">
							{messages.map((m) => (
								<div key={m.id} className={cn("w-full", m.role === "broker" ? "self-start" : "self-stretch")}>
									{m.role === "broker" ? (
										<div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
											<span className="sr-only">Broker:</span>
											{m.content}
										</div>
									) : (
										<Card className="p-3">
											<div className="flex flex-col gap-2">
												<header className="flex items-center gap-2">
													<span
														className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary"
														aria-hidden
													>
														<Image
															src="/brand/briki-logo-2.png"
															alt=""
															width={18}
															height={18}
															className="h-4 w-4 object-contain"
															priority={false}
														/>
														<span className="sr-only">{getAgentInitial(m.agent)}</span>
													</span>
													<div className="flex min-w-0 flex-col">
														<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
															{getAgentLabel(m.agent)}
														</span>
														<span className="truncate text-sm font-semibold leading-tight text-foreground">Briki</span>
													</div>
												</header>
												<p className="break-words text-sm leading-relaxed text-foreground/90">{m.content}</p>
												<nav
													className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground"
													aria-label="Agent actions"
													role="group"
												>
													{DEFAULT_ACTIONS.map((action) => (
														<ActionLink key={`${m.id}-${action}`} label={action} />
													))}
												</nav>
											</div>
										</Card>
									)}
								</div>
							))}
							<div ref={bottomSentinelRef} aria-hidden className="h-0" />
						</div>
					</div>
				</div>
			</div>
			<div className="mt-4 border-t px-3 py-2">
				<Composer onSend={handleSend} placeholder="Type a message. Press Enter to send." />
			</div>
		</div>
	);
}

function ActionLink({ label }: { label: ActionLabel }) {
	return (
		<button
			type="button"
			className="inline-flex items-center justify-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			aria-label={ACTION_ARIA_LABELS[label] ?? `${label} action`}
			onClick={(e) => e.preventDefault()}
			data-inline-action
		>
			{label}
		</button>
	);
}

function getAgentLabel(agent?: string) {
	return agent ? `${agent} Agent` : "Briki Agent";
}

function getAgentInitial(agent?: string) {
	if (!agent) return "B";
	return agent
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}
