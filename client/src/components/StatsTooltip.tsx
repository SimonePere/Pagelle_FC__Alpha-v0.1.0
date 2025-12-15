import { HelpCircle, Star, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatsTooltipProps {
  type: "tot" | "media";
}

export function StatsTooltip({ type }: StatsTooltipProps) {
  const content = type === "tot" ? {
    icon: Star,
    title: "TOT - Player Card",
    description: "Il tuo punteggio totale basato sulla Player Card. Rappresenta il tuo potenziale percepito dal team, calcolato dalla media delle valutazioni dei tuoi compagni sui tuoi attributi (tecnica, fisico, ecc.).",
    color: "text-accent",
  } : {
    icon: TrendingUp,
    title: "Media - Prestazioni",
    description: "La media dei voti ricevuti nelle partite giocate. Rappresenta le tue prestazioni reali in campo, quanto stai rendendo effettivamente.",
    color: "text-primary",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center rounded-full hover:bg-secondary/50 p-1 transition-colors">
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4">
          <div className="flex items-start gap-3">
            <div className={`${content.color}`}>
              <content.icon className="w-5 h-5" />
            </div>
            <div>
              <p className={`font-bold ${content.color} mb-1`}>{content.title}</p>
              <p className="text-sm text-muted-foreground">{content.description}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}