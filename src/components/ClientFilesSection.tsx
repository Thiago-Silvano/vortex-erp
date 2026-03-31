import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Eye, FileUp, Trash2, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClientFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface ClientFilesSectionProps {
  clientId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mime.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export default function ClientFilesSection({ clientId }: ClientFilesSectionProps) {
  const { activeCompany } = useCompany();
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    const { data } = await (supabase
      .from('client_files' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }) as any);
    if (data) setFiles(data);
  };

  useEffect(() => {
    if (clientId) loadFiles();
  }, [clientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let uploadedCount = 0;

    for (const file of Array.from(selectedFiles)) {
      const ext = file.name.split('.').pop();
      const path = `client-files/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(path, file);

      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(path);

      await (supabase.from('client_files' as any).insert({
        client_id: clientId,
        empresa_id: activeCompany?.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
      }) as any);

      uploadedCount++;
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} arquivo(s) enviado(s)`);
      loadFiles();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (file: ClientFile) => {
    const { error } = await (supabase.from('client_files' as any).delete().eq('id', file.id) as any);
    if (error) { toast.error('Erro ao excluir'); return; }
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast.success('Arquivo excluído');
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <>
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Arquivos ({files.length})
          </h3>
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="gap-1"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
              {uploading ? 'Enviando...' : 'Upload'}
            </Button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-2 p-1.5 rounded border text-xs hover:bg-muted/50 group">
                {getFileIcon(file.mime_type)}
                <span className="truncate flex-1 font-medium">{file.file_name}</span>
                <span className="text-muted-foreground shrink-0">{formatFileSize(file.file_size)}</span>
                <span className="text-muted-foreground shrink-0">{format(new Date(file.created_at), 'dd/MM/yy')}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isImage(file.mime_type) && (
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setPreviewUrl(file.file_url)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <a href={file.file_url} download={file.file_name} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleDelete(file)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
