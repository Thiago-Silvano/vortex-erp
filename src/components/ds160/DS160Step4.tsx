import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X } from 'lucide-react';
import { DS160StepProps } from './types';
import { FieldError, errClass } from './fieldError';

export default function DS160Step4({ data, onChange, errors }: DS160StepProps) {
  const companions: { nome: string; parentesco: string }[] = data.acompanhantes || [];
  const [compNome, setCompNome] = useState('');
  const [compParentesco, setCompParentesco] = useState('');

  const addCompanion = () => {
    if (!compNome.trim()) return;
    onChange('acompanhantes', [...companions, { nome: compNome.trim(), parentesco: compParentesco.trim() }]);
    setCompNome(''); setCompParentesco('');
  };

  const visitas: { data_chegada: string; duracao: string }[] = data.visitas_eua || [{ data_chegada: '', duracao: '' }];
  const updateVisita = (idx: number, key: string, value: string) => {
    const next = visitas.map((v, i) => (i === idx ? { ...v, [key]: value } : v));
    onChange('visitas_eua', next);
  };
  const addVisita = () => onChange('visitas_eua', [...visitas, { data_chegada: '', duracao: '' }]);
  const removeVisita = (idx: number) => onChange('visitas_eua', visitas.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">4. Detalhes da Viagem</h2>
      <p className="text-sm text-slate-500">Se você não possui uma viagem com data e local definidos, preencha com uma intenção de viagem.</p>
      <div>
        <Label>Motivo da Viagem</Label>
        <Select value={data.motivo_viagem || undefined} onValueChange={v => onChange('motivo_viagem', v)}>
          <SelectTrigger className={errClass(errors?.motivo_viagem)}><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Turismo e Negócios B1/B2','Negócios B1','Turismo B2','Estudo F1'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldError msg={errors?.motivo_viagem} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Data de Ida (Previsão)</Label><Input type="date" className={errClass(errors?.data_ida)} value={data.data_ida || ''} onChange={e => onChange('data_ida', e.target.value)} /><FieldError msg={errors?.data_ida} /></div>
        <div><Label>Data de Volta (Previsão)</Label><Input type="date" className={errClass(errors?.data_volta)} value={data.data_volta || ''} onChange={e => onChange('data_volta', e.target.value)} /><FieldError msg={errors?.data_volta} /></div>
      </div>
      <div><Label>Duração Estimada da Viagem (em dias)</Label><Input type="number" className={errClass(errors?.duracao_viagem)} value={data.duracao_viagem || ''} onChange={e => onChange('duracao_viagem', e.target.value)} /><FieldError msg={errors?.duracao_viagem} /></div>
      <div><Label>Cidade Principal de Destino nos EUA</Label><Input className={errClass(errors?.cidade_destino_eua)} value={data.cidade_destino_eua || ''} onChange={e => onChange('cidade_destino_eua', e.target.value)} /><FieldError msg={errors?.cidade_destino_eua} /></div>
      <div><Label>Local de Hospedagem (Nome do Hotel ou Endereço)</Label><Input value={data.local_hospedagem || ''} onChange={e => onChange('local_hospedagem', e.target.value)} /></div>
      <div>
        <Label>Quem pagará a viagem?</Label>
        <Select value={data.pagador_viagem || undefined} onValueChange={v => onChange('pagador_viagem', v)}>
          <SelectTrigger className={errClass(errors?.pagador_viagem)}><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Eu mesmo','Outra pessoa','Empresa','Outro'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldError msg={errors?.pagador_viagem} />
      </div>
      {(data.pagador_viagem === 'Outra pessoa' || data.pagador_viagem === 'Outro') && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <h3 className="font-semibold text-sm text-slate-700">Dados do Pagador (Outra pessoa)</h3>
          <div><Label>Nome Completo do Pagador</Label><Input className={errClass(errors?.pagador_nome)} value={data.pagador_nome || ''} onChange={e => onChange('pagador_nome', e.target.value)} /><FieldError msg={errors?.pagador_nome} /></div>
          <div>
            <Label>Parentesco com o pagador</Label>
            <Select value={data.pagador_parentesco || undefined} onValueChange={v => onChange('pagador_parentesco', v)}>
              <SelectTrigger className={errClass(errors?.pagador_parentesco)}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {['Cônjuge','Filho(a)','Pai/Mãe','Irmão/Irmã','Amigo(a)','Outro'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldError msg={errors?.pagador_parentesco} />
          </div>
          <div><Label>Endereço Completo do Pagador</Label><Input value={data.pagador_endereco || ''} onChange={e => onChange('pagador_endereco', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Email do Pagador</Label><Input value={data.pagador_email || ''} onChange={e => onChange('pagador_email', e.target.value)} /></div>
            <div><Label>Telefone do Pagador</Label><Input className={errClass(errors?.pagador_telefone)} value={data.pagador_telefone || ''} onChange={e => onChange('pagador_telefone', e.target.value)} /><FieldError msg={errors?.pagador_telefone} /></div>
          </div>
        </div>
      )}
      {data.pagador_viagem === 'Empresa' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <h3 className="font-semibold text-sm text-slate-700">Dados da Empresa Pagadora</h3>
          <div><Label>Nome da Empresa</Label><Input className={errClass(errors?.pagador_empresa_nome)} value={data.pagador_empresa_nome || ''} onChange={e => onChange('pagador_empresa_nome', e.target.value)} /><FieldError msg={errors?.pagador_empresa_nome} /></div>
          <div><Label>Endereço da Empresa</Label><Input value={data.pagador_empresa_endereco || ''} onChange={e => onChange('pagador_empresa_endereco', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Email da Empresa</Label><Input value={data.pagador_empresa_email || ''} onChange={e => onChange('pagador_empresa_email', e.target.value)} /></div>
            <div><Label>Telefone da Empresa</Label><Input className={errClass(errors?.pagador_empresa_telefone)} value={data.pagador_empresa_telefone || ''} onChange={e => onChange('pagador_empresa_telefone', e.target.value)} /><FieldError msg={errors?.pagador_empresa_telefone} /></div>
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
      <div>
        <Label>Histórico de Viagens Anteriores aos EUA</Label>
        <RadioGroup value={data.historico_viagens_eua_tipo || 'Não fui'} onValueChange={v => onChange('historico_viagens_eua_tipo', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não fui" id="hist_nao" /><Label htmlFor="hist_nao">Não fui</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Já fui" id="hist_sim" /><Label htmlFor="hist_sim">Já fui</Label></div>
        </RadioGroup>
      </div>
      {data.historico_viagens_eua_tipo === 'Já fui' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          {visitas.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end border-b border-slate-200 last:border-0 pb-3 last:pb-0">
              <div><Label>Data de chegada</Label><Input type="date" value={v.data_chegada || ''} onChange={e => updateVisita(i, 'data_chegada', e.target.value)} /></div>
              <div className="flex gap-2 items-end">
                <div className="flex-1"><Label>Quanto tempo ficou?</Label><Input value={v.duracao || ''} onChange={e => updateVisita(i, 'duracao', e.target.value)} placeholder="Ex: 15 dias" /></div>
                {visitas.length > 1 && <Button type="button" variant="outline" size="sm" onClick={() => removeVisita(i)}><X className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addVisita} className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar outra visita</Button>
        </div>
      )}
      <div>
        <Label>Já possuiu visto americano?</Label>
        <RadioGroup value={data.ja_teve_visto || 'Não'} onValueChange={v => onChange('ja_teve_visto', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="visto_nao" /><Label htmlFor="visto_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="visto_sim" /><Label htmlFor="visto_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.ja_teve_visto === 'Sim' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div><Label>Número do Visto (opcional)</Label><Input value={data.visto_anterior_numero || ''} onChange={e => onChange('visto_anterior_numero', e.target.value)} /></div>
          <div><Label>Consulado Emissor</Label><Input value={data.visto_anterior_consulado || ''} onChange={e => onChange('visto_anterior_consulado', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de Emissão</Label><Input type="date" value={data.visto_anterior_emissao || ''} onChange={e => onChange('visto_anterior_emissao', e.target.value)} /></div>
            <div><Label>Data de Validade</Label><Input type="date" value={data.visto_anterior_validade || ''} onChange={e => onChange('visto_anterior_validade', e.target.value)} /></div>
          </div>
          <div>
            <Label>O visto ainda está válido?</Label>
            <RadioGroup value={data.visto_anterior_valido || 'Não'} onValueChange={v => onChange('visto_anterior_valido', v)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="valido_nao" /><Label htmlFor="valido_nao">Não</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="valido_sim" /><Label htmlFor="valido_sim">Sim</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label>O visto foi cancelado ou revogado?</Label>
            <RadioGroup value={data.visto_anterior_cancelado || 'Não'} onValueChange={v => onChange('visto_anterior_cancelado', v)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="cancelado_nao" /><Label htmlFor="cancelado_nao">Não</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="cancelado_sim" /><Label htmlFor="cancelado_sim">Sim</Label></div>
            </RadioGroup>
          </div>
          {data.visto_anterior_cancelado === 'Sim' && (
            <div><Label>Explique brevemente</Label><Textarea value={data.visto_anterior_cancelado_explicacao || ''} onChange={e => onChange('visto_anterior_cancelado_explicacao', e.target.value)} rows={2} /></div>
          )}
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
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Ano em que foi negado</Label><Input className={errClass(errors?.visto_negado_ano)} value={data.visto_negado_ano || ''} onChange={e => onChange('visto_negado_ano', e.target.value)} placeholder="AAAA" /><FieldError msg={errors?.visto_negado_ano} /></div>
            <div><Label>Tipo de visto solicitado</Label><Input value={data.visto_negado_tipo || ''} onChange={e => onChange('visto_negado_tipo', e.target.value)} /></div>
          </div>
          <div><Label>Motivo informado pelo consulado (se souber)</Label><Textarea value={data.visto_negado_motivo || ''} onChange={e => onChange('visto_negado_motivo', e.target.value)} rows={2} /></div>
          <div><Label>Explique o motivo da negativa</Label><Textarea value={data.visto_negado_explicacao || ''} onChange={e => onChange('visto_negado_explicacao', e.target.value)} rows={3} placeholder="Descreva as circunstâncias da negativa..." /></div>
        </div>
      )}
      <div>
        <Label>Já teve alguma petição de imigração (Green Card ou similar) negada?</Label>
        <RadioGroup value={data.peticao_imigracao_negada || 'Não'} onValueChange={v => onChange('peticao_imigracao_negada', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="peticao_nao" /><Label htmlFor="peticao_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="peticao_sim" /><Label htmlFor="peticao_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.peticao_imigracao_negada === 'Sim' && (
        <div><Label>Explique brevemente</Label><Textarea value={data.peticao_imigracao_negada_explicacao || ''} onChange={e => onChange('peticao_imigracao_negada_explicacao', e.target.value)} rows={3} /></div>
      )}
    </div>
  );
}
