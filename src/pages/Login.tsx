import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Send } from 'lucide-react';

const AUTHORIZED_EMAIL = 'contato@vortexviagens.com.br';

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequestAccess = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: AUTHORIZED_EMAIL,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao enviar link', description: error.message, variant: 'destructive' });
      return;
    }

    setSent(true);
    toast({ title: 'Link enviado!', description: `Verifique o email ${AUTHORIZED_EMAIL}` });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-primary rounded-full p-4">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Vortex Viagens</CardTitle>
          <CardDescription>
            {sent
              ? `Um link de acesso foi enviado para ${AUTHORIZED_EMAIL}. Verifique sua caixa de entrada.`
              : 'Área restrita. Solicite acesso para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => { setSent(false); }}
            >
              <Send className="h-4 w-4 mr-2" />
              Reenviar link
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleRequestAccess}
              disabled={loading}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Solicitar Acesso'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
