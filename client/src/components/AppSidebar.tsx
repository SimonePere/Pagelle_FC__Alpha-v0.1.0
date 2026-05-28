import { Home, PlusCircle, User, Trophy, LogOut, History, BarChart3, Vote, Clock, Star, FileText, Archive, Shield, Github, Linkedin, Instagram, Coffee, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SupportModal } from "@/components/SupportModal";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { logout } from '@/redux/slices/authSlice';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';
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

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  guestAllowed: boolean;
  showVoteBadge?: boolean;
  showCardsBadge?: boolean;
  inDevelopment?: boolean;
};

const allNavItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home, guestAllowed: true },
  { title: "Vota Partite", url: "/vote", icon: Vote, showVoteBadge: true, guestAllowed: true },
  { title: "Storico", url: "/history", icon: FileText, guestAllowed: false },
  // { title: "Statistiche", url: "/stats", icon: BarChart3, inDevelopment: true, guestAllowed: false }, // [DISABILITATO]
  { title: "Player Cards", url: "/player-cards", icon: Star, showCardsBadge: true, guestAllowed: false },
  { title: "Crea Partita", url: "/create-match", icon: PlusCircle, guestAllowed: false },
  { title: "Team", url: "/team", icon: Shield, guestAllowed: false },
  { title: "Awards", url: "/test-awards", icon: Trophy, guestAllowed: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useSelector((state: RootState) => state.auth);
  const isGuest = useSelector((state: RootState) => state.auth.isGuest);
  const canPromoteToPlayer = useSelector((state: RootState) => !!state.auth.user?.canPromoteToPlayer);
  const { activeTeam } = useActiveTeamId();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const [pendingVotesCount, setPendingVotesCount] = useState(0);
  const [pendingCardsCount, setPendingCardsCount] = useState(0);

  const navItems = isGuest ? allNavItems.filter(i => i.guestAllowed) : allNavItems;

  useEffect(() => {
    // Future: VotingSession integration will calculate pending counts
    setPendingVotesCount(0);
    setPendingCardsCount(0);
  }, [user]);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
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
            <div className="w-10 h-10 rounded-sm bg-gradient-primary flex items-center justify-center overflow-hidden shadow-glow">
              <img src="/FLAT_BG_W.png" alt="Pagelle FC Logo" className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-display text-xl font-bold text-sidebar-foreground">
                  Pagelle FC                </h1>

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
                    Team: {activeTeam?.name || user.teamName || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Banner guest */}
        {isGuest && !isCollapsed && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs text-orange-700 dark:text-orange-300">
            <p className="font-semibold mb-1">Modalità Ospite</p>
            <p className="text-orange-600/80 dark:text-orange-400/80 mb-2">Alcune funzioni non sono disponibili.</p>
            {canPromoteToPlayer && (
              <button
                onClick={() => { navigate('/promote-guest'); }}
                className="underline font-medium hover:no-underline"
              >
                Registrati per l'accesso completo →
              </button>
            )}
          </div>
        )}

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
                      <NavLink to={item.url} className="flex items-center gap-3 w-full">
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
                      </NavLink>
                    )}
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
                <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800">
                  Beta
                </Badge>
              </div>

              {/* Creator Info */}
              <div className="space-y-2">
                <p className="text-xs text-sidebar-muted-foreground">Creato da</p>
                <div className="text-xs">
                  <p className="font-medium text-sidebar-foreground">Simone Mele</p>
                  <div className="flex gap-3 mt-2">
                    <a
                      href="https://github.com/SimonePere"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GitHub"
                      className="text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/simone-mele/"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn"
                      className="text-sidebar-muted-foreground hover:text-blue-500 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a
                      href="https://www.instagram.com/pagellefc?igsh=MW1lajQxNmUxNDAzZg=="
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="text-sidebar-muted-foreground hover:text-pink-500 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Buy Me a Coffee */}
              <button
                onClick={() => setSupportModalOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-left"
              >
                <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 leading-tight">
                  Offrimi un caffè
                </span>
              </button>

              {/* Copyright */}
              <div className="text-xs text-sidebar-muted-foreground text-center pt-2 border-t border-sidebar-border">
                © 2026 Simone Mele<br />
                Tutti i diritti riservati
              </div>

              {/* Technical Info */}
              {/* <div className="text-xs text-sidebar-muted-foreground">
                <div className="flex justify-between">
                  <span>Build:</span>
                  <span className="font-mono">15.12.2026</span>
                </div>
                <div className="flex justify-between">
                  <span>Env:</span>
                  <span className="font-mono text-green-600 dark:text-green-400">DEV</span>
                </div>
              </div> */}
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

      {/* Dialog conferma logout */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-xs rounded-xl p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <LogOut className="w-4 h-4 text-destructive" />
              Conferma Logout
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3">
            <p className="text-sm text-muted-foreground">Sei sicuro di voler uscire dal tuo account?</p>
          </div>
          <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-sm"
              onClick={() => setLogoutDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmLogout}
            >
              Esci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />
    </Sidebar>
  );
}