import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X } from 'lucide-react';
import { DS160StepProps } from './types';

export default function DS160Step4({ data, onChange }: DS160StepProps) {
  const companions: { nome: string; parentesco: string }[] = data.acompanhantes || [];
  const [compNome, setCompNome] = useState('');
  const [compParentesco, setCompParentesco] = useState('');

  const addCompanion = () => {
    if (!compNome.trim()) return;
    onChange('acompanhantes', [...companions, { nome: compNome.trim(), parentesco: compParentesco.trim() }]);
    setCompNome(''); setCompParentesco('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">4. Detalhes da Viagem</h2>
      <p className="text-sm text-slate-500">Se você não possui uma viagem com data e local definidos, preencha com uma intenção de viagem.</p>
      <div>
        <Label>Motivo da Viagem</Label>
        <Select value={data.motivo_viagem || ''} onValueChange={v => onChange('motivo_viagem', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Turismo e Negócios B1/B2','Negócios B1','Turismo B2','Estudo F1'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Data de Ida (Previsão)</Label><Input type="date" value={data.data_ida || ''} onChange={e => onChange('data_ida', e.target.value)} /></div>
        <div><Label>Data de Volta (Previsão)</Label><Input type="date" value={data.data_volta || ''} onChange={e => onChange('data_volta', e.target.value)} /></div>
      </div>
      <div><Label>Duração Estimada da Viagem (em dias)</Label><Input type="number" value={data.duracao_viagem || ''} onChange={e => onChange('duracao_viagem', e.target.value)} /></div>
      <div><Label>Cidade Principal de Destino nos EUA</Label><Input value={data.cidade_destino_eua || ''} onChange={e => onChange('cidade_destino_eua', e.target.value)} /></div>
      <div><Label>Local de Hospedagem (Nome do Hotel ou Endereço)</Label><Input value={data.local_hospedagem || ''} onChange={e => onChange('local_hospedagem', e.target.value)} /></div>
      <div>
        <Label>Quem pagará a viagem?</Label>
        <Select value={data.pagador_viagem || ''} onValueChange={v => onChange('pagador_viagem', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Eu mesmo','Pai/Mãe','Empregador atual','Outro'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {data.pagador_viagem === 'Outro' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <h3 className="font-semibold text-sm text-slate-700">Dados do Pagador (Terceiro)</h3>
          <div><Label>Nome Completo do Pagador</Label><Input value={data.pagador_nome || ''} onChange={e => onChange('pagador_nome', e.target.value)} /></div>
          <div><Label>Endereço Completo do Pagador</Label><Input value={data.pagador_endereco || ''} onChange={e => onChange('pagador_endereco', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Email do Pagador</Label><Input value={data.pagador_email || ''} onChange={e => onChange('pagador_email', e.target.value)} /></div>
            <div><Label>Telefone do Pagador</Label><Input value={data.pagador_telefone || ''} onChange={e => onChange('pagador_telefone', e.target.value)} /></div>
          </div>
        </div>
      )}
      <div>
        <Label>Pessoas que viajam com você</Label>
        <div className="flex gap-2 mt-1">
          <Input value={compNome} onChange={e => setCompNome(e.target.value)} placeholder="Nome" className="flex-1" />
          <Input value={compParentesco} onChange={e => setCompParentesco(e.target.value)} placeholder="Parentesco" className="w-32" />
          <Button type="button" onClick={addCompanion} size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
        {companions.length > 0 && (
          <div className="space-y-1 mt-2">
            {companions.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm">
                <span className="flex-1">{c.nome} {c.parentesco && `(${c.parentesco})`}</span>
                <button onClick={() => onChange('acompanhantes', companions.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div><Label>Histórico de Viagens Anteriores aos EUA (Datas e duração)</Label><Textarea value={data.historico_viagens_eua || ''} onChange={e => onChange('historico_viagens_eua', e.target.value)} rows={3} /></div>
      <div>
        <Label>Já possuiu visto americano?</Label>
        <RadioGroup value={data.ja_teve_visto || 'Não'} onValueChange={v => onChange('ja_teve_visto', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="visto_nao" /><Label htmlFor="visto_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="visto_sim" /><Label htmlFor="visto_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.ja_teve_visto === 'Sim' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div><Label>Número do Visto</Label><Input value={data.visto_anterior_numero || ''} onChange={e => onChange('visto_anterior_numero', e.target.value)} /></div>
          <div><Label>Consulado Emissor</Label><Input value={data.visto_anterior_consulado || ''} onChange={e => onChange('visto_anterior_consulado', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de Emissão</Label><Input type="date" value={data.visto_anterior_emissao || ''} onChange={e => onChange('visto_anterior_emissao', e.target.value)} /></div>
            <div><Label>Data de Validade</Label><Input type="date" value={data.visto_anterior_validade || ''} onChange={e => onChange('visto_anterior_validade', e.target.value)} /></div>
          </div>
        </div>
      )}
      <div>
        <Label>Você já teve um visto americano negado?</Label>
        <RadioGroup value={data.visto_negado || 'Não'} onValueChange={v => onChange('visto_negado', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="negado_nao" /><Label htmlFor="negado_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="negado_sim" /><Label htmlFor="negado_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.visto_negado === 'Sim' && (
        <div><Label>Explique o motivo da negativa</Label><Textarea value={data.visto_negado_explicacao || ''} onChange={e => onChange('visto_negado_explicacao', e.target.value)} rows={3} placeholder="Descreva as circunstâncias da negativa..." /></div>
      )}
    </div>
  );
}
