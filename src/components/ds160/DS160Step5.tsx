import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DS160StepProps } from './types';

export default function DS160Step5({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">5. Contato nos EUA</h2>
      <div><Label>Nome Completo do Contato</Label><Input value={data.contato_eua_nome || ''} onChange={e => onChange('contato_eua_nome', e.target.value)} /></div>
      <div><Label>Relação com o Contato</Label><Input value={data.contato_eua_relacao || ''} onChange={e => onChange('contato_eua_relacao', e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Telefone do Contato</Label><Input value={data.contato_eua_telefone || ''} onChange={e => onChange('contato_eua_telefone', e.target.value)} /></div>
        <div><Label>Email do Contato</Label><Input value={data.contato_eua_email || ''} onChange={e => onChange('contato_eua_email', e.target.value)} /></div>
      </div>
      <div><Label>Endereço Completo do Contato</Label><Input value={data.contato_eua_endereco || ''} onChange={e => onChange('contato_eua_endereco', e.target.value)} /></div>
    </div>
  );
}
