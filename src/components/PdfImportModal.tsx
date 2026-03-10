import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, Trash2, Plus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedService {
  service_type: string;
  description: string;
  cost_price: number;
  quantity: number;
  dates: string;
  details: string;
}

interface TripInfo {
  client_name: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
}

interface ServiceCatalogOption {
  id: string;
  name: string;
  cost_center_id: string | null;
}

interface ImportedItem {
  description: string;
  cost_price: number;
  rav: number;
  total_value: number;
  service_catalog_id?: string;
  cost_center_id?: string;
}

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  serviceCatalog: ServiceCatalogOption[];
  onImport: (items: ImportedItem[], tripInfo: TripInfo) => void;
  marginMode: 'none' | 'fixed' | 'manual';
  marginPercent: number;
}

export default function PdfImportModal({ open, onClose, serviceCatalog, onImport, marginMode: initialMarginMode, marginPercent: initialMarginPercent }: PdfImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [services, setServices] = useState<ExtractedService[]>([]);
  const [tripInfo, setTripInfo] = useState<TripInfo>({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
  const [marginMode, setMarginMode] = useState<'none' | 'fixed' | 'manual'>(initialMarginMode);
  const [marginPercent, setMarginPercent] = useState(initialMarginPercent);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos.'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 20MB).'); return; }
    setFile(f);
    setPdfUrl(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(10);

    try {
      // Read file as base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('analyze-quote-pdf', {
        body: { pdfBase64: base64, serviceCatalog: serviceCatalog.map(s => ({ name: s.name })) },
      });

      setProgress(80);

      if (error) { toast.error('Erro ao analisar PDF.'); setAnalyzing(false); setProgress(0); return; }
      if (data?.error) { toast.error(data.error); setAnalyzing(false); setProgress(0); return; }

      const extractedServices = data?.services || [];
      const extractedTrip = data?.trip_info || {};

      setServices(extractedServices);
      setTripInfo({
        client_name: extractedTrip.client_name || '',
        origin: extractedTrip.origin || '',
        destination: extractedTrip.destination || '',
        departure_date: extractedTrip.departure_date || '',
        return_date: extractedTrip.return_date || '',
      });

      setProgress(100);
      setStep('review');
      toast.success(`${extractedServices.length} serviço(s) identificado(s) no PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar o arquivo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateService = (idx: number, field: keyof ExtractedService, value: any) => {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeService = (idx: number) => {
    setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const addService = () => {
    setServices(prev => [...prev, { service_type: '', description: '', cost_price: 0, quantity: 1, dates: '', details: '' }]);
  };

  const calcRav = (cost: number) => {
    if (marginMode === 'fixed' && marginPercent > 0) return Math.round(cost * (marginPercent / 100) * 100) / 100;
    return 0;
  };

  const handleConfirm = () => {
    const items: ImportedItem[] = services.map(s => {
      const matchedCatalog = serviceCatalog.find(c => c.name.toLowerCase().includes(s.service_type.toLowerCase()) || s.service_type.toLowerCase().includes(c.name.toLowerCase()));
      const cost = s.cost_price * (s.quantity || 1);
      const rav = calcRav(cost);
      return {
        description: s.description,
        cost_price: cost,
        rav,
        total_value: cost + rav,
        service_catalog_id: matchedCatalog?.id,
        cost_center_id: matchedCatalog?.cost_center_id || undefined,
      };
    });

    onImport(items, tripInfo);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setPdfUrl('');
    setStep('upload');
    setServices([]);
    setTripInfo({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
    setProgress(0);
  };

  const totalCost = services.reduce((s, svc) => s + svc.cost_price * (svc.quantity || 1), 0);
  const totalWithMargin = marginMode === 'fixed' ? totalCost * (1 + marginPercent / 100) : totalCost;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Orçamento (PDF)
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Upload area */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Clique ou arraste um arquivo PDF de orçamento do fornecedor'}
              </p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </div>

            {/* PDF Preview */}
            {pdfUrl && (
              <div className="border rounded-lg overflow-hidden">
                <iframe src={pdfUrl} className="w-full h-[300px]" title="PDF Preview" />
              </div>
            )}

            {/* Margin config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Aplicar Margem</Label>
                <Select value={marginMode} onValueChange={(v: any) => setMarginMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem margem (apenas custo)</SelectItem>
                    <SelectItem value="fixed">Margem fixa (%)</SelectItem>
                    <SelectItem value="manual">Margem manual por item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {marginMode === 'fixed' && (
                <div>
                  <Label>Margem (%)</Label>
                  <Input type="number" step="0.1" value={marginPercent} onChange={e => setMarginPercent(parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {/* Progress */}
            {analyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando PDF com IA...
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
              <Button onClick={handleAnalyze} disabled={!file || analyzing}>
                {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : '🔍 Analisar Orçamento'}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Trip info */}
            {(tripInfo.client_name || tripInfo.origin || tripInfo.destination) && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">Informações da Viagem Detectadas</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {tripInfo.client_name && <div><span className="text-muted-foreground">Cliente:</span> {tripInfo.client_name}</div>}
                  {tripInfo.origin && <div><span className="text-muted-foreground">Origem:</span> {tripInfo.origin}</div>}
                  {tripInfo.destination && <div><span className="text-muted-foreground">Destino:</span> {tripInfo.destination}</div>}
                  {tripInfo.departure_date && <div><span className="text-muted-foreground">Ida:</span> {tripInfo.departure_date}</div>}
                  {tripInfo.return_date && <div><span className="text-muted-foreground">Volta:</span> {tripInfo.return_date}</div>}
                </div>
              </div>
            )}

            {/* Services table */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{services.length} serviço(s) encontrado(s)</p>
              <Button size="sm" variant="outline" onClick={addService}><Plus className="h-4 w-4 mr-1" />Adicionar Item</Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28">Custo (R$)</TableHead>
                    <TableHead className="w-16">Qtd</TableHead>
                    {marginMode === 'fixed' && <TableHead className="w-28">Venda (R$)</TableHead>}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="min-w-[160px]">
                        <Select
                          value={svc.service_type}
                          onValueChange={v => updateService(idx, 'service_type', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {serviceCatalog.map(c => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={svc.description} onChange={e => updateService(idx, 'description', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={svc.cost_price} onChange={e => updateService(idx, 'cost_price', parseFloat(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={svc.quantity} onChange={e => updateService(idx, 'quantity', parseInt(e.target.value) || 1)} />
                      </TableCell>
                      {marginMode === 'fixed' && (
                        <TableCell className="text-sm text-muted-foreground">
                          {(svc.cost_price * (svc.quantity || 1) * (1 + marginPercent / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeService(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-between items-center bg-muted/50 rounded-lg p-4">
              <div className="text-sm space-y-1">
                <p>Custo Total: <strong>{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
                {marginMode === 'fixed' && (
                  <p>Valor de Venda (com {marginPercent}%): <strong>{totalWithMargin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>← Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
                <Button onClick={handleConfirm} disabled={services.length === 0}>
                  <Check className="h-4 w-4 mr-2" />Confirmar e Importar ({services.length} itens)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
