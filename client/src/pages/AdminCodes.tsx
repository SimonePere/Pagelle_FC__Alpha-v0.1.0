import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_EMAILS } from '@/config/features';
import { generateUnlockCode, getAllCodes, UnlockCode } from '@/lib/unlockCodes';
import { Copy, Plus, ShieldCheck } from 'lucide-react';

export default function AdminCodes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [codes, setCodes] = useState<UnlockCode[]>([]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    setCodes(getAllCodes());
  }, []);

  if (!user) return null;
  if (!ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  const handleGenerate = () => {
    const c = generateUnlockCode();
    setCodes(getAllCodes());
    navigator.clipboard.writeText(c.code).catch(() => {});
    toast({ title: 'Codice generato', description: `${c.code} (copiato negli appunti)` });
  };

  const used = codes.filter(c => c.usedBy);
  const unused = codes.filter(c => !c.usedBy);

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">Admin · Codici di sblocco</h1>
              <p className="text-muted-foreground">Genera e gestisci i codici per i pagamenti manuali</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totali: {codes.length}</p>
                <p className="text-sm text-muted-foreground">Disponibili: {unused.length} · Usati: {used.length}</p>
              </div>
              <Button onClick={handleGenerate}><Plus className="w-4 h-4" /> Nuovo codice</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Codici disponibili ({unused.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {unused.length === 0 && <p className="text-sm text-muted-foreground">Nessun codice disponibile.</p>}
              {unused.map((c) => (
                <div key={c.code} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border/50">
                  <code className="font-mono font-bold text-primary">{c.code}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: 'Copiato' }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Codici già usati ({used.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {used.length === 0 && <p className="text-sm text-muted-foreground">Nessun codice ancora usato.</p>}
              {used.map((c) => (
                <div key={c.code} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30 opacity-70">
                  <code className="font-mono">{c.code}</code>
                  <span className="text-xs text-muted-foreground">{c.usedAt && new Date(c.usedAt).toLocaleString('it-IT')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
