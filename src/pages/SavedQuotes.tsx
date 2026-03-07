import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllQuotes, deleteQuoteFromDB, duplicateQuote, FullQuote } from '@/lib/supabase-storage';
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
  const [quotes, setQuotes] = useState<FullQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    const data = await getAllQuotes();
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteQuoteFromDB(id);
    await loadQuotes();
    toast({ title: 'Cotação excluída' });
  };

  const handleEdit = (quote: FullQuote) => {
    navigate('/new', { state: { editQuote: quote } });
  };

  const handlePreview = (quote: FullQuote) => {
    const quoteData = {
      id: quote.id,
      client: quote.client,
      trip: quote.trip,
      services: quote.services,
      destinationImageUrl: quote.destinationImageUrl,
    };
    navigate('/preview', { state: { quote: quoteData, shortId: quote.shortId } });
  };

  const handleDuplicate = async (id: string) => {
    const dup = await duplicateQuote(id);
    if (dup) {
      await loadQuotes();
      toast({ title: 'Cotação duplicada!', description: `Cópia criada com ID: ${dup.shortId}` });
    }
  };

  const handleReuse = (quote: FullQuote) => {
    const reusedQuote = {
      ...quote,
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
      const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
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
          <div className="space-y-3">
            {quotes.map(q => {
              const costTotal = q.services.reduce((sum, s) => sum + s.value * s.quantity, 0);
              const rav = q.payment?.rav || 0;
              const total = costTotal + rav;
              return (
                <Card key={q.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base truncate">{q.client.name || 'Sem nome'}</p>
                        {q.status === 'concluido' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">Vendida</span>
                        )}
                        {q.status === 'perdido' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Perdida</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {q.trip.origin} → {q.trip.destination}
                        {q.trip.departureDate && ` • ${formatTripDate(q.trip.departureDate)}`}
                        {q.trip.returnDate && ` a ${formatTripDate(q.trip.returnDate)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.services.length} serviço(s) • ID: {q.shortId} • {formatDate(q.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mr-2">
                      <div className="flex items-center gap-1 text-muted-foreground" title="Visualizações do link">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm font-medium">{q.viewCount}</span>
                        {userEmail === 'thiago@vortexviagens.com.br' && q.viewCount > 0 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Zerar visualizações" onClick={() => handleResetViews(q.id)}>
                            <EyeOff className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {rav > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Custo: R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + RAV
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Visualizar PDF" onClick={() => handlePreview(q)}>
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Copiar link" onClick={() => handleCopyLink(q.shortId)}>
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Abrir página do cliente" onClick={() => handleOpenLink(q.shortId)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicar" onClick={() => handleDuplicate(q.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Reutilizar cotação" onClick={() => handleReuse(q)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      {/* Marcar como vendida */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={q.status === 'concluido' ? 'Já marcada como vendida' : 'Marcar como vendida'}
                            disabled={q.status === 'concluido'}
                            className={q.status === 'concluido' ? 'text-success' : 'hover:text-success'}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marcar como vendida?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A cotação de "{q.client.name}" será marcada como vendida e o valor será contabilizado no dashboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleStatusChange(q.id, 'concluido')}>Confirmar Venda</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Marcar como perdida */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={q.status === 'perdido' ? 'Já marcada como perdida' : 'Marcar como perdida'}
                            disabled={q.status === 'perdido'}
                            className={q.status === 'perdido' ? 'text-destructive' : 'hover:text-destructive'}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marcar como perdida?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A cotação de "{q.client.name}" será marcada como perdida e o valor será contabilizado como perda no dashboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleStatusChange(q.id, 'perdido')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Perda</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {userEmail === 'thiago@vortexviagens.com.br' && (
                        <AuditLogDialog quoteId={q.id} clientName={q.client.name || 'Sem nome'} />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
