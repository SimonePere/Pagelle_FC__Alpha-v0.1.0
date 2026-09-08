import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { DemoBanner } from "@/components/DemoBanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { userAvatarUrl } from '@/utils/avatarUrl';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const isGuest = useSelector((state: RootState) => state.auth.isGuest);
  const canPromoteToPlayer = !!user?.canPromoteToPlayer;
  const navigate = useNavigate();

  const handleGuestRegister = () => {
    navigate('/promote-guest');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative">
        {/* Subtle pitch pattern overlay */}
        <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 80px, hsl(142 20% 15% / 0.03) 80px, hsl(142 20% 15% / 0.03) 81px)',
        }}></div>
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Mobile header */}
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="lg:hidden sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-foreground">
                  <Menu className="w-6 h-6" />
                </SidebarTrigger>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/')}
                  className="focus:outline-none"
                >
                  <h1 className="font-display text-xl font-bold text-foreground hover:text-primary transition-colors">
                    Pagelle FC
                  </h1>
                </motion.button>
              </div>
              {user && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate('/profile')}
                  className="focus:outline-none"
                >
                  <Avatar className="w-9 h-9 rounded-lg border-2 border-primary/30">
                    <AvatarImage src={userAvatarUrl(user)} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-xs">
                      {(user.name || '').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* Desktop header with user icon */}
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="hidden lg:block sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md"
          >
            <div className="flex items-center justify-end p-4 px-8">
              {user && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate('/profile')}
                  className="focus:outline-none"
                >
                  <Avatar className="w-10 h-10 rounded-lg border-2 border-primary/30">
                    <AvatarImage src={userAvatarUrl(user)} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-xs">
                      {(user.name || '').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* Barra demo — stessa posizione del banner ospite, sotto l'header.
              Non usa `fixed` per non coprire la BottomNav su mobile. */}
          <DemoBanner />

          {/* Banner ospite — mobile + desktop, sotto l'header */}
          {isGuest && (
            <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between gap-3 text-xs text-orange-700 dark:text-orange-300 sticky top-0 z-40">
              <span>🎭 Sei in modalità ospite — alcune funzioni non sono disponibili</span>
              {canPromoteToPlayer && (
                <button
                  className="underline font-medium shrink-0"
                  onClick={handleGuestRegister}
                >
                  Registrati
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-auto"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)', /* Bottom nav + safe area */
              paddingTop: '1rem' /* Space from top header */
            }}
          >
            <div className="lg:hidden h-4"></div> {/* Extra mobile spacing */}
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
