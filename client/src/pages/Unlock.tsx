import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle2, ExternalLink, KeyRound, MessageCircle, Mail } from 'lucide-react';
import { PAYMENT_LINKS, UNLOCK_CONTACT, UNLOCK_PRICE_EUR, PAYWALL_ENABLED } from '@/config/features';
import { redeemCode } from '@/lib/unlockCodes';
import { motion } from 'framer-motion';

export default function Unlock() {
  const { user, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;
  if (!PAYWALL_ENABLED || user.hasPaid) return <Navigate to="/" replace />;

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode(code, user.id)) {
      toast({ title: 'Codice non valido', description: 'Verifica e riprova.', variant: 'destructive' });
      return;
    }
    updateCurrentUser({ hasPaid: true, paidAt: new Date().toISOString() });
    toast({ title: 'App sbloccata!', description: 'Benvenuto nella versione completa.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-6">
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-3xl">Sblocca Pagelle FC</CardTitle>
            <CardDescription>Pagamento una tantum di €{UNLOCK_PRICE_EUR.toFixed(2)} — accesso illimitato a vita</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-display font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" /> Cosa ottieni</h3>
              <ul className="space-y-2 text-sm text-muted-foreground pl-7">
                <li>✅ Voti partite illimitati</li>
                <li>✅ Player Cards collaborative</li>
                <li>✅ Statistiche avanzate e confronti</li>
                <li>✅ Storico partite completo</li>
                <li>✅ Gestione team e meteo integrato</li>
              </ul>
            </div>

            <div className="border-t border-border pt-6 space-y-3">
              <h3 className="font-display font-bold">Come funziona</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                <li>Effettua il pagamento di €{UNLOCK_PRICE_EUR.toFixed(2)} con uno dei metodi qui sotto</li>
                <li>Contattami su WhatsApp o email indicando la tua email account</li>
                <li>Riceverai un codice di sblocco da inserire qui sotto</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button asChild variant="outline"><a href={PAYMENT_LINKS.paypal} target="_blank" rel="noopener noreferrer">PayPal <ExternalLink className="w-3 h-3" /></a></Button>
              <Button asChild variant="outline"><a href={PAYMENT_LINKS.revolut} target="_blank" rel="noopener noreferrer">Revolut <ExternalLink className="w-3 h-3" /></a></Button>
              <Button asChild variant="outline"><a href={PAYMENT_LINKS.satispay} target="_blank" rel="noopener noreferrer">Satispay <ExternalLink className="w-3 h-3" /></a></Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="secondary"><a href={UNLOCK_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" /> WhatsApp</a></Button>
              <Button asChild variant="secondary"><a href={UNLOCK_CONTACT.email}><Mail className="w-4 h-4" /> Email</a></Button>
            </div>

            <form onSubmit={handleRedeem} className="space-y-3 border-t border-border pt-6">
              <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Inserisci il tuo codice di sblocco</Label>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="UNLOCK-XXXXXX" className="font-mono uppercase tracking-wider" />
                <Button type="submit">Sblocca</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
