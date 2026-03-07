import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/lib/supabase-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, Trash2, ExternalLink, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InternalFile {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface Props {
  quoteId?: string;
}

export default function InternalFiles({ quoteId }: Props) {
  const [files, setFiles] = useState<InternalFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const loadFiles = async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from('quote_internal_files' as any)
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    setFiles((data as any[]) || []);
  };

  useEffect(() => {
    loadFiles();
  }, [quoteId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !quoteId) return;
    setUploading(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const url = await uploadImage(file, 'internal-files');
      if (url) {
        await supabase.from('quote_internal_files' as any).insert({
          quote_id: quoteId,
          file_url: url,
          file_name: file.name,
        });
      }
    }

    await loadFiles();
    setUploading(false);
    toast({ title: 'Arquivo(s) enviado(s)!' });
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    await supabase.from('quote_internal_files' as any).delete().eq('id', id);
    setFiles(prev => prev.filter(f => f.id !== id));
    toast({ title: 'Arquivo removido' });
  };

  if (!quoteId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Arquivos Internos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Salve o orçamento primeiro para anexar arquivos internos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Arquivos Internos
          <span className="text-xs font-normal text-muted-foreground">(não visível para o cliente)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm">Adicionar arquivos (prints, custos, etc.)</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map(f => (
              <div key={f.id} className="relative group rounded-lg border overflow-hidden bg-muted/30">
                <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={f.file_url} alt={f.file_name} className="w-full h-28 object-cover" />
                </a>
                <div className="p-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">{f.file_name}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(f.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
