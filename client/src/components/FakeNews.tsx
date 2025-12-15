import { motion } from "framer-motion";
import { Newspaper, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const newsTemplates = [
  "🔥 Prestazione straordinaria! La squadra ha dominato dal primo all'ultimo minuto!",
  "⚡ Un'altra vittoria nel carniere! Il trio si conferma imbattibile!",
  "🎯 Che spettacolo! Gol e assist a ripetizione, il pubblico è in delirio!",
  "🌟 Performance da applausi! I nostri campioni continuano a stupire!",
  "💪 Nessuno può fermarli! La squadra dimostra ancora una volta il suo valore!",
];

interface FakeNewsProps {
  matchData?: {
    opponent: string;
    avgRating: number;
    totalGoals: number;
  };
}

export function FakeNews({ matchData }: FakeNewsProps) {
  const getNews = () => {
    if (!matchData) return newsTemplates[0];
    
    if (matchData.avgRating >= 8) {
      return `🔥 INCREDIBILE! Vittoria schiacciante contro ${matchData.opponent}! La squadra ha brillato con una media voto di ${matchData.avgRating.toFixed(1)} e ${matchData.totalGoals} gol!`;
    } else if (matchData.avgRating >= 7) {
      return `⚡ Ottima prestazione contro ${matchData.opponent}! Media voto ${matchData.avgRating.toFixed(1)}, i nostri ragazzi continuano a crescere!`;
    } else if (matchData.avgRating >= 6) {
      return `💪 Vittoria sofferta ma meritata contro ${matchData.opponent}. La squadra dimostra carattere!`;
    } else {
      return `🌟 Match difficile contro ${matchData.opponent}, ma c'è margine di miglioramento per la prossima!`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="gradient-card border-border/50 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            Flash News
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-foreground leading-relaxed"
          >
            {getNews()}
          </motion.p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
