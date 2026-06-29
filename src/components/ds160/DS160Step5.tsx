import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps } from './types';

export default function DS160Step5({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">5. Contato nos EUA</h2>
      <div>
        <Label>Possui contato nos EUA?</Label>
        <RadioGroup value={data.possui_contato_eua || 'Não tenho contato'} onValueChange={v => onChange('possui_contato_eua', v)} className="flex flex-wrap gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não tenho contato" id="contato_eua_nao" /><Label htmlFor="contato_eua_nao">Não tenho contato</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Tenho contato" id="contato_eua_sim" /><Label htmlFor="contato_eua_sim">Tenho contato</Label></div>
        </RadioGroup>
      </div>
      {data.possui_contato_eua === 'Tenho contato' && (
        <div className="space-y-4">
          <div><Label>Nome Completo do Contato</Label><Input value={data.contato_eua_nome || ''} onChange={e => onChange('contato_eua_nome', e.target.value)} /></div>
          <div><Label>Organização/Empresa/Hotel (opcional)</Label><Input value={data.contato_eua_organizacao || ''} onChange={e => onChange('contato_eua_organizacao', e.target.value)} placeholder="Para quando o contato for um hotel ou empresa" /></div>
          <div><Label>Relação com o Contato</Label><Input value={data.contato_eua_relacao || ''} onChange={e => onChange('contato_eua_relacao', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Telefone do Contato</Label><Input value={data.contato_eua_telefone || ''} onChange={e => onChange('contato_eua_telefone', e.target.value)} /></div>
            <div><Label>Email do Contato</Label><Input value={data.contato_eua_email || ''} onChange={e => onChange('contato_eua_email', e.target.value)} /></div>
          </div>
          <div><Label>Endereço Completo do Contato</Label><Input value={data.contato_eua_endereco || ''} onChange={e => onChange('contato_eua_endereco', e.target.value)} /></div>
        </div>
      )}
    </div>
  );
}
