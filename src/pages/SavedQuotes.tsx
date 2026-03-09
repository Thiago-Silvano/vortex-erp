import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllQuotes, deleteQuoteFromDB, duplicateQuote, getQuoteById, FullQuote } from '@/lib/supabase-storage';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Pencil, Trash2, Eye, Copy, Link, ExternalLink, RotateCcw, FileDown, EyeOff, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AuditLogDialog from '@/components/AuditLogDialog';
import AppLayout from '@/components/AppLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SavedQuotes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const [quotes, setQuotes] = useState<FullQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('vendedor');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      setUserEmail(data.user?.email || null);
      if (uid) {
        supabase.from('user_permissions').select('user_role').eq('user_id', uid).maybeSingle().then(({ data: perm }) => {
          if (perm?.user_role) setUserRole(perm.user_role);
        });
      }
    });
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    const data = await getAllQuotes(activeCompany?.id);
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQuotes();
  }, [activeCompany?.id]);

  const handleDelete = async (id: string) => {
    await deleteQuoteFromDB(id);
    await loadQuotes();
    toast({ title: 'Cotação excluída' });
  };

  const handleEdit = async (quote: FullQuote) => {
    const fullQuote = await getQuoteById(quote.id);
    navigate('/new', { state: { editQuote: fullQuote || quote } });
  };

  const handlePreview = async (quote: FullQuote) => {
    const fullQuote = await getQuoteById(quote.id);
    const q = fullQuote || quote;
    const quoteData = {
      id: q.id,
      client: q.client,
      trip: q.trip,
      services: q.services,
      destinationImageUrl: q.destinationImageUrl,
    };
    navigate('/preview', { state: { quote: quoteData, shortId: q.shortId } });
  };

  const handleDuplicate = async (id: string) => {
    const dup = await duplicateQuote(id);
    if (dup) {
      await loadQuotes();
      toast({ title: 'Cotação duplicada!', description: `Cópia criada com ID: ${dup.shortId}` });
    }
  };

  const handleReuse = async (quote: FullQuote) => {
    const fullQuote = await getQuoteById(quote.id);
    const q = fullQuote || quote;
    const reusedQuote = {
      ...q,
      id: undefined,
      shortId: undefined,
      client: {
        ...quote.client,
        name: '',
        phone: '',
        email: '',
        notes: '',
        passengers: 1,
      },
      trip: {
        ...quote.trip,
        departureDate: '',
        returnDate: '',
        nights: undefined,
      },
      services: quote.services.map(s => ({
        ...s,
        startDate: '',
        endDate: '',
        flightLegs: s.flightLegs?.map(fl => ({
          ...fl,
          departureDate: '',
          departureTime: '',
          arrivalDate: '',
          arrivalTime: '',
        })),
      })),
      createdAt: undefined,
      updatedAt: undefined,
    };
    navigate('/new', { state: { editQuote: reusedQuote } });
    toast({ title: 'Cotação reutilizada', description: 'Datas e dados do passageiro foram limpos.' });
  };

  const handleResetViews = async (id: string) => {
    try {
      const { error } = await supabase.from('quotes').update({ view_count: 0 }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Visualizações zeradas!' });
      await loadQuotes();
    } catch {
      toast({ title: 'Erro ao zerar visualizações', variant: 'destructive' });
    }
  };

  const handleCopyLink = (shortId: string) => {
    const link = `${window.location.origin}/orcamento/${shortId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!', description: link });
  };

  const handleOpenLink = (shortId: string) => {
    window.open(`/orcamento/${shortId}`, '_blank');
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (newStatus === 'concluido') {
        // Navigate to sale creation without changing status yet (sale page handles it on save, cancel reverts)
        const q = quotes.find(q => q.id === id);
        if (q) {
          const rav = q.payment?.rav || 0;
          navigate('/sales/new', {
            state: {
              quoteData: {
                id: q.id,
                clientName: q.client.name,
                services: q.services,
                rav,
                sellerId: q.sellerId || '',
              }
            }
          });
          return;
        }
      }

      const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      // When reverting to draft, delete sale + related receivables/payables
      if (newStatus === 'draft') {
        const { data: relatedSales } = await supabase.from('sales').select('id').eq('quote_id', id);
        if (relatedSales && relatedSales.length > 0) {
          const saleIds = relatedSales.map(s => s.id);
          await supabase.from('receivables').delete().in('sale_id', saleIds);
          await supabase.from('accounts_payable').delete().in('sale_id', saleIds);
          await supabase.from('sale_items').delete().in('sale_id', saleIds);
          await supabase.from('sale_suppliers').delete().in('sale_id', saleIds);
          await supabase.from('reservations').delete().in('sale_id', saleIds);
          await supabase.from('sales').delete().in('id', saleIds);
        }
      }

      toast({ title: `Status atualizado para: ${getStatusLabel(newStatus)}` });
      await loadQuotes();
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluída';
      case 'perdido': return 'Perdida';
      default: return 'Em aberto';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'text-success';
      case 'perdido': return 'text-destructive';
      default: return 'text-accent-foreground';
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTripDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cotações</h1>
            <p className="text-muted-foreground text-sm mt-1">{quotes.length} cotação(ões) salva(s)</p>
          </div>
          <Button
            onClick={() => navigate('/new')}
            className="h-14 w-14 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
            size="icon"
            title="Nova Cotação"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Carregando...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Nenhuma cotação salva ainda.</p>
            <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate('/new')}>
              <Plus className="h-4 w-4 mr-2" /> Criar Nova Cotação
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Destino</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Período</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                      <Eye className="h-4 w-4 inline" />
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => {
                    const costTotal = q.services.reduce((sum, s) => sum + s.value * s.quantity, 0);
                    const rav = q.payment?.rav || 0;
                    const total = costTotal + rav;
                    return (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[180px]">{q.client.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">ID: {q.shortId} • {q.services.length} serviço(s)</p>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <p className="truncate max-w-[160px]">{q.trip.origin} → {q.trip.destination}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          {q.trip.departureDate ? formatTripDate(q.trip.departureDate) : '-'}
                          {q.trip.returnDate ? ` a ${formatTripDate(q.trip.returnDate)}` : ''}
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          {q.status === 'concluido' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">Vendida</span>
                          )}
                          {q.status === 'perdido' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Perdida</span>
                          )}
                          {q.status !== 'concluido' && q.status !== 'perdido' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Aberta</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm">{q.viewCount}</span>
                            {userEmail === 'thiago@vortexviagens.com.br' && q.viewCount > 0 && (
                              <Button variant="ghost" size="icon" className="h-5 w-5" title="Zerar" onClick={() => handleResetViews(q.id)}>
                                <EyeOff className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <p className="font-bold text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {rav > 0 && (
                            <p className="text-[10px] text-muted-foreground">+ RAV</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleEdit(q)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="PDF" onClick={() => handlePreview(q)}>
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar link" onClick={() => handleCopyLink(q.shortId)}>
                              <Link className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir link" onClick={() => handleOpenLink(q.shortId)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(q.id)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Reutilizar" onClick={() => handleReuse(q)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>

                            {/* Vendida */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className={`h-7 w-7 ${q.status === 'concluido' ? 'text-success' : 'hover:text-success'}`}
                                  title={q.status === 'concluido' ? 'Desfazer venda' : 'Marcar vendida'}
                                  disabled={q.status === 'concluido' && userRole !== 'master'}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{q.status === 'concluido' ? 'Desfazer venda?' : 'Marcar como vendida?'}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {q.status === 'concluido'
                                      ? `A cotação de "${q.client.name}" voltará para "Em aberto".`
                                      : `A cotação de "${q.client.name}" será marcada como vendida.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleStatusChange(q.id, q.status === 'concluido' ? 'draft' : 'concluido')}>
                                    {q.status === 'concluido' ? 'Desfazer' : 'Confirmar Venda'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            {/* Perdida */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className={`h-7 w-7 ${q.status === 'perdido' ? 'text-destructive' : 'hover:text-destructive'}`}
                                  title={q.status === 'perdido' ? 'Desfazer perda' : 'Marcar perdida'}
                                  disabled={q.status === 'perdido' && userRole !== 'master'}
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{q.status === 'perdido' ? 'Desfazer perda?' : 'Marcar como perdida?'}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {q.status === 'perdido'
                                      ? `A cotação de "${q.client.name}" voltará para "Em aberto".`
                                      : `A cotação de "${q.client.name}" será marcada como perdida.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleStatusChange(q.id, q.status === 'perdido' ? 'draft' : 'perdido')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {q.status === 'perdido' ? 'Desfazer' : 'Confirmar Perda'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            {userEmail === 'thiago@vortexviagens.com.br' && (
                              <AuditLogDialog quoteId={q.id} clientName={q.client.name || 'Sem nome'} />
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Excluir">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A cotação de "{q.client.name}" será removida permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(q.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
