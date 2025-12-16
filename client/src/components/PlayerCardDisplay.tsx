import { motion } from "framer-motion";
import { PlayerAttributes } from "@/types/playerCard";
import { calculateOverallRating } from "@/utils/playerCardCalculations";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PlayerCardDisplayProps {
  playerName: string;
  attributes: PlayerAttributes;
  isPreview?: boolean;
}

export function PlayerCardDisplay({ playerName, attributes, isPreview = false }: PlayerCardDisplayProps) {
  const overall = calculateOverallRating(attributes);

  const getOverallColor = (rating: number) => {
    if (rating >= 80) return "text-green-500";
    if (rating >= 70) return "text-yellow-500";
    if (rating >= 60) return "text-orange-500";
    return "text-red-500";
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < count ? "fill-primary text-primary" : "text-muted"}
      />
    ));
  };

  const AttributeBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`gradient-card border-border/50 shadow-card ${isPreview ? 'p-4' : 'p-6'}`}>
        {/* Header with prominent TOT */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">TOT</div>
            <div className={`font-display ${isPreview ? 'text-4xl' : 'text-5xl'} font-black ${getOverallColor(overall)} mb-2 leading-none`}>
              {overall}
            </div>
            <div className="text-sm text-muted-foreground font-medium">{attributes.position}</div>
          </div>
          <div className="text-right flex-1 ml-4">
            <div className={`font-display ${isPreview ? 'text-lg' : 'text-xl'} font-bold text-foreground mb-1`}>
              {playerName}
            </div>
            <div className="text-xs text-muted-foreground">{attributes.preferredRole}</div>
            <div className="text-xs text-muted-foreground mt-1">Età: {attributes.age}</div>
          </div>
        </div>

        {/* Attributes */}
        <div className="space-y-3 mb-4">
          <AttributeBar label="TIR (Tiro)" value={attributes.shooting} />
          <AttributeBar label="PAS (Passaggio)" value={attributes.passing} />
          <AttributeBar label="DRI (Dribbling)" value={attributes.dribbling} />
          <AttributeBar label="FIN (Finalizzazione)" value={attributes.finalizzazione} />
          <AttributeBar label="VIS (Visione)" value={attributes.visione} />
          <AttributeBar label="RES (Resistenza)" value={attributes.stamina} />
          <AttributeBar label="FOR (Forza)" value={attributes.strength} />
        </div>

        {/* Star Ratings */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Piede Debole</div>
            <div className="flex gap-0.5">{renderStars(attributes.weakFoot)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Skill</div>
            <div className="flex gap-0.5">{renderStars(attributes.skillMoves)}</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
