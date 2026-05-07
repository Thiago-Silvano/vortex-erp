import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';

interface Fee {
  id: string;
  name: string;
  institution: string | null;
  method: string;
  fees_by_installment: Record<string, number>;
  status: string;
}

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseAmount = (s: string) => {
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const maskBRL = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function FeeSimulatorPage() {
  const { activeCompany } = useCompany();
  const [fees, setFees] = useState<Fee[]>([]);
  const [method, setMethod] = useState<'maquininha' | 'link'>('maquininha');
  const [institutionId, setInstitutionId] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);
  const [valueStr, setValueStr] = useState('');
  const valueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => valueInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase.from('payment_fees').select('*').eq('status', 'active');
      if (activeCompany?.id) q = q.or(`empresa_id.eq.${activeCompany.id},empresa_id.is.null`);
      const { data } = await q;
      if (data) setFees(data as Fee[]);
    })();
  }, [activeCompany?.id]);

  const institutionsForMethod = useMemo(
    () => fees.filter(f => f.method === method),
    [fees, method]
  );

  // auto-select first available institution when method changes
  useEffect(() => {
    if (!institutionsForMethod.find(f => f.id === institutionId)) {
      setInstitutionId(institutionsForMethod[0]?.id || '');
    }
  }, [institutionsForMethod, institutionId]);

  const matched = useMemo(
    () => fees.find(f => f.id === institutionId) || null,
    [fees, institutionId]
  );

  const availableInstallments = useMemo(() => {
    if (!matched) return [];
    return Object.entries(matched.fees_by_installment || {})
      .filter(([, v]) => Number(v) > 0)
      .map(([k]) => parseInt(k))
      .sort((a, b) => a - b);
  }, [matched]);

  useEffect(() => {
    if (availableInstallments.length && !availableInstallments.includes(installments)) {
      setInstallments(availableInstallments[0]);
    }
  }, [availableInstallments]); // eslint-disable-line

  const value = parseAmount(valueStr);
  const bankFee = matched ? Number(matched.fees_by_installment?.[String(installments)] || 0) : 0;

  // Maximized fee formula:
  // step1 = 100 - bankFee
  // step2 = 100 / step1
  // step3 = step2 - 1
  // maxFeePct = step3 * 100
  const step1 = 100 - bankFee;
  const step2 = step1 > 0 ? 100 / step1 : 0;
  const step3 = step2 - 1;
  const maxFeePct = step3 * 100;

  const surcharge = value * (maxFeePct / 100);
  const totalCharged = value + surcharge;
  const bankCost = totalCharged * (bankFee / 100);
  const netReceived = totalCharged - bankCost;
  const installmentValue = installments > 0 ? totalCharged / installments : 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-foreground">Simulador de Taxas</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2">
              <Label className="text-base">Método</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquininha">Maquininha</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base">Instituição</Label>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {institutionsForMethod.length === 0 ? (
                    <SelectItem value="__none" disabled>Sem cadastros</SelectItem>
                  ) : institutionsForMethod.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.institution || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base">Número de Parcelas</Label>
              <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableInstallments.length === 0 ? (
                    <SelectItem value="1" disabled>Sem taxas</SelectItem>
                  ) : availableInstallments.map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base">Valor a parcelar</Label>
              <Input
                ref={valueInputRef}
                autoFocus
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={valueStr}
                onChange={e => setValueStr(maskBRL(e.target.value))}
                className="h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado {matched ? `— ${matched.institution} (${matched.method === 'link' ? 'Link' : 'Maquininha'}) ${installments}x` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!matched || bankFee <= 0 ? (
              <p className="text-sm text-muted-foreground">
                Cadastre/edite uma tabela em <strong>Cadastros → Taxas</strong> com a instituição, método e parcela desejados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Box label="Taxa do banco" value={`${bankFee.toFixed(2).replace('.', ',')} %`} />
                <Box label="Taxa maximizada (a repassar)" value={`${maxFeePct.toFixed(2).replace('.', ',')} %`} highlight />
                <Box label="Valor original" value={fmtBRL(value)} />
                <Box label="Acréscimo" value={fmtBRL(surcharge)} />
                <Box label="Total a cobrar do cliente" value={fmtBRL(totalCharged)} highlight />
                <Box label="Valor por parcela" value={`${installments}x de ${fmtBRL(installmentValue)}`} />
                <Box label="Custo bancário" value={fmtBRL(bankCost)} />
                <Box label="Líquido recebido" value={fmtBRL(netReceived)} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Box({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}