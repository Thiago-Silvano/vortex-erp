import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Send, KeyRound } from 'lucide-react';

const AUTHORIZED_EMAIL = 'contato@vortexviagens.com.br';

export default function Login() {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestAccess = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: AUTHORIZED_EMAIL,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao enviar código', description: error.message, variant: 'destructive' });
      return;
    }

    setStep('verify');
    toast({ title: 'Código enviado!', description: `Verifique o email ${AUTHORIZED_EMAIL}` });
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Código inválido', description: 'Digite o código de 6 dígitos.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: AUTHORIZED_EMAIL,
      token: otp,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Código inválido', description: 'Verifique o código e tente novamente.', variant: 'destructive' });
      return;
    }

    // Auth state change will handle redirect
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
            {step === 'request'
              ? 'Área restrita. Solicite acesso para continuar.'
              : `Digite o código de 6 dígitos enviado para ${AUTHORIZED_EMAIL}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'request' ? (
            <Button
              className="w-full"
              size="lg"
              onClick={handleRequestAccess}
              disabled={loading}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Solicitar Acesso'}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em] pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setStep('request'); setOtp(''); }}
              >
                Reenviar código
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
