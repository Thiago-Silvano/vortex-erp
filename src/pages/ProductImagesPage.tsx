import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Search, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface ProductImage {
  id: string;
  product_type: string;
  product_name: string;
  image_url: string;
  storage_path: string | null;
  keywords: string | null;
}

const TYPES = [
  { value: 'cidade', label: 'Cidade' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'servico', label: 'Serviço' },
  { value: 'carro', label: 'Carro' },
  { value: 'passeio', label: 'Passeio' },
  { value: 'experiencia', label: 'Experiência' },
];

export default function ProductImagesPage() {
  const { activeCompany } = useCompany();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productType, setProductType] = useState('hospedagem');
  const [productName, setProductName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const productNameRef = useRef<HTMLInputElement>(null);

  const fetch = async () => {
    if (!activeCompany?.id) return;
    const { data } = await (supabase.from('product_images' as any)
      .select('*').eq('empresa_id', activeCompany.id).order('product_name') as any);
    setImages((data || []) as ProductImage[]);
  };

  useEffect(() => { fetch(); }, [activeCompany?.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || !files.length) return;
    if (!productName.trim()) { toast.error('Informe o nome do produto antes de enviar.'); return; }
    if (!activeCompany?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${activeCompany.id}/${productType}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('product-images-library').upload(path, file);
        if (upErr) { toast.error(`Erro: ${file.name}`); continue; }
        const { data: pub } = supabase.storage.from('product-images-library').getPublicUrl(path);
        await (supabase.from('product_images' as any).insert({
          empresa_id: activeCompany.id,
          product_type: productType,
          product_name: productName.trim(),
          image_url: pub.publicUrl,
          storage_path: path,
          keywords: keywords.trim() || null,
        }) as any);
      }
      toast.success('Imagens salvas!');
      fetch();
      setProductName('');
      setKeywords('');
      setTimeout(() => productNameRef.current?.focus(), 0);
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (img: ProductImage) => {
    if (!confirm('Remover esta imagem?')) return;
    if (img.storage_path) await supabase.storage.from('product-images-library').remove([img.storage_path]);
    await (supabase.from('product_images' as any).delete().eq('id', img.id) as any);
    fetch();
  };

  const filtered = images.filter(i => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return i.product_name.toLowerCase().includes(q) || (i.keywords || '').toLowerCase().includes(q) || i.product_type.toLowerCase().includes(q);
  });

  // Agrupar por nome do produto
  const grouped = filtered.reduce<Record<string, ProductImage[]>>((acc, img) => {
    const key = `${img.product_type}::${img.product_name}`;
    (acc[key] ||= []).push(img); return acc;
  }, {});

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Biblioteca de Imagens</h1>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImagePlus className="h-4 w-4"/> Cadastrar imagens</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome do produto</Label>
                <Input ref={productNameRef} value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ex: Hotel Copacabana Palace" />
              </div>
              <div>
                <Label>Palavras-chave (opcional)</Label>
                <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="rio, praia, luxo" />
              </div>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary/90 text-primary-foreground w-fit">
              <Upload className="h-4 w-4"/>{uploading ? 'Enviando...' : 'Enviar imagens'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading}/>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Imagens cadastradas ({images.length})</CardTitle>
              <div className="relative w-72">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou palavra-chave" className="pl-8"/>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma imagem cadastrada</p>}
            {Object.entries(grouped).map(([key, imgs]) => {
              const [type, name] = key.split('::');
              return (
                <div key={key} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{type}</span>
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">({imgs.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {imgs.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.image_url} alt={name} className="h-24 w-32 object-cover rounded border"/>
                        <button onClick={() => handleDelete(img)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}