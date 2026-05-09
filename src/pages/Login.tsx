import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import vortexLogo from '@/assets/vortex-logo.png';

export default function Login() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao entrar', description: 'Email ou senha incorretos.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 border-0 border-none shadow-none rounded-none border-neutral-700 text-left bg-zinc-800">
      <Card className="w-full max-w-md bg-zinc-800 border-0">
        <CardHeader className="text-center space-y-0 pb-0">
          <div className="flex justify-center bg-zinc-800">
            <img src={vortexLogo} alt="Vortex Viagens" className="h-64 w-auto border-0 rounded-none shadow-none text-xs object-contain" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-50">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-50">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full bg-gray-600" size="lg" type="submit" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary underline text-neutral-50">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
