import { Card, CardContent, CardHeader } from '@/components/ui/features-card'
import { Globe, Mail, MessageCircle, FileText, Cloud, BarChart } from 'lucide-react'

export function LandingFeaturesGrid() {
    return (
        <section className="bg-white dark:bg-background pt-8 pb-20 md:pt-12 md:pb-40">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mx-auto grid gap-4 sm:grid-cols-5">
                    <Card className="group overflow-hidden shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-tl-xl transition-transform duration-300 ease-out hover:scale-[1.02]">
                        <CardHeader>
                            <div className="md:p-6">
                                <p className="font-medium">Compare policies in seconds.</p>
                                <p className="text-muted-foreground mt-3 max-w-sm text-sm">Briki extracts and aligns coverage data so you can instantly see what each insurer offers — clear, structured, and side-by-side.</p>
                            </div>
                        </CardHeader>

                        <div className="relative h-fit pl-6 md:pl-12 pb-6 md:pb-12">
                            <div className="overflow-hidden rounded-tl-lg">
                                <img
                                    src="/landing/policy-comparizon.png"
                                    className="w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                                    alt="Briki policy comparison dashboard"
                                    width={1207}
                                    height={929}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="group overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-tr-xl transition-transform duration-300 ease-out hover:scale-[1.02]">
                        <p className="mx-auto my-6 max-w-md text-balance px-6 text-center text-lg font-semibold sm:text-2xl md:p-6">Create your proposal with clarity.</p>
                        <p className="mx-auto max-w-md text-balance px-6 text-center text-sm text-muted-foreground">Briki aligns insurers&apos; coverages side by side so you can compare, adjust, and finalize in minutes.</p>

                        <CardContent className="mt-auto h-fit">
                            <div className="relative mb-6 sm:mb-0">
                                <div className="aspect-76/59 overflow-hidden rounded-r-lg">
                                    <img
                                        src="/landing/Proposalcreation.png"
                                        className="w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                                        alt="Briki proposal creation interface"
                                        width={1207}
                                        height={929}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="group p-6 shadow-black/5 sm:col-span-2 sm:rounded-none sm:rounded-bl-xl md:p-12 transition-transform duration-300 ease-out hover:scale-[1.02]">
                        <p className="mx-auto mb-6 max-w-md text-balance text-center text-lg font-semibold sm:text-2xl">Open Briki anywhere — your broker Copilot.</p>
                        <p className="mx-auto mb-12 max-w-md text-balance text-center text-sm text-muted-foreground">Use the same quick command (control + K) to open Briki&apos;s AI workspace across proposals, chats, or policies.</p>

                        <div className="flex justify-center gap-6">
                            <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 relative flex aspect-square size-16 items-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                                <span className="absolute right-2 top-1 block text-sm">ctrl</span>
                                <BarChart className="mt-auto size-4" />
                            </div>
                            <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 flex aspect-square size-16 items-center justify-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                                <span>K</span>
                            </div>
                        </div>
                    </Card>
                    <Card className="group relative shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-br-xl transition-transform duration-300 ease-out hover:scale-[1.02]">
                        <CardHeader className="p-6 md:p-12">
                            <p className="font-medium">Generate client proposals in seconds.</p>
                            <p className="text-muted-foreground mt-2 max-w-sm text-sm">Briki drafts professional, bilingual proposals directly from analyzed policies — ready to send or download.</p>
                        </CardHeader>
                        <CardContent className="relative h-fit px-6 pb-6 md:px-12 md:pb-12">
                            <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                                <div className="rounded-(--radius) aspect-square border border-dashed"></div>
                                <button 
                                    type="button"
                                    className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-4 hover:bg-muted/70 transition-colors cursor-pointer"
                                    title="Send via email"
                                    aria-label="Send via email"
                                >
                                    <Mail className="size-6 text-foreground/70" strokeWidth={1.5} />
                                </button>
                                <button 
                                    type="button"
                                    className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-4 hover:bg-muted/70 transition-colors cursor-pointer"
                                    title="Send via WhatsApp"
                                    aria-label="Send via WhatsApp"
                                >
                                    <MessageCircle className="size-6 text-foreground/70" strokeWidth={1.5} />
                                </button>
                                <button 
                                    type="button"
                                    className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-4 hover:bg-muted/70 transition-colors cursor-pointer"
                                    title="Export PDF"
                                    aria-label="Export PDF"
                                >
                                    <FileText className="size-6 text-foreground/70" strokeWidth={1.5} />
                                </button>
                                <div className="rounded-(--radius) aspect-square border border-dashed"></div>
                                <button 
                                    type="button"
                                    className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-4 hover:bg-muted/70 transition-colors cursor-pointer"
                                    title="Store in cloud"
                                    aria-label="Store in cloud"
                                >
                                    <Cloud className="size-6 text-foreground/70" strokeWidth={1.5} />
                                </button>
                                <div className="rounded-(--radius) aspect-square border border-dashed"></div>
                                <button 
                                    type="button"
                                    className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-4 hover:bg-muted/70 transition-colors cursor-pointer"
                                    title="Analytics & reports"
                                    aria-label="Analytics & reports"
                                >
                                    <BarChart className="size-6 text-foreground/70" strokeWidth={1.5} />
                                </button>
                                <div className="rounded-(--radius) aspect-square border border-dashed"></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

