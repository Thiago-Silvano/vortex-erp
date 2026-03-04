import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuoteData } from '@/types/quote';
import { getSavedQuotes, deleteQuote, getAgencySettings } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Pencil, Trash2, Eye, ArrowLeft, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const [quotes, setQuotes] = useState<QuoteData[]>([]);

  useEffect(() => {
    setQuotes(getSavedQuotes());
  }, []);

  const handleDelete = (id: string) => {
    deleteQuote(id);
    setQuotes(getSavedQuotes());
    toast({ title: 'Orçamento excluído' });
  };

  const handleEdit = (quote: QuoteData) => {
    navigate('/', { state: { editQuote: quote } });
  };

  const handlePreview = (quote: QuoteData) => {
    navigate('/preview', { state: { quote } });
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <FileText className="h-6 w-6" />
          <h1 className="text-xl font-bold">Orçamentos Salvos</h1>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-4xl">
        {quotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Nenhum orçamento salvo ainda.</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Criar Novo Orçamento</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => {
              const total = q.services.reduce((sum, s) => sum + s.value * s.quantity, 0);
              return (
                <Card key={q.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{q.client.name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        {q.trip.origin} → {q.trip.destination}
                        {q.trip.departureDate && ` • ${formatTripDate(q.trip.departureDate)}`}
                        {q.trip.returnDate && ` a ${formatTripDate(q.trip.returnDate)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.services.length} serviço(s) • Atualizado em {formatDate(q.updatedAt)}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-lg font-bold text-primary">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Visualizar" onClick={() => handlePreview(q)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O orçamento de "{q.client.name}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(q.id!)}>Excluir</AlertDialogAction>
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
      </main>
    </div>
  );
}
