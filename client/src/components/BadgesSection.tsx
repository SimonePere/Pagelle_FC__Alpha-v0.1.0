import { motion } from "framer-motion";
import { Award, Star, Target, Zap, Crown, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const badges = [
  { icon: Crown, name: "MVP", description: "Miglior giocatore", unlocked: false },
  { icon: Star, name: "Stella", description: "5 partite con voto 8+", unlocked: false },
  { icon: Target, name: "Cecchino", description: "10 gol totali", unlocked: false },
  { icon: Zap, name: "Velocità", description: "3 assist in una partita", unlocked: false },
  { icon: Trophy, name: "Campione", description: "Media voto 7+", unlocked: false },
  { icon: Award, name: "Veterano", description: "20 partite giocate", unlocked: false },
];

export function BadgesSection() {
  return (
    <Card className="gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Obiettivi e Badge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-300
                ${
                  badge.unlocked
                    ? "bg-primary/10 border-primary shadow-glow"
                    : "bg-muted/20 border-border/30 opacity-50 grayscale"
                }
              `}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <badge.icon
                  className={`w-8 h-8 ${badge.unlocked ? "text-primary" : "text-muted-foreground"}`}
                />
                <div>
                  <div className="font-display font-bold text-sm">{badge.name}</div>
                  <div className="text-xs text-muted-foreground">{badge.description}</div>
                </div>
              </div>
              {!badge.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                  <span className="text-xs font-semibold text-muted-foreground">🔒 Bloccato</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
