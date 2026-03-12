import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { maskCpf, maskPhone, validateEmail } from '@/lib/masks';
import CepLookup from '@/components/CepLookup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Seller {
  id: string;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string | null;
  marital_status: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  complement: string;
  role_title: string;
  admission_date: string | null;
  status: string;
  monthly_salary: number;
  notes: string;
  bank_name: string;
  bank_agency: string;
  bank_account: string;
  account_type: string;
  pix_key: string;
  beneficiary_name: string;
  beneficiary_document: string;
  commission_type: string;
  commission_percentage: number;
  commission_base: string;
  commission_trigger: string;
  commission_include_card_fee: boolean;
  commission_include_discounts: boolean;
  commission_include_taxes: boolean;
  commission_include_operational: boolean;
  commission_revenue_scope: string;
  commission_mixed_config: any[];
  empresa_id: string | null;
}

const emptySeller: Omit<Seller, 'id'> = {
  full_name: '', cpf: '', rg: '', birth_date: null, marital_status: '', phone: '', whatsapp: '',
  email: '', address: '', address_number: '', neighborhood: '', city: '', state: '', cep: '',
  complement: '', role_title: '', admission_date: null, status: 'active', monthly_salary: 0,
  notes: '', bank_name: '', bank_agency: '', bank_account: '', account_type: '',
  pix_key: '', beneficiary_name: '', beneficiary_document: '',
  commission_type: 'none', commission_percentage: 0, commission_base: '',
  commission_trigger: 'sale_date', commission_include_card_fee: false,
  commission_include_discounts: false, commission_include_taxes: false,
  commission_include_operational: false, commission_revenue_scope: '', commission_mixed_config: [],
  empresa_id: null,
};

const commissionTypes = [
  { value: 'none', label: 'Sem comissão' },
  { value: 'sales_percentage', label: 'Percentual sobre suas vendas' },
  { value: 'profit_percentage', label: 'Percentual sobre lucro das suas vendas' },
  { value: 'revenue_percentage', label: 'Percentual sobre faturamento geral' },
  { value: 'company_profit_percentage', label: 'Percentual sobre comissão/lucro da empresa' },
  { value: 'mixed', label: 'Modelo misto' },
];

const commissionBases = [
  { value: 'gross_sale', label: 'Valor bruto da venda' },
  { value: 'net_received', label: 'Valor líquido recebido' },
  { value: 'sale_profit', label: 'Lucro da venda' },
];

const commissionTriggers = [
  { value: 'sale_date', label: 'Data da venda' },
  { value: 'payment_date', label: 'Data do pagamento' },
  { value: 'full_payment', label: 'Data da quitação total' },
];

const revenueScopes = [
  { value: 'received_only', label: 'Somente faturamento recebido' },
  { value: 'total_sold', label: 'Faturamento total vendido' },
  { value: 'completed_only', label: 'Apenas vendas concluídas' },
];

