import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Camera, Upload, Search, Check, X } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  cpf: string;
}

interface PhotoCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhotoCaptureModal({ open, onOpenChange }: PhotoCaptureModalProps) {
  const { activeCompany } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'capture' | 'link'>('capture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('capture');
      setSelectedFile(null);
      setPreviewUrl(null);
      setClientSearch('');
      setSelectedClient(null);
      setShowDropdown(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 'link') {
      fetchClients();
    }
  }, [open, step, activeCompany?.id]);

  const fetchClients = async () => {
    let query = supabase.from('clients').select('id, full_name, cpf').order('full_name');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setClients(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WEBP.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('link');
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredClients = clients.filter(c =>
    normalize(c.full_name).includes(normalize(clientSearch))
  );

  const handleUpload = async () => {
    if (!selectedFile || !selectedClient) {
      toast.error('Selecione um cliente para vincular a foto.');
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || 'desconhecido';

      const ext = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `${selectedClient.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, selectedFile, { contentType: selectedFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('client_photos' as any).insert({
        client_id: selectedClient.id,
        empresa_id: activeCompany?.id,
        file_name: selectedFile.name,
        file_url: urlData.publicUrl,
        uploaded_by: userEmail,
      } as any);

      if (dbError) throw dbError;

      toast.success('Foto salva com sucesso!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 'capture' ? 'Capturar Foto' : 'Vincular ao Cliente'}</DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {step === 'capture' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto com a câmera ou selecione uma imagem da galeria.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={openCamera} variant="outline" className="h-24 flex-col gap-2">
                <Camera className="h-8 w-8" />
                <span className="text-sm">Câmera</span>
              </Button>
              <Button onClick={openGallery} variant="outline" className="h-24 flex-col gap-2">
                <Upload className="h-8 w-8" />
                <span className="text-sm">Galeria</span>
              </Button>
            </div>
          </div>
        )}

        {step === 'link' && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 h-7 w-7"
                  onClick={() => { setStep('capture'); setSelectedFile(null); setPreviewUrl(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar cliente por nome..."
                value={selectedClient ? selectedClient.full_name : clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value);
                  setSelectedClient(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && !selectedClient && clientSearch.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                        onClick={() => {
                          setSelectedClient(c);
                          setShowDropdown(false);
                        }}
                      >
                        <span>{c.full_name}</span>
                        <span className="text-xs text-muted-foreground">{c.cpf}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-md text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedClient.full_name}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!selectedClient || uploading}
              >
                {uploading ? 'Enviando...' : 'Salvar Foto'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
