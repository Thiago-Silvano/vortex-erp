import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Send, Save } from 'lucide-react';
import { toast } from 'sonner';

const VIAGENS_ID = '0dd6a20e-4804-4925-b910-d2f3978ee898';

const PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: 'data', desc: 'Data de referência (dia anterior)' },
  { key: 'mes', desc: 'Mês/ano de referência' },
  { key: 'viagens_total', desc: 'Total vendido Viagens (dia)' },
  { key: 'viagens_lucro', desc: 'Lucro bruto Viagens (dia)' },
  { key: 'viagens_qtd', desc: 'Qtd. de vendas Viagens (dia)' },
  { key: 'viagens_mes', desc: 'Total vendido Viagens (mês)' },
  { key: 'viagens_lucro_mes', desc: 'Lucro bruto Viagens (mês)' },
  { key: 'vistos_total', desc: 'Total vendido Vistos (dia)' },
  { key: 'vistos_lucro', desc: 'Lucro bruto Vistos (dia)' },
  { key: 'vistos_qtd', desc: 'Qtd. de vendas Vistos (dia)' },
  { key: 'vistos_mes', desc: 'Total vendido Vistos (mês)' },
  { key: 'vistos_lucro_mes', desc: 'Lucro bruto Vistos (mês)' },
  { key: 'total_geral', desc: 'Total consolidado (dia)' },
  { key: 'lucro_geral', desc: 'Lucro consolidado (dia)' },
  { key: 'qtd_geral', desc: 'Qtd. total de vendas (dia)' },
  { key: 'mes_geral', desc: 'Total consolidado do mês' },
  { key: 'lucro_mes_geral', desc: 'Lucro consolidado do mês' },
];

const DEFAULT_TEMPLATE = `📊 *RESUMO FINANCEIRO DIÁRIO*
🗓️ Referente a: *{data}*

✈️ *VORTEX VIAGENS*
💰 Vendido ({data}): *{viagens_total}*
📈 Lucro Bruto: *{viagens_lucro}*
🧾 Qtd. de Vendas: *{viagens_qtd}*
📅 Total no mês ({mes}): *{viagens_mes}*
📊 Lucro Bruto no mês: *{viagens_lucro_mes}*

🛂 *VORTEX VISTOS*
💰 Vendido ({data}): *{vistos_total}*
📈 Lucro Bruto: *{vistos_lucro}*
🧾 Qtd. de Vendas: *{vistos_qtd}*
📅 Total no mês ({mes}): *{vistos_mes}*
📊 Lucro Bruto no mês: *{vistos_lucro_mes}*

━━━━━━━━━━━━━━━
🏆 *CONSOLIDADO {data}*
━━━━━━━━━━━━━━━
✈️ Viagens — Vendido: *{viagens_total}* | Lucro: *{viagens_lucro}*
━━━━━━━━━━━━━━━
🛂 Vistos — Vendido: *{vistos_total}* | Lucro: *{vistos_lucro}*
━━━━━━━━━━━━━━━
💎 Lucro Bruto Total: *{lucro_geral}*
🧾 Total de Vendas: *{qtd_geral}*
📅 Mês: *{mes_geral}* | Lucro: *{lucro_mes_geral}*

🤖 _Mensagem automática Vortex ERP_`;

interface Recipient { name: string; phone: string }

export default function FinancialSummaryPage() {
  const { activeCompany } = useCompany();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Always store under VIAGENS_ID since that's the sender used by the cron
  const empresaId = VIAGENS_ID;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('financial_summary_config' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      if (data) {
        const d: any = data;
        if (d.message_template) setTemplate(d.message_template);
        if (Array.isArray(d.recipients)) {
          setRecipients(
            d.recipients.map((r: any) =>
              typeof r === 'string' ? { name: '', phone: r } : { name: r?.name || '', phone: r?.phone || '' }
            ).filter((r: Recipient) => r.phone)
          );
        }
      }
      setLoading(false);
    })();
  }, [empresaId]);

  const addRecipient = () => {
    const phone = newPhone.replace(/\D/g, '');
    if (phone.length < 10) {
      toast.error('Informe um número válido com DDD');
      return;
    }
    if (recipients.some(r => r.phone === phone)) {
      toast.error('Este número já está cadastrado');
      return;
    }
    setRecipients([...recipients, { name: newName.trim(), phone }]);
    setNewName('');
    setNewPhone('');
  };

  const removeRecipient = (phone: string) => {
    setRecipients(recipients.filter(r => r.phone !== phone));
  };

  const save = async () => {
    setSaving(true);
    const payload: any = {
      empresa_id: empresaId,
      message_template: template,
      recipients: recipients,
    };
    const { error } = await supabase
      .from('financial_summary_config' as any)
      .upsert(payload, { onConflict: 'empresa_id' });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Configuração salva');
    }
  };

  const sendTest = async () => {
    const phone = testPhone.replace(/\D/g, '');
    if (phone.length < 10) {
      toast.error('Informe um número válido para o teste');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-financial-summary', {
        body: { test_phone: phone, template },
      });
      if (error) throw error;
      const result = (data as any)?.results?.[0];
      if (result?.status === 200 || result?.status === 201) {
        toast.success('Mensagem de teste enviada');
      } else {
        toast.warning(`Resposta do servidor: ${result?.response || result?.error || 'desconhecida'}`);
      }
    } catch (e: any) {
      toast.error('Erro ao enviar teste: ' + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const sendNow = async () => {
    if (!recipients.length) {
      toast.error('Cadastre ao menos um destinatário');
      return;
    }
    if (!confirm(`Enviar resumo agora para ${recipients.length} número(s)?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-financial-summary', {
        body: { template, recipients: recipients.map(r => r.phone) },
      });
      if (error) throw error;
      const ok = ((data as any)?.results || []).filter((r: any) => r.status === 200 || r.status === 201).length;
      toast.success(`Envio concluído: ${ok}/${recipients.length} OK`);
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Envio de Resumo Financeiro</h1>
            <p className="text-xs text-muted-foreground">
              Envio automático todos os dias às 06:00 (BRT) via WhatsApp.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || loading}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={sendNow} disabled={sending || loading}>
              <Send className="h-3.5 w-3.5" /> Enviar agora
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Modelo da mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={22}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Use as chaves entre chaves <code>{'{chave}'}</code>. Clique para inserir no cursor.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chaves disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[520px] overflow-auto">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setTemplate((t) => t + `{${p.key}}`)}
                  className="w-full text-left flex items-start justify-between gap-2 p-1.5 rounded hover:bg-accent transition-colors"
                >
                  <code className="text-[11px] font-mono text-primary">{`{${p.key}}`}</code>
                  <span className="text-[11px] text-muted-foreground text-right">{p.desc}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Destinatários ({recipients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Nome (opcional)</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs">WhatsApp (com DDI 55 + DDD)</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="5548999999999"
                  onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                />
              </div>
              <Button onClick={addRecipient}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {recipients.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum destinatário cadastrado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <Badge key={r.phone} variant="secondary" className="gap-1.5 py-1 pr-1">
                    <span className="text-xs">
                      {r.name ? `${r.name} — ` : ''}+{r.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(r.phone)}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Teste de envio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">Número para teste (somente este número receberá)</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5548999999999"
              />
            </div>
            <Button onClick={sendTest} disabled={sending}>
              <Send className="h-3.5 w-3.5" /> {sending ? 'Enviando...' : 'Enviar teste'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}