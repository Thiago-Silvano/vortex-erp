import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Download, Mail, MessageCircle, RefreshCw, XCircle, Copy, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function NfseListPage() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (activeCompany) loadNotes();
  }, [activeCompany, statusFilter]);

  const loadNotes = async () => {
    if (!activeCompany) return;
    setLoading(true);
    let q = supabase
      .from('nfse_documents')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);

    const { data } = await q;
    setNotes(data || []);
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      processando: { label: 'Processando', variant: 'outline' },
      transmitindo: { label: 'Transmitindo', variant: 'outline' },
      autorizada: { label: 'Autorizada', variant: 'default' },
      rejeitada: { label: 'Rejeitada', variant: 'destructive' },
      cancelada: { label: 'Cancelada', variant: 'destructive' },
    };
    const s = map[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleCancel = async (note: any) => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('nfse_documents').update({
        status: 'cancelada',
        motivo_cancelamento: motivo,
        cancelado_por: user.user?.email || '',
        cancelado_em: new Date().toISOString(),
      }).eq('id', note.id);

      // Log audit
      await supabase.from('nfse_audit_logs').insert({
        empresa_id: activeCompany?.id,
        nfse_id: note.id,
        action: 'cancelamento',
        description: motivo,
        user_email: user.user?.email || '',
      });

      toast.success('Nota cancelada.');
      loadNotes();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const filtered = notes.filter(n =>
    (n.tomador_razao_social || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.tomador_cnpj_cpf || '').includes(search) ||
    (n.numero_nfse || '').includes(search)
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} nota(s)</p>
          </div>
          <Button onClick={() => navigate('/nfse/emit')}>
            <Plus className="h-4 w-4 mr-2" /> Nova NFS-e
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por tomador, CPF/CNPJ ou número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
              <SelectItem value="autorizada">Autorizada</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadNotes}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tomador</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma nota encontrada</TableCell></TableRow>
                ) : filtered.map(note => (
                  <TableRow key={note.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/nfse/detail/${note.id}`)}>
                    <TableCell className="font-medium">{note.numero_nfse || '—'}</TableCell>
                    <TableCell>{note.tomador_razao_social || '—'}</TableCell>
                    <TableCell className="text-xs">{note.tomador_cnpj_cpf || '—'}</TableCell>
                    <TableCell>R$ {(note.valor_servicos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs">{format(new Date(note.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{statusBadge(note.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {note.ambiente === 'producao' ? 'PROD' : 'HML'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/nfse/detail/${note.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          {note.xml_nfse_autorizada && (
                            <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Baixar XML</DropdownMenuItem>
                          )}
                          {note.pdf_url && (
                            <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Baixar PDF</DropdownMenuItem>
                          )}
                          <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Reenviar por E-mail</DropdownMenuItem>
                          <DropdownMenuItem><MessageCircle className="h-4 w-4 mr-2" /> Reenviar por WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem><RefreshCw className="h-4 w-4 mr-2" /> Consultar Status</DropdownMenuItem>
                          {note.status === 'autorizada' && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(note)}>
                              <XCircle className="h-4 w-4 mr-2" /> Cancelar Nota
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => navigate(`/nfse/emit`)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar para nova emissão
                          </DropdownMenuItem>
                          {note.sale_id && (
                            <DropdownMenuItem onClick={() => navigate(`/sales/${note.sale_id}`)}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Abrir Venda
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