export default function SellersPage() {
  const { activeCompany } = useCompany();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [form, setForm] = useState<Omit<Seller, 'id'>>(emptySeller);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!activeCompany) return;
    const { data } = await (supabase.from('sellers') as any).select('*').eq('empresa_id', activeCompany.id).order('full_name');
    if (data) setSellers(data);
  };

  useEffect(() => { load(); }, [activeCompany]);

  const openNew = () => { setEditing(null); setForm({ ...emptySeller, empresa_id: activeCompany?.id || null }); setDialogOpen(true); };
  const openEdit = (s: Seller) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const save = async () => {
    if (!form.full_name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      await (supabase.from('sellers') as any).update(form).eq('id', editing.id);
      toast.success('Vendedor atualizado');
    } else {
      await (supabase.from('sellers') as any).insert(form);
      toast.success('Vendedor cadastrado');
    }
    setDialogOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await (supabase.from('sellers') as any).delete().eq('id', deleteId);
    toast.success('Vendedor excluído');
    setDeleteId(null);
    load();
  };

  const filtered = sellers.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.cpf.includes(search) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const setField = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="h-6 w-6" /> Vendedores</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Vendedor</Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum vendedor cadastrado</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(s)}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.cpf}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.role_title}</TableCell>
                    <TableCell>{commissionTypes.find(c => c.value === s.commission_type)?.label || '-'}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Seller Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Personal Data */}
            <Card>
              <CardHeader><CardTitle className="text-base">Dados Pessoais e Profissionais</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={form.full_name} onChange={e => setField('full_name', e.target.value)} /></div>
                <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setField('cpf', maskCpf(e.target.value))} /></div>
                <div><Label>RG</Label><Input value={form.rg} onChange={e => setField('rg', e.target.value)} /></div>
                <div><Label>Data de nascimento</Label><Input type="date" value={form.birth_date || ''} onChange={e => setField('birth_date', e.target.value || null)} /></div>
                <div><Label>Estado civil</Label>
                  <Select value={form.marital_status} onValueChange={v => setField('marital_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setField('phone', maskPhone(e.target.value))} /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setField('whatsapp', maskPhone(e.target.value))} /></div>
                <div className="md:col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => {
                    const lower = e.target.value.toLowerCase();
                    setField('email', lower);
                  }} placeholder="exemplo@email.com" />
                  {form.email && !validateEmail(form.email) && <p className="text-xs text-destructive mt-1">Email inválido</p>}
                </div>

                <Separator className="md:col-span-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
              <CardContent>
                <CepLookup
                  data={{
                    cep: form.cep, address: form.address, addressNumber: form.address_number,
                    complement: form.complement, neighborhood: form.neighborhood,
                    city: form.city, state: form.state, country: '',
                  }}
                  onChange={d => {
                    if (d.cep !== undefined) setField('cep', d.cep);
                    if (d.address !== undefined) setField('address', d.address);
                    if (d.addressNumber !== undefined) setField('address_number', d.addressNumber);
                    if (d.complement !== undefined) setField('complement', d.complement);
                    if (d.neighborhood !== undefined) setField('neighborhood', d.neighborhood);
                    if (d.city !== undefined) setField('city', d.city);
                    if (d.state !== undefined) setField('state', d.state);
                  }}
                />

                <Separator className="md:col-span-3" />

                <div><Label>Cargo</Label><Input value={form.role_title} onChange={e => setField('role_title', e.target.value)} /></div>
                <div><Label>Data de admissão</Label><Input type="date" value={form.admission_date || ''} onChange={e => setField('admission_date', e.target.value || null)} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setField('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Salário mensal fixo (R$)</Label><Input type="number" value={form.monthly_salary} onChange={e => setField('monthly_salary', Number(e.target.value))} /></div>
                <div className="md:col-span-3"><Label>Observações internas</Label><Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} /></div>
              </CardContent>
            </Card>

            {/* Bank Data */}
            <Card>
              <CardHeader><CardTitle className="text-base">Dados Bancários</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Banco</Label><Input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} /></div>
                <div><Label>Agência</Label><Input value={form.bank_agency} onChange={e => setField('bank_agency', e.target.value)} /></div>
                <div><Label>Conta</Label><Input value={form.bank_account} onChange={e => setField('bank_account', e.target.value)} /></div>
                <div><Label>Tipo de conta</Label>
                  <Select value={form.account_type} onValueChange={v => setField('account_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      <SelectItem value="salario">Conta Salário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Chave Pix</Label><Input value={form.pix_key} onChange={e => setField('pix_key', e.target.value)} /></div>
                <div><Label>Nome do favorecido</Label><Input value={form.beneficiary_name} onChange={e => setField('beneficiary_name', e.target.value)} /></div>
                <div><Label>CPF/CNPJ do favorecido</Label><Input value={form.beneficiary_document} onChange={e => setField('beneficiary_document', e.target.value)} /></div>
              </CardContent>
            </Card>

            {/* Commission Config */}
            <Card>
              <CardHeader><CardTitle className="text-base">Configuração de Comissão</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de comissão</Label>
                  <Select value={form.commission_type} onValueChange={v => setField('commission_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {commissionTypes.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type A: Sales percentage */}
                {form.commission_type === 'sales_percentage' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div><Label>Percentual de comissão (%)</Label><Input type="number" step="0.01" value={form.commission_percentage} onChange={e => setField('commission_percentage', Number(e.target.value))} /></div>
                    <div><Label>Base de cálculo</Label>
                      <Select value={form.commission_base} onValueChange={v => setField('commission_base', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{commissionBases.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data de apuração</Label>
                      <Select value={form.commission_trigger} onValueChange={v => setField('commission_trigger', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{commissionTriggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Type B: Profit percentage */}
                {form.commission_type === 'profit_percentage' && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Percentual sobre lucro (%)</Label><Input type="number" step="0.01" value={form.commission_percentage} onChange={e => setField('commission_percentage', Number(e.target.value))} /></div>
                      <div><Label>Data de apuração</Label>
                        <Select value={form.commission_trigger} onValueChange={v => setField('commission_trigger', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{commissionTriggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Fórmula: Lucro = valor vendido - custo - taxas - descontos</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_card_fee} onCheckedChange={v => setField('commission_include_card_fee', v)} /><Label>Incluir taxa de cartão</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_discounts} onCheckedChange={v => setField('commission_include_discounts', v)} /><Label>Incluir descontos comerciais</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_operational} onCheckedChange={v => setField('commission_include_operational', v)} /><Label>Incluir taxas operacionais</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_taxes} onCheckedChange={v => setField('commission_include_taxes', v)} /><Label>Incluir impostos</Label></div>
                    </div>
                  </div>
                )}

                {/* Type C: Revenue percentage */}
                {form.commission_type === 'revenue_percentage' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div><Label>Percentual (%)</Label><Input type="number" step="0.01" value={form.commission_percentage} onChange={e => setField('commission_percentage', Number(e.target.value))} /></div>
                    <div><Label>Escopo do faturamento</Label>
                      <Select value={form.commission_revenue_scope} onValueChange={v => setField('commission_revenue_scope', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{revenueScopes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data de apuração</Label>
                      <Select value={form.commission_trigger} onValueChange={v => setField('commission_trigger', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{commissionTriggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Type D: Company profit percentage */}
                {form.commission_type === 'company_profit_percentage' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div><Label>Percentual (%)</Label><Input type="number" step="0.01" value={form.commission_percentage} onChange={e => setField('commission_percentage', Number(e.target.value))} /></div>
                    <div><Label>Data de apuração</Label>
                      <Select value={form.commission_trigger} onValueChange={v => setField('commission_trigger', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{commissionTriggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <p className="md:col-span-2 text-sm text-muted-foreground">
                      Exemplo: Venda R$ 10.000 | Lucro empresa R$ 1.500 | Comissão {form.commission_percentage}% = R$ {((1500 * form.commission_percentage) / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Type E: Mixed */}
                {form.commission_type === 'mixed' && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Configure a combinação de comissão:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Percentual principal (%)</Label><Input type="number" step="0.01" value={form.commission_percentage} onChange={e => setField('commission_percentage', Number(e.target.value))} /></div>
                      <div><Label>Base de cálculo principal</Label>
                        <Select value={form.commission_base} onValueChange={v => setField('commission_base', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{commissionBases.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Data de apuração</Label>
                        <Select value={form.commission_trigger} onValueChange={v => setField('commission_trigger', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{commissionTriggers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_card_fee} onCheckedChange={v => setField('commission_include_card_fee', v)} /><Label>Incluir taxa de cartão</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={form.commission_include_discounts} onCheckedChange={v => setField('commission_include_discounts', v)} /><Label>Incluir descontos</Label></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={save}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as comissões vinculadas também serão excluídas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
