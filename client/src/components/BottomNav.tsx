import { Home, PlusCircle, User, Trophy, BarChart3, Vote, Clock, Star, FileText, Shield } from "lucide-react";
import { NavLink } from "./NavLink";
import { motion } from "framer-motion";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { useEffect, useState } from "react";
import { PlayerCard } from "@/types/playerCard";
import { hasUserSubmitted as hasUserSubmittedCard } from "@/utils/playerCardCalculations";
import { Badge } from "@/components/ui/badge";
import { useActiveTeamId } from "@/hooks/useActiveTeamId";

// Eliminare hover su navbar, perche fa sbagliare le larghezze dei bottoni su mobile

export function BottomNav() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isGuest = useSelector((state: RootState) => state.auth.isGuest);
  const { activeTeamId } = useActiveTeamId();
  const [pendingVotesCount, setPendingVotesCount] = useState(0);
  const [pendingCardsCount, setPendingCardsCount] = useState(0);

  useEffect(() => {
    if (!user || !user.teams?.length) return;

    const updatePendingCounts = () => {
      // Future: VotingSession integration will calculate pending counts
      setPendingVotesCount(0);

      // Count player cards pending user's vote
      const playerCards: PlayerCard[] = JSON.parse(localStorage.getItem('playerCards') || '[]');
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      // Get user team ID
      const userTeamId = activeTeamId;
      if (!userTeamId) return;

      const teamMembers = users.filter((u: any) => u.teamId === userTeamId);

      let pendingCards = 0;
      teamMembers.forEach((member: any) => {
        if (member.id === user._id) return;
        const card = playerCards.find(c => c.playerId === member.id && c.teamId === userTeamId);
        if (!card || !hasUserSubmittedCard(card, user._id)) {
          pendingCards++;
        }
      });
      setPendingCardsCount(pendingCards);
    };

    updatePendingCounts();
    const interval = setInterval(updatePendingCounts, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const allNavItems = [
    { icon: Home, label: "Home", path: "/", guestAllowed: true },
    { icon: Vote, label: "Vota", path: "/vote", showVoteBadge: true, guestAllowed: true },
    { icon: FileText, label: "Storico", path: "/history", showVoteBadge: true, guestAllowed: true },
    { icon: Star, label: "Cards", path: "/player-cards", showCardsBadge: true, guestAllowed: false },
    { icon: Shield, label: "Team", path: "/team", showCardsBadge: true, guestAllowed: false },
  ];

  const navItems = isGuest ? allNavItems.filter(i => i.guestAllowed) : allNavItems;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-elevation" style={{
        paddingBottom: 'env(safe-area-inset-bottom)' /* iOS safe area */
      }}    >
      <div className="flex items-center justify-around px-1 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 p-2 transition-all duration-300 relative flex-1"
            activeClassName=""
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  <item.icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.showVoteBadge && pendingVotesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    >
                      {pendingVotesCount}
                    </Badge>
                  )}
                  {item.showCardsBadge && pendingCardsCount > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-accent text-accent-foreground"
                    >
                      {pendingCardsCount}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
        {/* Profilo solo per utenti full */}
        {!isGuest && (
          <NavLink
            to="/profile"
            className="flex flex-col items-center gap-1 p-2 transition-all duration-300 relative flex-1"
            activeClassName=""
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1">
                <User className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  Profilo
                </span>
              </div>
            )}
          </NavLink>
        )}


      </div>
    </motion.nav>
  );
}
