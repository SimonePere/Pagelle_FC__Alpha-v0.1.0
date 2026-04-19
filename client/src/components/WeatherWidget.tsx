import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentWeather, WeatherSnapshot } from '@/lib/weather';
import { useAppSelector } from '@/hooks/redux hooks/redux hooks';
import { MapPin, Loader2 } from 'lucide-react';

export function WeatherWidget() {
  const user = useAppSelector((state) => state.auth.user);
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const city = user?.teams?.[0]?.city;

  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getCurrentWeather(city)
      .then(setData)
      .finally(() => setLoading(false));
  }, [city]);

  if (!city) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm text-foreground">Imposta la città del campo</p>
            <Link to="/team" className="text-xs text-primary hover:underline">Vai al Team →</Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border">
      <CardContent className="p-4 flex items-center gap-3">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : data ? (
          <>
            <span className="text-3xl" aria-hidden>{data.icon}</span>
            <div className="flex-1">
              <p className="text-2xl font-display font-bold text-foreground leading-none">
                {data.temperatureC}°C
              </p>
              <p className="text-xs text-muted-foreground">{data.description} · {data.city}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Meteo non disponibile</p>
        )}
      </CardContent>
    </Card>
  );
}
