import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { maskCpf, maskPhone, validateEmail } from '@/lib/masks';
import CepLookup from '@/components/CepLookup';
import { Users } from 'lucide-react';

interface QuickClientModalProps {
  open: boolean;
  onClose: () => void;
  onClientCreated: (client: { id: string; full_name: string; phone?: string; email?: string }) => void;
  initialName?: string;
}

const emptyForm = () => ({
  full_name: '', cpf: '', birth_date: '', email: '', phone: '',
  passport_number: '', passport_issue_date: '', passport_expiry_date: '',
  cep: '', address: '', address_number: '', complement: '',
  neighborhood: '', city: '', state: '', country: 'Brasil',
});

export default function QuickClientModal({ open, onClose, onClientCreated, initialName }: QuickClientModalProps) {
  const { activeCompany } = useCompany();
  const [form, setForm] = useState(() => ({ ...emptyForm(), full_name: initialName || '' }));
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isDependent, setIsDependent] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [existingClients, setExistingClients] = useState<any[]>([]);

  useEffect(() => {
    if (open && isDependent && existingClients.length === 0) {
      const fetchClients = async () => {
        let query = supabase.from('clients').select('*').order('full_name');
        if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
        const { data } = await query;
        if (data) setExistingClients(data);
      };
      fetchClients();
    }
  }, [open, isDependent, activeCompany?.id]);

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) { onClose(); return; }
    setForm({ ...emptyForm(), full_name: initialName || '' });
    setEmailError('');
    setIsDependent(false);
    setSelectedParentId(null);
    setExistingClients([]);
  };

  const handleEmailChange = (value: string) => {
    const lower = value.toLowerCase();
    setForm(p => ({ ...p, email: lower }));
    setEmailError(lower && !validateEmail(lower) ? 'Email inválido' : '');
  };

  const handleParentSelect = (parentId: string) => {
    setSelectedParentId(parentId);
    const parent = existingClients.find(c => c.id === parentId);
    if (parent) {
      setForm(prev => ({
        ...prev,
        passport_number: parent.passport_number || '',
        passport_issue_date: parent.passport_issue_date || '',
        passport_expiry_date: parent.passport_expiry_date || '',
        email: parent.email || '',
        phone: parent.phone || '',
        cep: parent.cep || '',
        address: parent.address || '',
        address_number: parent.address_number || '',
        complement: parent.complement || '',
        neighborhood: parent.neighborhood || '',
        city: parent.city || '',
        state: parent.state || '',
        country: parent.country || 'Brasil',
      }));
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (form.email && !validateEmail(form.email)) { toast.error('Email inválido'); return; }

    setSaving(true);
    const payload: any = {
      ...form,
      birth_date: form.birth_date || null,
      passport_issue_date: form.passport_issue_date || null,
      passport_expiry_date: form.passport_expiry_date || null,
      empresa_id: activeCompany?.id,
    };

    const { data, error } = await supabase.from('clients').insert(payload).select('id, full_name, phone, email').single();
    setSaving(false);

    if (error) { toast.error('Erro ao cadastrar cliente'); return; }
    toast.success('Cliente cadastrado!');
    onClientCreated({ id: data.id, full_name: data.full_name, phone: data.phone || '', email: data.email || '' });
    setForm(emptyForm());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: maskCpf(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="quick-is-dependent"
                  checked={isDependent}
                  onCheckedChange={(checked) => {
                    setIsDependent(!!checked);
                    if (!checked) setSelectedParentId(null);
                  }}
                />
                <Label htmlFor="quick-is-dependent" className="cursor-pointer flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  O novo cliente é dependente de outro cliente?
                </Label>
              </div>
              {isDependent && (
                <Select value={selectedParentId || ''} onValueChange={handleParentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente titular..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}{c.cpf ? ` - ${c.cpf}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Passaporte</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Número</Label><Input value={form.passport_number} onChange={e => setForm(p => ({ ...p, passport_number: e.target.value }))} /></div>
                <div><Label>Emissão</Label><Input type="date" value={form.passport_issue_date} onChange={e => setForm(p => ({ ...p, passport_issue_date: e.target.value }))} /></div>
                <div><Label>Vencimento</Label><Input type="date" value={form.passport_expiry_date} onChange={e => setForm(p => ({ ...p, passport_expiry_date: e.target.value }))} /></div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => handleEmailChange(e.target.value)} placeholder="exemplo@email.com" className={emailError ? 'border-destructive' : ''} />
              {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
            <CardContent>
              <CepLookup
                data={{ cep: form.cep, address: form.address, addressNumber: form.address_number, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state, country: form.country }}
                onChange={d => setForm(p => ({
                  ...p,
                  ...(d.cep !== undefined && { cep: d.cep }),
                  ...(d.address !== undefined && { address: d.address }),
                  ...(d.addressNumber !== undefined && { address_number: d.addressNumber }),
                  ...(d.complement !== undefined && { complement: d.complement }),
                  ...(d.neighborhood !== undefined && { neighborhood: d.neighborhood }),
                  ...(d.city !== undefined && { city: d.city }),
                  ...(d.state !== undefined && { state: d.state }),
                  ...(d.country !== undefined && { country: d.country }),
                }))}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
