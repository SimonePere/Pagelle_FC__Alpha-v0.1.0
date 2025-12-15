import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

interface PlayerRadarChartProps {
  data: Array<{
    attribute: string;
    value: number;
    fullMark: number;
  }>;
  playerName: string;
  color?: string;
}

export function PlayerRadarChart({ data, playerName, color = "hsl(var(--primary))" }: PlayerRadarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="gradient-card rounded-lg border border-border/50 p-6 shadow-card"
    >
      <h3 className="font-display text-xl font-bold text-foreground mb-4 text-center">{playerName}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="attribute" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Radar
            name={playerName}
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.6}
            animationDuration={1500}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
