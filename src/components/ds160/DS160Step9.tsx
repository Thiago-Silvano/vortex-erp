import { useEffect } from 'react';
import { DS160StepProps, STATUS_EUA_OPTIONS } from './types';
import { SectionTitle, SubTitle, TextField, DateField, SelectField, YesNo, NACheckbox, Repeatable } from './fields';

export default function DS160Step9({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    ['pai_nos_eua', 'mae_nos_eua', 'parentes_nos_eua'].forEach(k => { if (data[k] === undefined) onChange(k, false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>9. Família (Pais)</SectionTitle>

      <SubTitle>Pai</SubTitle>
      <div>
        <TextField label="Nome completo do pai" error={errors?.pai_nome} value={data.pai_nome} onChange={v => onChange('pai_nome', v)} disabled={!!data.pai_nome_na} />
        <NACheckbox label="Não sei" checked={!!data.pai_nome_na} onChange={c => { onChange('pai_nome_na', c); if (c) onChange('pai_nome', ''); }} />
      </div>
      <div>
        <DateField label="Data de nascimento do pai" value={data.pai_nascimento} onChange={v => onChange('pai_nascimento', v)} disabled={!!data.pai_nascimento_na} />
        <NACheckbox label="Não sei" checked={!!data.pai_nascimento_na} onChange={c => { onChange('pai_nascimento_na', c); if (c) onChange('pai_nascimento', ''); }} />
      </div>
      <YesNo label="Seu pai está nos EUA?" value={data.pai_nos_eua ?? false} onChange={v => onChange('pai_nos_eua', v)} />
      {data.pai_nos_eua && (
        <SelectField label="Status do pai nos EUA" options={STATUS_EUA_OPTIONS} error={errors?.pai_status_eua} value={data.pai_status_eua} onChange={v => onChange('pai_status_eua', v)} />
      )}

      <SubTitle>Mãe</SubTitle>
      <div>
        <TextField label="Nome completo da mãe" error={errors?.mae_nome} value={data.mae_nome} onChange={v => onChange('mae_nome', v)} disabled={!!data.mae_nome_na} />
        <NACheckbox label="Não sei" checked={!!data.mae_nome_na} onChange={c => { onChange('mae_nome_na', c); if (c) onChange('mae_nome', ''); }} />
      </div>
      <div>
        <DateField label="Data de nascimento da mãe" value={data.mae_nascimento} onChange={v => onChange('mae_nascimento', v)} disabled={!!data.mae_nascimento_na} />
        <NACheckbox label="Não sei" checked={!!data.mae_nascimento_na} onChange={c => { onChange('mae_nascimento_na', c); if (c) onChange('mae_nascimento', ''); }} />
      </div>
      <YesNo label="Sua mãe está nos EUA?" value={data.mae_nos_eua ?? false} onChange={v => onChange('mae_nos_eua', v)} />
      {data.mae_nos_eua && (
        <SelectField label="Status da mãe nos EUA" options={STATUS_EUA_OPTIONS} error={errors?.mae_status_eua} value={data.mae_status_eua} onChange={v => onChange('mae_status_eua', v)} />
      )}

      <YesNo label="Você tem outros parentes diretos nos EUA (irmãos, filhos, noivo(a))?" value={data.parentes_nos_eua ?? false} onChange={v => onChange('parentes_nos_eua', v)} />
      {data.parentes_nos_eua && (
        <Repeatable
          label="Parentes nos EUA"
          items={data.parentes_lista || []}
          onChange={v => onChange('parentes_lista', v)}
          blank={() => ({ sobrenome: '', nome: '', relacao: '', status: '' })}
          addLabel="Adicionar parente"
          error={errors?.parentes_lista}
          renderItem={(it: any, update) => (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Sobrenome(s)" value={it.sobrenome} onChange={v => update({ ...it, sobrenome: v })} />
                <TextField label="Nome(s)" value={it.nome} onChange={v => update({ ...it, nome: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Relação" value={it.relacao} onChange={v => update({ ...it, relacao: v })} placeholder="Ex: Irmão" />
                <SelectField label="Status nos EUA" options={STATUS_EUA_OPTIONS} value={it.status} onChange={v => update({ ...it, status: v })} />
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
