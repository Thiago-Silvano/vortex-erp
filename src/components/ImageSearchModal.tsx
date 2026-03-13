import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Check, Camera, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StockImage {
  id: string;
  url_preview: string;
  url_full: string;
  url_download: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  source: 'unsplash' | 'pexels';
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (image: StockImage) => void;
  initialQuery?: string;
  unsplashKey: string;
  pexelsKey: string;
}

export default function ImageSearchModal({ open, onClose, onSelect, initialQuery, unsplashKey, pexelsKey }: Props) {
  const [query, setQuery] = useState(initialQuery || '');
  const [images, setImages] = useState<StockImage[]>([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchImages = useCallback(async (searchQuery: string, searchPage: number = 1) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-stock-images', {
        body: { action: 'search', query: searchQuery, page: searchPage, unsplashKey, pexelsKey },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setSearching(false); return; }
      if (data?.success) {
        const newImages = data.images || [];
        if (searchPage === 1) {
          setImages(newImages);
        } else {
          setImages(prev => [...prev, ...newImages]);
        }
        setHasMore(newImages.length >= 20);
        setPage(searchPage);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao buscar imagens');
    } finally {
      setSearching(false);
    }
  }, [unsplashKey, pexelsKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchImages(query, 1);
  };

  const handleLoadMore = () => {
    searchImages(query, page + 1);
  };

  const handleSelect = (img: StockImage) => {
    setSelectedId(img.id);
    onSelect(img);
  };

  // Auto-search on open if initialQuery provided
  React.useEffect(() => {
    if (open && initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      searchImages(initialQuery, 1);
    }
  }, [open, initialQuery]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Buscar Imagens Profissionais
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ex: Paris skyline, Orlando theme park, Lake Como aerial..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Buscar
          </Button>
        </form>

        {searching && images.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-sm">Buscando imagens em alta resolução...</p>
          </div>
        )}

        {!searching && images.length === 0 && query && (
          <div className="py-12 text-center text-muted-foreground">
            <Camera className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma imagem encontrada. Tente termos diferentes.</p>
          </div>
        )}

        {images.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">{images.length} imagens encontradas — apenas imagens horizontais ≥ 1920px</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map(img => (
                <div
                  key={img.id}
                  className={`group relative cursor-pointer rounded overflow-hidden border transition-all ${
                    selectedId === img.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelect(img)}
                >
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <img
                      src={img.url_preview}
                      alt={img.description}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
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
                    {/* Selected indicator */}
                    {selectedId === img.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    {/* Source badge */}
                    <div className="absolute bottom-1 left-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded">
                        {img.source === 'unsplash' ? 'Unsplash' : 'Pexels'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground truncate">📷 {img.photographer}</p>
                    <p className="text-[10px] text-muted-foreground">{img.width} × {img.height}px</p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-2">
                <Button variant="outline" onClick={handleLoadMore} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Carregar mais imagens
                </Button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Imagens fornecidas por Unsplash e Pexels. Créditos aos fotógrafos são obrigatórios.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
