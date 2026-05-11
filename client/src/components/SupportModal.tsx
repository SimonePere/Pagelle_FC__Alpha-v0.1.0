import { Coffee, Server, Zap, Heart, Github, Linkedin, Instagram, ExternalLink } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SupportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
    const handleKofiClick = () => {
        window.open("https://ko-fi.com/simonemele", "_blank", "noopener,noreferrer");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-0 gap-0 overflow-hidden max-h-[90dvh] flex flex-col">

                {/* Header con gradiente */}
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-5 pt-4 pb-3 text-white shrink-0">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-bold">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Coffee className="w-4 h-4 text-white" />
                            </div>
                            Supporta Pagelle FC
                        </DialogTitle>
                    </DialogHeader>
                    <p className="mt-1.5 text-xs text-amber-50/90 leading-snug">
                        Un progetto nato per passione e amicizia, tenuto vivo dai caffè.
                    </p>
                </div>

                <div className="px-5 py-4 space-y-4 overflow-y-auto">

                    {/* Storia del progetto */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Il progetto</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">
                            Pagelle FC nasce da centinaia di partite tra amici: io, Davide mio fratello, Gabri e mio Papà.
                        </p>
                        <p className="text-sm text-muted-foreground leading-snug">
                            Giochiamo insieme e ci prendiamo in giro a suon di voti.

                        </p>
                        <p className="text-sm text-muted-foreground leading-snug">
                            Da quella voglia di divertirci nasce questa app.
                        </p>
                        <p className="text-sm text-muted-foreground leading-snug"> Se ti va, parlane con i tuoi amici — il passaparola è il modo più bello per farla crescere!
                        </p>
                    </div>

                    {/* A cosa servono i fondi */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">A cosa serve il tuo supporto</h3>
                        </div>
                        <ul className="space-y-1">
                            <li className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-1" />
                                <span>Costi server (Railway + MongoDB) — ~€10–15/mese</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-1" />
                                <span>Sviluppare nuove funzionalità</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-1" />
                                <span>Tenere l'app accessibile a tutti</span>
                            </li>
                        </ul>
                        <p className="text-xs text-muted-foreground/60">
                            Anche un solo caffè fa la differenza — grazie mille 🙏
                        </p>
                    </div>

                    {/* CTA principale */}
                    <Button
                        onClick={handleKofiClick}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-sm gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <Coffee className="w-4 h-4" />
                        Supportami su Ko-fi
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </Button>

                    {/* Footer con creator info */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-border">
                        <div>
                            <p className="text-xs font-medium text-foreground">Simone Mele</p>
                            <p className="text-xs text-muted-foreground">Creator & Developer</p>
                        </div>
                        <div className="flex gap-3">
                            <a
                                href="https://github.com/SimonePere"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="GitHub"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Github className="w-4 h-4" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/simone-mele/"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="LinkedIn"
                                className="text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                                <Linkedin className="w-4 h-4" />
                            </a>
                            <a
                                href="https://www.instagram.com/pagellefc?igsh=MW1lajQxNmUxNDAzZg=="
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Instagram"
                                className="text-muted-foreground hover:text-pink-500 transition-colors"
                            >
                                <Instagram className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
