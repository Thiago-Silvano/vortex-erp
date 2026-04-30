import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Map, FileText, ExternalLink, Trash2, Copy, Edit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Itinerary {
  id: string;
  title: string;
  subtitle: string;
  client_name: string;
  travel_date: string;
  cover_image_url: string;
  status: string;
  short_id: string;
  token: string;
  created_at: string;
}

interface PremiumDraft {
  id: string;
  title: string;
  updated_at: string;
  form_data: any;
  roteiro_data: any;
}

export default function ItinerariesPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [premiumDrafts, setPremiumDrafts] = useState<PremiumDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDraftId, setDeleteDraftId] = useState<string | null>(null);

  const fetchItineraries = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const [itResp, drResp] = await Promise.all([
      supabase
        .from('itineraries')
        .select('*')
        .eq('empresa_id', activeCompany.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('roteiro_premium_drafts' as any)
        .select('id, title, updated_at, form_data, roteiro_data')
        .eq('empresa_id', activeCompany.id)
        .order('updated_at', { ascending: false }),
    ]);
    setItineraries((itResp.data as any[]) || []);
    setPremiumDrafts((drResp.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItineraries(); }, [activeCompany]);

  const createNew = async () => {
    if (!activeCompany) return;
    const { data, error } = await supabase
      .from('itineraries')
      .insert({ empresa_id: activeCompany.id, title: 'Novo Roteiro' } as any)
      .select()
      .single();
    if (error) { toast.error('Erro ao criar roteiro'); return; }
    navigate(`/itineraries/${(data as any).id}`);
  };

  const duplicateItinerary = async (it: Itinerary) => {
    if (!activeCompany) return;
    const { data: newIt, error } = await supabase
      .from('itineraries')
      .insert({
        empresa_id: activeCompany.id,
        title: `${it.title} (Cópia)`,
        subtitle: it.subtitle,
        client_name: it.client_name,
        travel_date: it.travel_date,
        cover_image_url: it.cover_image_url,
        status: 'draft',
      } as any)
      .select()
      .single();
    if (error || !newIt) { toast.error('Erro ao duplicar'); return; }
    toast.success('Roteiro duplicado!');
    fetchItineraries();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('itineraries').delete().eq('id', deleteId);
    toast.success('Roteiro excluído');
    setDeleteId(null);
    fetchItineraries();
  };

  const confirmDeleteDraft = async () => {
    if (!deleteDraftId) return;
    await supabase.from('roteiro_premium_drafts' as any).delete().eq('id', deleteDraftId);
    toast.success('Rascunho excluído');
    setDeleteDraftId(null);
    fetchItineraries();
  };

  const filtered = itineraries.filter(it =>
    it.title.toLowerCase().includes(search.toLowerCase()) ||
    it.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel: Record<string, string> = { draft: 'Rascunho', published: 'Publicado' };
  const statusColor: Record<string, string> = { draft: 'bg-amber-100 text-amber-700', published: 'bg-emerald-100 text-emerald-700' };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roteiros</h1>
            <p className="text-sm text-muted-foreground mt-1">Crie roteiros visuais premium para seus clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/itineraries/premium')} className="gap-2 bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-90 text-white">
              <Sparkles className="h-4 w-4" /> Roteiro Premium IA
            </Button>
            <Button onClick={createNew} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Novo Roteiro
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar roteiro por título ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Rascunhos Premium IA */}
        {premiumDrafts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Rascunhos Roteiro Premium IA</h2>
              <Badge variant="secondary" className="text-[10px]">{premiumDrafts.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {premiumDrafts.map(d => (
                <Card key={d.id} className="p-3 hover:shadow-md transition-shadow group border-amber-200/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/itineraries/premium/${d.id}`)}>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <h3 className="font-medium text-sm text-foreground truncate">{d.title || 'Sem título'}</h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {d.form_data?.destinoPrincipal || '—'}
                        {d.form_data?.dataInicio ? ` • ${d.form_data.dataInicio}` : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Atualizado {new Date(d.updated_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => setDeleteDraftId(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Map className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum roteiro encontrado</h3>
            <p className="text-sm text-muted-foreground/70 mb-6">Crie seu primeiro roteiro de viagem premium</p>
            <Button onClick={createNew} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Roteiro
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(it => (
              <Card key={it.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                <div
                  className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative"
                  style={it.cover_image_url ? { backgroundImage: `url(${it.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  onClick={() => navigate(`/itineraries/${it.id}`)}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-3 right-3">
                    <Badge className={statusColor[it.status] || statusColor.draft}>
                      {statusLabel[it.status] || it.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground truncate" onClick={() => navigate(`/itineraries/${it.id}`)}>
                    {it.title || 'Sem título'}
                  </h3>
                  {it.client_name && <p className="text-sm text-muted-foreground mt-1">{it.client_name}</p>}
                  {it.travel_date && <p className="text-xs text-muted-foreground/70 mt-1">{it.travel_date}</p>}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate(`/itineraries/${it.id}`)}>
                      <Edit className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => duplicateItinerary(it)}>
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(it.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Roteiro</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDraftId} onOpenChange={() => setDeleteDraftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rascunho</AlertDialogTitle>
            <AlertDialogDescription>O rascunho do Roteiro Premium IA será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDraft} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
