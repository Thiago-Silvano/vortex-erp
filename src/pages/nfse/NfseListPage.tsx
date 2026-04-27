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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Download, Mail, MessageCircle, RefreshCw, XCircle, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  DOCUMENT_STATUS_MAP,
  DOCUMENT_STATUS_OPTIONS,
  normalizeDocumentStatus,
  isFiscalBackendConfigured,
  nfseApi,
  mapErrorToDisplay,
  mapRawErrorToMessage,
  type NfseDocumentStatus,
} from '@/lib/fiscal';

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

  const statusBadge = (rawStatus: string) => {
    const status = normalizeDocumentStatus(rawStatus);
    const display = DOCUMENT_STATUS_MAP[status];
    return <Badge variant={display.variant}>{display.label}</Badge>;
  };

  const handleCancel = async (note: any) => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;

    const previousStatus = note.status;

    try {
      const { data: user } = await supabase.auth.getUser();

      if (isFiscalBackendConfigured()) {
        // Call external backend for real cancellation
        const result = await nfseApi.cancel({
          empresa_id: activeCompany!.id,
          nfse_id: note.id,
          motivo,
        });

        if (!result.success) {
          const display = mapErrorToDisplay((result as any).error);
          toast.error(display.title + ': ' + display.message);
          return;
        }

        await supabase.from('nfse_documents').update({
          status: result.data.status,
          motivo_cancelamento: motivo,
          cancelado_por: user.user?.email || '',
          cancelado_em: new Date().toISOString(),
          protocolo_cancelamento: result.data.protocolo_cancelamento || null,
        }).eq('id', note.id);
      } else {
        // No backend — just mark as cancel_requested locally
        await supabase.from('nfse_documents').update({
          status: 'cancel_requested',
          motivo_cancelamento: motivo,
          cancelado_por: user.user?.email || '',
          cancelado_em: new Date().toISOString(),
        }).eq('id', note.id);
      }

      await supabase.from('nfse_events').insert({
        nfse_id: note.id,
        event_type: 'cancel_requested',
        description: `Cancelamento solicitado: ${motivo}`,
        user_email: user.user?.email || '',
        source: 'frontend',
        previous_status: previousStatus,
        new_status: isFiscalBackendConfigured() ? 'canceled' : 'cancel_requested',
      });

      await supabase.from('nfse_audit_logs').insert({
        empresa_id: activeCompany?.id,
        nfse_id: note.id,
        action: 'cancel_requested',
        description: motivo,
        user_email: user.user?.email || '',
        previous_status: previousStatus,
        new_status: isFiscalBackendConfigured() ? 'canceled' : 'cancel_requested',
      });

      toast.success(isFiscalBackendConfigured() ? 'Nota cancelada.' : 'Cancelamento solicitado. Será processado quando o backend fiscal estiver conectado.');
      loadNotes();
    } catch (e: any) {
      toast.error(mapRawErrorToMessage(e));
    }
  };

  const handleCheckStatus = async (note: any) => {
    if (!isFiscalBackendConfigured()) {
      toast.info('Backend fiscal não conectado. Não é possível consultar status.');
      return;
    }
    try {
      const result = await nfseApi.getStatus(note.id);
      if (result.success) {
        await supabase.from('nfse_documents').update({
          status: result.data.status,
          numero_nfse: result.data.numero_nfse || note.numero_nfse,
          chave_nfse: result.data.chave_nfse || note.chave_nfse,
          protocolo: result.data.protocolo || note.protocolo,
          data_emissao: result.data.data_emissao || note.data_emissao,
          motivo_rejeicao: result.data.motivo_rejeicao || null,
          updated_at: new Date().toISOString(),
        }).eq('id', note.id);

        const display = DOCUMENT_STATUS_MAP[result.data.status as NfseDocumentStatus];
        toast.success(`Status atualizado: ${display?.label || result.data.status}`);
        loadNotes();
      } else {
        const display = mapErrorToDisplay((result as any).error);
        toast.error(display.message);
      }
    } catch (e: any) {
      toast.error(mapRawErrorToMessage(e));
    }
  };

  const filtered = notes.filter(n =>
    (n.tomador_razao_social || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.tomador_cnpj_cpf || '').includes(search) ||
    (n.numero_nfse || '').includes(search)
  );

  const { sortedData: sortedNotes, sortState, requestSort } = useTableSort(filtered, {
    numero_nfse: (n: any) => n.numero_nfse,
    tomador_razao_social: (n: any) => n.tomador_razao_social,
    tomador_cnpj_cpf: (n: any) => n.tomador_cnpj_cpf,
    valor_servicos: (n: any) => Number(n.valor_servicos) || 0,
    created_at: (n: any) => n.created_at,
    status: (n: any) => n.status,
    ambiente: (n: any) => n.ambiente,
  });

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
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {DOCUMENT_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadNotes}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="numero_nfse" sortState={sortState} onSort={requestSort}>Nº</SortableTableHead>
                  <SortableTableHead sortKey="tomador_razao_social" sortState={sortState} onSort={requestSort}>Tomador</SortableTableHead>
                  <SortableTableHead sortKey="tomador_cnpj_cpf" sortState={sortState} onSort={requestSort}>CPF/CNPJ</SortableTableHead>
                  <SortableTableHead sortKey="valor_servicos" sortState={sortState} onSort={requestSort}>Valor</SortableTableHead>
                  <SortableTableHead sortKey="created_at" sortState={sortState} onSort={requestSort}>Data</SortableTableHead>
                  <SortableTableHead sortKey="status" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                  <SortableTableHead sortKey="ambiente" sortState={sortState} onSort={requestSort}>Ambiente</SortableTableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : sortedNotes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma nota encontrada</TableCell></TableRow>
                ) : sortedNotes.map(note => (
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
                          <DropdownMenuItem onClick={() => handleCheckStatus(note)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Consultar Status
                          </DropdownMenuItem>
                          {['authorized', 'autorizada'].includes(note.status) && (
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
