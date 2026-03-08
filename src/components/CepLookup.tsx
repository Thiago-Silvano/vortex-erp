import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddressData {
  cep: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

interface CepLookupProps {
  data: AddressData;
  onChange: (data: Partial<AddressData>) => void;
}

export default function CepLookup({ data, onChange }: CepLookupProps) {
  const [loading, setLoading] = useState(false);

  const handleCepSearch = async () => {
    const cep = data.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (json.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      onChange({
        address: json.logradouro || '',
        neighborhood: json.bairro || '',
        city: json.localidade || '',
        state: json.uf || '',
        country: 'Brasil',
      });
      toast.success('Endereço encontrado!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>CEP</Label>
          <div className="flex gap-2">
            <Input
              placeholder="00000-000"
              value={data.cep}
              onChange={e => onChange({ cep: e.target.value })}
              maxLength={9}
            />
            <Button type="button" size="icon" variant="outline" onClick={handleCepSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input value={data.address} onChange={e => onChange({ address: e.target.value })} placeholder="Rua, Avenida..." />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Número</Label>
          <Input value={data.addressNumber} onChange={e => onChange({ addressNumber: e.target.value })} placeholder="Nº" />
        </div>
        <div>
          <Label>Complemento</Label>
          <Input value={data.complement} onChange={e => onChange({ complement: e.target.value })} placeholder="Apto, Bloco..." />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input value={data.neighborhood} onChange={e => onChange({ neighborhood: e.target.value })} />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input value={data.city} onChange={e => onChange({ city: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Estado</Label>
          <Input value={data.state} onChange={e => onChange({ state: e.target.value })} />
        </div>
        <div>
          <Label>País</Label>
          <Input value={data.country} onChange={e => onChange({ country: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
