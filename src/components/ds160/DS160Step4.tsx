import { useEffect } from 'react';
import { DS160StepProps, PARENTESCO_ACOMP_OPTIONS } from './types';
import { SectionTitle, TextField, SelectField, YesNo, Repeatable } from './fields';

// Serializa cada acompanhante em "Nome Sobrenome (RELACAO)" — formato lido pelo robô.
function serializar(lista: any[]): string[] {
  return (lista || [])
    .map(a => {
      const nome = `${(a.nome || '').trim()} ${(a.sobrenome || '').trim()}`.trim();
      if (!nome) return '';
      return a.relacao ? `${nome} (${a.relacao})` : nome;
    })
    .filter(Boolean);
}

export default function DS160Step4({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (data.tem_acompanhantes === undefined) onChange('tem_acompanhantes', false);
    if (data.viaja_em_grupo === undefined) onChange('viaja_em_grupo', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLista = (lista: any[]) => {
    onChange('acompanhantes_lista', lista);
    onChange('acompanhantes', serializar(lista));
  };

  return (
    <div className="space-y-6">
      <SectionTitle>4. Companheiros de Viagem</SectionTitle>
      <YesNo label="Mais alguém está viajando com você?" value={data.tem_acompanhantes ?? false} onChange={v => { onChange('tem_acompanhantes', v); if (!v) { onChange('acompanhantes', []); onChange('acompanhantes_lista', []); } }} />

      {data.tem_acompanhantes && (
        <>
          <YesNo label="Você está viajando como parte de um grupo/organização?" value={data.viaja_em_grupo ?? false} onChange={v => onChange('viaja_em_grupo', v)} />
          {data.viaja_em_grupo ? (
            <TextField label="Nome do grupo/organização" error={errors?.grupo_nome} value={data.grupo_nome} onChange={v => onChange('grupo_nome', v)} />
          ) : (
            <Repeatable
              label="Acompanhantes"
              items={data.acompanhantes_lista || []}
              onChange={setLista}
              blank={() => ({ sobrenome: '', nome: '', relacao: '' })}
              addLabel="Adicionar acompanhante"
              emptyHint="Adicione cada pessoa que viaja com você."
              error={errors?.acompanhantes_lista}
              renderItem={(it: any, update) => (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextField label="Sobrenome" value={it.sobrenome} onChange={v => update({ ...it, sobrenome: v })} />
                    <TextField label="Nome" value={it.nome} onChange={v => update({ ...it, nome: v })} />
                  </div>
                  <SelectField label="Relação" options={PARENTESCO_ACOMP_OPTIONS} value={it.relacao} onChange={v => update({ ...it, relacao: v })} />
                </div>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}
