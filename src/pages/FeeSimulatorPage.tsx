import { useEffect, useMemo, useState } from 'react';
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
  method: string;
  installments: number;
  fee_percent: number;
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
  const [installments, setInstallments] = useState<number>(1);
  const [valueStr, setValueStr] = useState('');

  useEffect(() => {
    (async () => {
      let q = supabase.from('payment_fees').select('*').eq('status', 'active');
      if (activeCompany?.id) q = q.or(`empresa_id.eq.${activeCompany.id},empresa_id.is.null`);
      const { data } = await q;
      if (data) setFees(data as Fee[]);
    })();
  }, [activeCompany?.id]);

  const availableInstallments = useMemo(
    () => Array.from(new Set(fees.filter(f => f.method === method).map(f => f.installments))).sort((a, b) => a - b),
    [fees, method]
  );

  const matched = useMemo(
    () => fees.find(f => f.method === method && f.installments === installments) || null,
    [fees, method, installments]
  );

  const value = parseAmount(valueStr);
  const bankFee = matched ? Number(matched.fee_percent) : 0;

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
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Método</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquininha">Maquininha</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número de Parcelas</Label>
              <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableInstallments.length === 0 ? (
                    <SelectItem value="1">Sem taxas cadastradas</SelectItem>
                  ) : availableInstallments.map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor a parcelar</Label>
              <Input
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={valueStr}
                onChange={e => setValueStr(maskBRL(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado {matched ? `— ${matched.name}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!matched ? (
              <p className="text-sm text-muted-foreground">
                Cadastre uma taxa em <strong>Cadastros → Taxas</strong> compatível com o método e parcelas selecionados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Box label="Taxa do banco" value={`${bankFee.toFixed(4).replace('.', ',')} %`} />
                <Box label="Taxa maximizada (a repassar)" value={`${maxFeePct.toFixed(4).replace('.', ',')} %`} highlight />
                <Box label="Valor original" value={fmtBRL(value)} />
                <Box label="Acréscimo" value={fmtBRL(surcharge)} />
                <Box label="Total a cobrar do cliente" value={fmtBRL(totalCharged)} highlight />
                <Box label="Valor por parcela" value={`${installments}x de ${fmtBRL(installmentValue)}`} />
                <Box label="Custo bancário" value={fmtBRL(bankCost)} />
                <Box label="Líquido recebido" value={fmtBRL(netReceived)} />
              </div>
            )}

            <div className="mt-6 text-xs text-muted-foreground space-y-1 border-t pt-4">
              <p className="font-medium text-foreground">Como o cálculo é feito:</p>
              <p>1) 100 − taxa do banco = <strong>{step1.toFixed(4)}</strong></p>
              <p>2) 100 ÷ resultado = <strong>{step2.toFixed(6)}</strong></p>
              <p>3) resultado − 1 = <strong>{step3.toFixed(6)}</strong></p>
              <p>4) × 100 = <strong>{maxFeePct.toFixed(4)} %</strong> → taxa maximizada aplicada sobre o valor.</p>
            </div>
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