import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Trophy, Vote, Star, TrendingUp, Users, ChevronRight, X, 
  Target, Award, BarChart3 
} from "lucide-react";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Trophy,
    title: "Benvenuto in Pagelle FC!",
    description: "L'app per valutare le prestazioni del tuo team di calcetto in modo collaborativo e divertente.",
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: Vote,
    title: "Vota le Partite",
    description: "Dopo ogni partita, valuta i tuoi compagni di squadra. La media dei voti di tutti determina il rating finale.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    extra: (
      <div className="mt-4 p-3 bg-secondary/40 rounded-lg text-sm">
        <span className="font-bold text-primary">Media Partite</span> = La media delle tue prestazioni reali in campo
      </div>
    )
  },
  {
    icon: Star,
    title: "Player Cards",
    description: "Crea carte giocatore stile FIFA! Ogni membro del team valuta gli attributi dei compagni per creare la carta definitiva.",
    color: "text-accent",
    bgColor: "bg-accent/20",
    extra: (
      <div className="mt-4 p-3 bg-secondary/40 rounded-lg text-sm">
        <span className="font-bold text-accent">TOT</span> = Il rating totale della tua carta, basato sul potenziale percepito dal team
      </div>
    )
  },
  {
    icon: BarChart3,
    title: "TOT vs Media: Qual è la differenza?",
    description: "Due metriche diverse per valutarti completamente:",
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    extra: (
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/30">
          <Star className="w-6 h-6 text-accent mt-0.5" />
          <div>
            <p className="font-bold text-accent">TOT (Player Card)</p>
            <p className="text-sm text-muted-foreground">Il tuo potenziale secondo il team. Quanto sei bravo in generale?</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <TrendingUp className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <p className="font-bold text-primary">Media (Partite)</p>
            <p className="text-sm text-muted-foreground">Le tue prestazioni reali. Come stai giocando ultimamente?</p>
          </div>
        </div>
      </div>
    )
  },
  {
    icon: Target,
    title: "Pronto a iniziare?",
    description: "Guarda i badge nella navigazione per sapere cosa devi fare: vota partite e compila le Player Cards dei tuoi compagni!",
    color: "text-primary",
    bgColor: "bg-primary/20",
    extra: (
      <div className="mt-4 flex justify-center gap-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
            <Vote className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-xs text-muted-foreground">Partite da votare</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
            <Star className="w-6 h-6 text-accent" />
          </div>
          <p className="text-xs text-muted-foreground">Cards da compilare</p>
        </div>
      </div>
    )
  },
];

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 shadow-elevation border-border">
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            <X className="w-4 h-4 mr-1" />
            Salta
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className={`w-20 h-20 rounded-2xl ${slide.bgColor} flex items-center justify-center mx-auto mb-6`}
            >
              <slide.icon className={`w-10 h-10 ${slide.color}`} />
            </motion.div>

            {/* Title */}
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground mb-4">
              {slide.description}
            </p>

            {/* Extra content */}
            {slide.extra && (
              <div className="text-left">
                {slide.extra}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 my-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? "w-6 bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <Button className="w-full" size="lg" onClick={handleNext}>
          {currentSlide < slides.length - 1 ? (
            <>
              Avanti
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            "Inizia!"
          )}
        </Button>
      </Card>
    </div>
  );
}