import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Match } from '@/types/match';
import { Calendar, Trophy, MapPin, Users, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MatchCardProps {
  match: Match;
  currentUserId?: string;
  showActions?: boolean;
}

export default function MatchCard({ match, showActions = true }: MatchCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-green-50';
      case 'active':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {match.field}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(match.date).toLocaleDateString('it-IT')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {match.teamMemberIds?.length || 0} giocatori
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {match.playersCount} vs {match.playersCount}
              </span>
            </div>
          </div>
          <Badge className={getStatusColor(match.status)}>
            {match.status === 'completed' ? 'Completata' : 'In Corso'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {match.notes && (
            <p className="text-sm text-muted-foreground bg-secondary/40 p-2 rounded">
              {match.notes}
            </p>
          )}
          
          {/* Future: VotingSession integration will show voting status here */}
          <div className="text-center py-2 text-muted-foreground text-xs">
            Sistema di votazione in sviluppo
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => navigate(`/matches/${match.id}`)}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Dettagli
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}