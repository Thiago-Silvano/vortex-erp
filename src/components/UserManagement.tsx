import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UserManagement() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: email.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Convite enviado!', description: `Email enviado para ${email}` });
      setEmail('');
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível enviar o convite.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm">
          <UserPlus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Convidar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Email do novo usuário</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@email.com"
            />
          </div>
          <Button onClick={handleInvite} disabled={loading || !email.trim()} className="w-full">
            {loading ? 'Enviando...' : 'Enviar Convite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
