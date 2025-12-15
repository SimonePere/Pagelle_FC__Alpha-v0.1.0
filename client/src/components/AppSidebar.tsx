import { Home, PlusCircle, User, Trophy, LogOut, History, BarChart3, Vote, Clock, Star, FileText, Archive } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { logout } from '@/redux/slices/authSlice';
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Vota Partite", url: "/vote", icon: Vote, showVoteBadge: true },
  { title: "Storico", url: "/history", icon: FileText }, // Alternative: Archive
  { title: "Statistiche", url: "/stats", icon: BarChart3, inDevelopment: true },
  { title: "Player Cards", url: "/player-cards", icon: Star, showCardsBadge: true },
  { title: "Crea Partita", url: "/create-match", icon: PlusCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const [pendingVotesCount, setPendingVotesCount] = useState(0);
  const [pendingCardsCount, setPendingCardsCount] = useState(0);

  useEffect(() => {
    // Future: VotingSession integration will calculate pending counts
    setPendingVotesCount(0);
    setPendingCardsCount(0);
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Sidebar
      className="transition-all duration-300 border-r border-sidebar-border"
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar">
        {/* Logo - Clickable to Home */}
        <div className={`p-6 border-b border-sidebar-border transition-all ${isCollapsed ? 'px-3' : ''}`}>
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => navigate('/')}
            title="Vai alla Home"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-display text-xl font-bold text-sidebar-foreground">
                  Football Ledger
                </h1>
                <p className="text-xs text-sidebar-muted-foreground">
                  Gestione Squadra
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Info - Clickable to Profile */}
        <div className={`px-6 py-4 border-b border-sidebar-border transition-all ${isCollapsed ? 'px-3' : ''}`}>
          {user && (
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => navigate('/profile')}
              title="Vai al Profilo"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 animate-fade-in">
                  <p className="font-medium text-sidebar-foreground text-sm">
                    {user.name}
                  </p>
                  <p className="text-xs text-sidebar-muted-foreground">
                    Team: {user.teams?.[0]?.name || user.teamName || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.inDevelopment}
                    size="lg"
                    className={`${isCollapsed
                      ? 'justify-center px-3'
                      : 'justify-start px-3'
                      } transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group ${item.inDevelopment ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    disabled={item.inDevelopment}
                  >
                    <div>
                      {item.inDevelopment ? (
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="w-5 h-5 text-sidebar-foreground/50 shrink-0" />
                          {!isCollapsed && (
                            <span className="font-medium text-sidebar-foreground/50 animate-fade-in">
                              {item.title}
                            </span>
                          )}
                          {!isCollapsed && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-xs px-2 py-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                            >
                              In Sviluppo
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <NavLink to={item.url}>
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className="w-5 h-5 text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground shrink-0" />
                            {!isCollapsed && (
                              <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground animate-fade-in">
                                {item.title}
                              </span>
                            )}
                            {!isCollapsed && (
                              <>
                                {item.showVoteBadge && pendingVotesCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-auto text-xs px-2 py-1 bg-destructive text-destructive-foreground animate-pulse"
                                  >
                                    {pendingVotesCount}
                                  </Badge>
                                )}
                                {item.showCardsBadge && pendingCardsCount > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-auto text-xs px-2 py-1 bg-accent text-accent-foreground animate-pulse"
                                  >
                                    {pendingCardsCount}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </NavLink>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* App Info & Credits */}
        {!isCollapsed && (
          <div className="mt-auto px-6 py-4 border-t border-sidebar-border">
            <div className="space-y-3">
              {/* Version Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-sidebar-muted-foreground">Versione</span>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                  Alpha v0.1.0
                </Badge>
              </div>

              {/* Alpha Testing Notice */}
              <div className="text-xs text-sidebar-muted-foreground text-center py-2 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                🧪 App in fase Alpha<br />
                Gruppo ristretto di tester
              </div>

              {/* Creator Info */}
              <div className="space-y-2">
                <p className="text-xs text-sidebar-muted-foreground">Creato da</p>
                <div className="text-xs">
                  <p className="font-medium text-sidebar-foreground">Simone Mele</p>
                  <div className="flex gap-2 mt-1">
                    <a
                      href="https://github.com/SimonePere"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      GitHub
                    </a>
                    <span className="text-sidebar-muted-foreground">•</span>
                    <a
                      href="https://simone-mele-portfolio.web.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      Portfolio
                    </a>
                  </div>
                </div>
              </div>

              {/* Copyright */}
              <div className="text-xs text-sidebar-muted-foreground text-center pt-2 border-t border-sidebar-border">
                © 2025 Simone Mele<br />
                Tutti i diritti riservati
              </div>

              {/* Technical Info */}
              <div className="text-xs text-sidebar-muted-foreground">
                <div className="flex justify-between">
                  <span>Build:</span>
                  <span className="font-mono">15.12.2025</span>
                </div>
                <div className="flex justify-between">
                  <span>Env:</span>
                  <span className="font-mono text-green-600 dark:text-green-400">DEV</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Theme Toggle & Logout */}
        <div className={`mt-auto p-6 border-t border-sidebar-border space-y-3 transition-all ${isCollapsed ? 'px-3' : ''}`}>
          {!isCollapsed && <ThemeToggle />}

          <Button
            onClick={handleLogout}
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            className={`${isCollapsed
              ? 'w-10 h-10'
              : 'w-full justify-start'
              } text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}