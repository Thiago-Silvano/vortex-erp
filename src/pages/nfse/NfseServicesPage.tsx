import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

interface FiscalService {
  id?: string;
  nome_interno: string;
  categoria: string;
  codigo_servico: string;
  item_lista_lc116: string;
  descricao_fiscal: string;
  aliquota: number;
  retencao_iss: boolean;
  tributacao: string;
  municipio_incidencia: string;
  observacoes: string;
  is_active: boolean;
  service_catalog_id?: string;
}

const emptyService: FiscalService = {
  nome_interno: '', categoria: '', codigo_servico: '', item_lista_lc116: '',
  descricao_fiscal: '', aliquota: 0, retencao_iss: false, tributacao: '',
  municipio_incidencia: '', observacoes: '', is_active: true,
};

export default function NfseServicesPage() {
  const { activeCompany } = useCompany();
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FiscalService>(emptyService);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadServices();
  }, [activeCompany]);

  const loadServices = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('fiscal_service_mappings')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('nome_interno');
    setServices(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!activeCompany || !editing.nome_interno) {
      toast.error('Nome do serviço é obrigatório.');
      return;
    }
    try {
      if (editingId) {
        await supabase.from('fiscal_service_mappings')
          .update({ ...editing, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        toast.success('Serviço atualizado!');
      } else {
        await supabase.from('fiscal_service_mappings')
          .insert({ ...editing, empresa_id: activeCompany.id });
        toast.success('Serviço cadastrado!');
      }
      setShowModal(false);
      setEditing(emptyService);
      setEditingId(null);
      loadServices();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setEditing(s);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este serviço fiscal?')) return;
    await supabase.from('fiscal_service_mappings').delete().eq('id', id);
    toast.success('Serviço excluído.');
    loadServices();
  };

  const filtered = services.filter(s =>
    s.nome_interno?.toLowerCase().includes(search.toLowerCase()) ||
    s.codigo_servico?.includes(search)
  );

  const { sortedData: sortedServices, sortState, requestSort } = useTableSort(filtered, {
    nome_interno: (s: any) => s.nome_interno,
    codigo_servico: (s: any) => s.codigo_servico,
    aliquota: (s: any) => Number(s.aliquota) || 0,
    retencao_iss: (s: any) => s.retencao_iss ? 1 : 0,
    is_active: (s: any) => s.is_active ? 1 : 0,
  }, { initialKey: 'nome_interno', initialDirection: 'asc' });

  const updateField = (field: string, value: any) => setEditing(p => ({ ...p, [field]: value }));

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Serviços Fiscais</h1>
            <p className="text-sm text-muted-foreground">Mapeamento de serviços para emissão de NFS-e</p>
          </div>
          <Button onClick={() => { setEditing(emptyService); setEditingId(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Serviço
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="nome_interno" sortState={sortState} onSort={requestSort}>Nome</SortableTableHead>
                  <SortableTableHead sortKey="codigo_servico" sortState={sortState} onSort={requestSort}>Código</SortableTableHead>
                  <SortableTableHead sortKey="aliquota" sortState={sortState} onSort={requestSort}>Alíquota</SortableTableHead>
                  <SortableTableHead sortKey="retencao_iss" sortState={sortState} onSort={requestSort}>Retenção</SortableTableHead>
                  <SortableTableHead sortKey="is_active" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedServices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado</TableCell></TableRow>
                ) : sortedServices.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome_interno}</TableCell>
                    <TableCell>{s.codigo_servico || '—'}</TableCell>
                    <TableCell>{s.aliquota}%</TableCell>
                    <TableCell>{s.retencao_iss ? 'Sim' : 'Não'}</TableCell>
                    <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Serviço Fiscal' : 'Novo Serviço Fiscal'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <Label>Nome Interno</Label>
                <Input value={editing.nome_interno} onChange={e => updateField('nome_interno', e.target.value)} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={editing.categoria} onChange={e => updateField('categoria', e.target.value)} placeholder="Ex: Turismo" />
              </div>
              <div>
                <Label>Código do Serviço</Label>
                <Input value={editing.codigo_servico} onChange={e => updateField('codigo_servico', e.target.value)} placeholder="Ex: 09.01" />
              </div>
              <div>
                <Label>Item Lista LC 116</Label>
                <Input value={editing.item_lista_lc116} onChange={e => updateField('item_lista_lc116', e.target.value)} />
              </div>
              <div>
                <Label>Alíquota (%)</Label>
                <Input type="number" step="0.01" value={editing.aliquota} onChange={e => updateField('aliquota', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Tributação</Label>
                <Input value={editing.tributacao} onChange={e => updateField('tributacao', e.target.value)} />
              </div>
              <div>
                <Label>Município de Incidência</Label>
                <Input value={editing.municipio_incidencia} onChange={e => updateField('municipio_incidencia', e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={editing.retencao_iss} onCheckedChange={v => updateField('retencao_iss', v)} />
                <Label>Retenção de ISS</Label>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={editing.is_active} onCheckedChange={v => updateField('is_active', v)} />
                <Label>Ativo</Label>
              </div>
              <div className="col-span-full">
                <Label>Descrição Fiscal</Label>
                <Textarea value={editing.descricao_fiscal} onChange={e => updateField('descricao_fiscal', e.target.value)} rows={2} />
              </div>
              <div className="col-span-full">
                <Label>Observações</Label>
                <Textarea value={editing.observacoes} onChange={e => updateField('observacoes', e.target.value)} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
