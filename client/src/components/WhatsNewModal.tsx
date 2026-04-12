import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Sparkles, TrendingUp, Wrench, X, ChevronRight, ChevronLeft, Megaphone,
} from "lucide-react";
import type { WhatsNewRelease, WhatsNewItem } from "@/data/whats-new-data";

interface WhatsNewModalProps {
    releases: WhatsNewRelease[];
    onDismiss: () => void;
}

const typeConfig: Record<WhatsNewItem["type"], { icon: typeof Sparkles; color: string; bgColor: string; label: string }> = {
    feature: { icon: Sparkles, color: "text-green-500", bgColor: "bg-green-500/15", label: "Novità" },
    improvement: { icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500/15", label: "Miglioramento" },
    fix: { icon: Wrench, color: "text-red-500", bgColor: "bg-red-500/15", label: "Fix" },
};

export function WhatsNewModal({ releases, onDismiss }: WhatsNewModalProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const hasMultiplePages = releases.length > 1;
    const release = releases[currentPage];

    const handleNext = () => {
        if (currentPage < releases.length - 1) {
            setCurrentPage(currentPage + 1);
        } else {
            onDismiss();
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (!release) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 shadow-elevation border-border">
                {/* Header: skip + badge */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground font-medium">
                        {release.date}
                        {hasMultiplePages && ` · ${currentPage + 1}/${releases.length}`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={onDismiss}>
                        <X className="w-4 h-4 mr-1" />
                        Chiudi
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={release.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {/* Title section */}
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                                className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4"
                            >
                                <Megaphone className="w-8 h-8 text-primary" />
                            </motion.div>
                            <h2 className="font-display text-xl font-bold text-foreground">
                                {release.title}
                            </h2>
                        </div>

                        {/* Items list */}
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                            {release.items.map((item, idx) => {
                                const config = typeConfig[item.type];
                                const Icon = config.icon;
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 + idx * 0.08 }}
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} border-transparent`}
                                    >
                                        <div className={`mt-0.5 ${config.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <p className="text-sm text-foreground mt-0.5">{item.text}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Progress dots (only if multiple releases) */}
                {hasMultiplePages && (
                    <div className="flex justify-center gap-2 mt-5">
                        {releases.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentPage ? "w-6 bg-primary" : "bg-muted"
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Navigation */}
                <div className={`flex gap-3 mt-5 ${hasMultiplePages && currentPage > 0 ? "" : ""}`}>
                    {hasMultiplePages && currentPage > 0 && (
                        <Button variant="outline" size="lg" onClick={handlePrev} className="flex-1">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Indietro
                        </Button>
                    )}
                    <Button className="flex-1" size="lg" onClick={handleNext}>
                        {currentPage < releases.length - 1 ? (
                            <>
                                Avanti
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </>
                        ) : (
                            "Ho capito!"
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
