import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { NewsItem } from "@/types/news";

interface FakeNewsProps {
  news?: NewsItem[];
  autoRotate?: boolean;
  rotationInterval?: number;
}

export function FakeNews({ news = [], autoRotate = true, rotationInterval = 8000 }: FakeNewsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔍 DEBUG: Log delle news ricevute
  console.log('🔍 FakeNews DEBUG - news ricevute:', news);
  console.log('🔍 FakeNews DEBUG - news.length:', news?.length);

  // Ordina news per priorità:  urgent > high > medium > low
  const sortedNews = [...news].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Auto-rotate tra le news se ce ne sono multiple
  useEffect(() => {
    if (sortedNews.length > 1 && autoRotate) {
      const timer = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % sortedNews.length);
      }, rotationInterval);

      return () => clearInterval(timer);
    }
  }, [sortedNews.length, autoRotate, rotationInterval]);

  // Reset index quando cambiano le news
  useEffect(() => {
    setCurrentIndex(0);
  }, [news]);

  // Fallback se non ci sono news
  if (sortedNews.length === 0) {
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
              className="text-muted-foreground leading-relaxed"
            >
              🌟 Nessuna news al momento... Ma tieni d'occhio questo spazio per gli ultimi aggiornamenti dal campo!
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const currentNews = sortedNews[currentIndex];

  // Funzione per ottenere la classe CSS basata sullo style
  const getStyleClass = (style: string) => {
    switch (style) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-foreground';
    }
  };

  // Funzione per ottenere colore del border basato sullo style  
  const getBorderClass = (style: string) => {
    switch (style) {
      case 'success':
        return 'border-green-400/30';
      case 'warning':
        return 'border-yellow-400/30';
      case 'info':
        return 'border-blue-400/30';
      default:
        return 'border-border/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className={`gradient-card shadow-card bg-gradient-to-br from-primary/5 to-accent/5 ${getBorderClass(currentNews.style)}`}>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            {/* Icona dinamica dalla news */}
            <span className="text-2xl">{currentNews.icon}</span>
            Flash News
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            {/* Badge priorità per news high */}
            {currentNews.priority === 'high' && (
              <span className="ml-auto px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-400/30">
                BREAKING
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {/* Contenuto news con animazione */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={`leading-relaxed ${getStyleClass(currentNews.style)}`}
            >
              {currentNews.text}
            </motion.p>
          </AnimatePresence>

          {/* Indicatori dots se ci sono multiple news */}
          {sortedNews.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {sortedNews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex
                    ? 'bg-primary scale-125'
                    : 'bg-gray-400/50 hover:bg-gray-400/80'
                    }`}
                />
              ))}
            </div>
          )}

          {/* Badge categoria bottom-right */}
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 text-xs bg-background/80 text-muted-foreground rounded border border-border/50">
              {currentNews.category.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
