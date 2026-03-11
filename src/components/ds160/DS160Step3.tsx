import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { DS160StepProps } from './types';
import { maskPhone } from '@/lib/masks';

export default function DS160Step3({ data, onChange }: DS160StepProps) {
  const socialMedias: string[] = data.redes_sociais || [];

  const [newSocial, setNewSocial] = useState('');

  const addSocial = () => {
    if (!newSocial.trim()) return;
    onChange('redes_sociais', [...socialMedias, newSocial.trim()]);
    setNewSocial('');
  };

  const removeSocial = (idx: number) => {
    onChange('redes_sociais', socialMedias.filter((_, i) => i !== idx));
  };

  const fetchCep = async () => {
    const cep = (data.contato_cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (!d.erro) {
        onChange('contato_endereco', d.logradouro || '');
        onChange('contato_bairro', d.bairro || '');
        onChange('contato_cidade', d.localidade || '');
        onChange('contato_estado', d.uf || '');
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">3. Contatos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>CEP (8 dígitos)</Label><Input value={data.contato_cep || ''} onChange={e => onChange('contato_cep', e.target.value.replace(/\D/g, '').slice(0,8))} placeholder="00000000" /></div>
          <Button type="button" onClick={fetchCep} variant="outline" size="sm" className="mb-0.5">Buscar</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Endereço (Rua/Av)</Label><Input value={data.contato_endereco || ''} onChange={e => onChange('contato_endereco', e.target.value)} /></div>
        <div><Label>Número / Complemento</Label><Input value={data.contato_numero || ''} onChange={e => onChange('contato_numero', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Bairro</Label><Input value={data.contato_bairro || ''} onChange={e => onChange('contato_bairro', e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={data.contato_cidade || ''} onChange={e => onChange('contato_cidade', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Estado (UF)</Label><Input value={data.contato_estado || ''} onChange={e => onChange('contato_estado', e.target.value)} /></div>
        <div><Label>País</Label><Input value={data.contato_pais || 'Brasil'} onChange={e => onChange('contato_pais', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Telefone Celular</Label><Input value={data.contato_telefone || ''} onChange={e => onChange('contato_telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
        <div><Label>Email Atual</Label><Input type="email" value={data.contato_email || ''} onChange={e => onChange('contato_email', e.target.value.toLowerCase())} placeholder="exemplo@email.com" /></div>
      </div>
      <div>
        <Label>Redes Sociais</Label>
        <div className="flex gap-2 mt-1">
          <Input value={newSocial} onChange={e => setNewSocial(e.target.value)} placeholder="Ex: Instagram @usuario" className="flex-1" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSocial())} />
          <Button type="button" onClick={addSocial} size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
        {socialMedias.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {socialMedias.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-sm px-3 py-1 rounded-full">
                {s}
                <button onClick={() => removeSocial(i)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        {socialMedias.length === 0 && <p className="text-xs text-slate-400 mt-1">Clique em '+' para listar suas contas (Ex: Instagram, Facebook).</p>}
      </div>
    </div>
  );
}
