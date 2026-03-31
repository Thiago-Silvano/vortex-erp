import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

interface PendingFile {
  file: globalThis.File;
  id: string;
}

interface ClientFilesSectionProps {
  clientId?: string;
}

export interface ClientFilesSectionRef {
  uploadPendingFiles: (clientId: string) => Promise<void>;
  hasPendingFiles: () => boolean;
  clearPending: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-primary" />;
  if (mime.includes('pdf')) return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

const ClientFilesSection = forwardRef<ClientFilesSectionRef, ClientFilesSectionProps>(({ clientId }, ref) => {
  const { activeCompany } = useCompany();
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNewMode = !clientId;

  const loadFiles = async () => {
    if (!clientId) return;
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

  const uploadFileToStorage = async (file: globalThis.File, targetClientId: string) => {
    const ext = file.name.split('.').pop();
    const path = `client-files/${targetClientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('client-photos')
      .upload(path, file);

    if (uploadError) {
      toast.error(`Erro ao enviar ${file.name}`);
      return false;
    }

    const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(path);

    await (supabase.from('client_files' as any).insert({
      client_id: targetClientId,
      empresa_id: activeCompany?.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
    }) as any);

    return true;
  };

  useImperativeHandle(ref, () => ({
    uploadPendingFiles: async (targetClientId: string) => {
      if (pendingFiles.length === 0) return;
      let count = 0;
      for (const pf of pendingFiles) {
        const ok = await uploadFileToStorage(pf.file, targetClientId);
        if (ok) count++;
      }
      if (count > 0) toast.success(`${count} arquivo(s) vinculado(s) ao cliente`);
      setPendingFiles([]);
    },
    hasPendingFiles: () => pendingFiles.length > 0,
    clearPending: () => setPendingFiles([]),
  }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (isNewMode) {
      const newPending = Array.from(selectedFiles).map(f => ({
        file: f,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));
      setPendingFiles(prev => [...prev, ...newPending]);
      toast.success(`${selectedFiles.length} arquivo(s) adicionado(s). Serão enviados ao salvar.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    for (const file of Array.from(selectedFiles)) {
      const ok = await uploadFileToStorage(file, clientId!);
      if (ok) uploadedCount++;
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

  const removePending = (id: string) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  const allItems = [
    ...files.map(f => ({ type: 'saved' as const, data: f })),
    ...pendingFiles.map(pf => ({ type: 'pending' as const, data: pf })),
  ];

  return (
    <>
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Arquivos ({allItems.length})
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

        {allItems.length > 0 && (
          <div className="space-y-1">
            {allItems.map(item => {
              if (item.type === 'saved') {
                const file = item.data as ClientFile;
                return (
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
                );
              } else {
                const pf = item.data as PendingFile;
                return (
                  <div key={pf.id} className="flex items-center gap-2 p-1.5 rounded border border-dashed text-xs bg-muted/30">
                    {getFileIcon(pf.file.type)}
                    <span className="truncate flex-1 font-medium">{pf.file.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatFileSize(pf.file.size)}</span>
                    <span className="text-xs text-amber-600 shrink-0">Pendente</span>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removePending(pf.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              }
            })}
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
});

ClientFilesSection.displayName = 'ClientFilesSection';
export default ClientFilesSection;
