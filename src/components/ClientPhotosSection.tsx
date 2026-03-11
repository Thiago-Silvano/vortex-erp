import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Eye, ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClientPhoto {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

interface ClientPhotosSectionProps {
  clientId: string;
}

export default function ClientPhotosSection({ clientId }: ClientPhotosSectionProps) {
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    (supabase.from('client_photos' as any).select('*').eq('client_id', clientId).order('created_at', { ascending: false }) as any)
      .then(({ data }: any) => {
        if (data) setPhotos(data);
      });
  }, [clientId]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Fotos / Arquivos vinculados ({photos.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="group relative border rounded-lg overflow-hidden">
              <img
                src={photo.file_url}
                alt={photo.file_name}
                className="w-full aspect-square object-cover cursor-pointer"
                onClick={() => setPreviewUrl(photo.file_url)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={() => setPreviewUrl(photo.file_url)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <a href={photo.file_url} download={photo.file_name} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-white/20">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white hover:bg-red-500/40" onClick={async () => {
                  const { error } = await (supabase.from('client_photos' as any).delete().eq('id', photo.id) as any);
                  if (error) { toast.error('Erro ao excluir foto'); return; }
                  setPhotos(prev => prev.filter(p => p.id !== photo.id));
                  toast.success('Foto excluída');
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-1">
                <p className="text-[10px] truncate text-muted-foreground">{photo.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(photo.created_at), 'dd/MM/yy HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
