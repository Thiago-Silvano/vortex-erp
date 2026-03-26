import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, ShieldCheck, AlertTriangle, RefreshCw, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function NfseCertificatePage() {
  const { activeCompany } = useCompany();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (activeCompany) loadCertificate();
  }, [activeCompany]);

  const loadCertificate = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('fiscal_certificates')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setCertificate(data);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file || !password || !activeCompany) {
      toast.error('Selecione o arquivo .pfx/.p12 e informe a senha.');
      return;
    }

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // For now, store encrypted placeholder - real encryption will happen in edge function
      const { data: user } = await supabase.auth.getUser();

      // Deactivate previous certificates
      await supabase
        .from('fiscal_certificates')
        .update({ status: 'inactive' })
        .eq('empresa_id', activeCompany.id);

      const { error } = await supabase.from('fiscal_certificates').insert({
        empresa_id: activeCompany.id,
        arquivo_encrypted: base64,
        senha_encrypted: btoa(password), // Basic encoding - edge function will use proper encryption
        uploaded_by: user.user?.email || '',
        status: 'pending_validation',
        titular: '',
        cnpj_certificado: '',
        emissor: '',
      });

      if (error) throw error;

      toast.success('Certificado enviado! Validando...');
      setFile(null);
      setPassword('');
      await loadCertificate();
      // Trigger validation via edge function
      handleValidate();
    } catch (e: any) {
      toast.error('Erro ao enviar certificado: ' + e.message);
    }
    setUploading(false);
  };

  const handleValidate = async () => {
    if (!activeCompany) return;
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('nfse-certificate', {
        body: { action: 'validate', empresa_id: activeCompany.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Certificado validado com sucesso!');
        await loadCertificate();
      } else {
        toast.error(data?.message || 'Falha na validação do certificado.');
      }
    } catch (e: any) {
      toast.warning('Certificado salvo. Validação automática será implementada com a edge function.');
      await loadCertificate();
    }
    setValidating(false);
  };

  const daysToExpiry = certificate?.validade_fim
    ? differenceInDays(new Date(certificate.validade_fim), new Date())
    : null;

  const expiryStatus = daysToExpiry !== null
    ? daysToExpiry <= 0 ? 'expired' : daysToExpiry <= 30 ? 'warning' : 'ok'
    : 'unknown';

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certificado Digital</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento do certificado A1 para assinatura de NFS-e</p>
        </div>

        {/* Current Certificate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Certificado Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : certificate ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Titular</p>
                    <p className="text-sm font-medium">{certificate.titular || 'Pendente validação'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CNPJ/CPF</p>
                    <p className="text-sm font-medium">{certificate.cnpj_certificado || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Emissor</p>
                    <p className="text-sm font-medium">{certificate.emissor || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Validade</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {certificate.validade_fim ? format(new Date(certificate.validade_fim), 'dd/MM/yyyy') : '—'}
                      </p>
                      {expiryStatus === 'expired' && <Badge variant="destructive">Expirado</Badge>}
                      {expiryStatus === 'warning' && <Badge className="bg-amber-500 text-white">{daysToExpiry} dias</Badge>}
                      {expiryStatus === 'ok' && <Badge variant="default">{daysToExpiry} dias restantes</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={certificate.status === 'active' ? 'default' : 'secondary'}>
                      {certificate.status === 'active' ? 'Ativo' : certificate.status === 'pending_validation' ? 'Validação pendente' : certificate.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Enviado por</p>
                    <p className="text-sm">{certificate.uploaded_by || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${validating ? 'animate-spin' : ''}`} />
                    Validar Certificado
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum certificado cadastrado.</p>
                <p className="text-xs text-muted-foreground">Envie seu certificado A1 (.pfx ou .p12) abaixo.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload New Certificate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> {certificate ? 'Substituir Certificado' : 'Enviar Certificado'}
            </CardTitle>
            <CardDescription>Envie o arquivo .pfx ou .p12 do certificado A1</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Arquivo do Certificado (.pfx / .p12)</Label>
              <Input
                type="file"
                accept=".pfx,.p12"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Senha do Certificado</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite a senha do certificado"
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading || !file || !password}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar e Validar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
