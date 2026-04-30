import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Check, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TripAdvisorImage {
  id: string;
  url_preview: string;
  url_full: string;
  source: 'tripadvisor';
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (image: TripAdvisorImage) => void;
  initialQuery?: string;
}

export default function TripAdvisorImageModal({ open, onClose, onSelect, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery || '');
  const [images, setImages] = useState<TripAdvisorImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setImages([]);
    setSelectedId(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-tripadvisor-images', {
        body: { query: q, limit: 10 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const imgs = ((data as any)?.images || []) as TripAdvisorImage[];
      setImages(imgs);
      if (imgs.length === 0) toast.info('Nenhuma imagem encontrada no TripAdvisor');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro na busca', { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      search(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  function handleSelect(img: TripAdvisorImage) {
    setSelectedId(img.id);
    onSelect(img);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-emerald-600" />
            Buscar imagens no TripAdvisor
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); search(query); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Torre Eiffel Paris, Cristo Redentor Rio..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Buscar
          </Button>
        </form>

        {loading && (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-sm">Buscando 10 fotos no TripAdvisor...</p>
          </div>
        )}

        {!loading && images.length === 0 && query && (
          <div className="py-12 text-center text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma imagem encontrada. Tente termos mais específicos.</p>
          </div>
        )}

        {images.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {images.length} imagens encontradas — clique para selecionar
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className={`group relative cursor-pointer rounded overflow-hidden border transition-all ${
                    selectedId === img.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelect(img)}
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    <img
                      src={img.url_preview}
                      alt={img.description}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleSelect(img); }}
                      >
                        <Check className="h-3 w-3 mr-1" />Selecionar
                      </Button>
                    </div>
                    {selectedId === img.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded inline-flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" /> TripAdvisor
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center pt-2">
              Imagens públicas do TripAdvisor. Use respeitando os direitos autorais.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}