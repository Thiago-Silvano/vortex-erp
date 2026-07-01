import { useEffect } from 'react';
import { DS160StepProps, REDES_SOCIAIS_OPTIONS } from './types';
import { maskPhone } from '@/lib/masks';
import { SectionTitle, SubTitle, TextField, CountryField, UfField, CityField, SelectField, YesNo, NACheckbox, Repeatable } from './fields';

const REDES_OPTS = REDES_SOCIAIS_OPTIONS.filter(o => o.code !== 'NONE').map(o => ({ value: o.label, label: o.label }));

export default function DS160Step6({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.pais_residencia) onChange('pais_residencia', 'Brasil');
    if (data.endereco_postal_igual === undefined) onChange('endereco_postal_igual', true);
    if (data.telefone_secundario_na === undefined) onChange('telefone_secundario_na', true);
    if (data.telefone_trabalho_na === undefined) onChange('telefone_trabalho_na', true);
    if (data.email_adicional === undefined) onChange('email_adicional', false);
    if (data.telefone_adicional === undefined) onChange('telefone_adicional', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pais = data.pais_residencia || 'Brasil';

  return (
    <div className="space-y-6">
      <SectionTitle>6. Endereço, Contato e Redes Sociais</SectionTitle>

      <SubTitle>Endereço residencial</SubTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2"><TextField label="Logradouro" error={errors?.endereco_linha1} value={data.endereco_linha1} onChange={v => onChange('endereco_linha1', v)} /></div>
        <TextField label="Número" error={errors?.numero} value={data.numero} onChange={v => onChange('numero', v)} />
      </div>
      <TextField label="Complemento" value={data.endereco_linha2} onChange={v => onChange('endereco_linha2', v)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountryField label="País" value={pais} onChange={v => onChange('pais_residencia', v)} />
        <TextField label="CEP" error={errors?.cep} value={data.cep} onChange={v => onChange('cep', v)} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UfField label="UF / Estado" error={errors?.estado_residencia} value={data.estado_residencia} onChange={v => { onChange('estado_residencia', v); onChange('cidade_residencia', ''); }} country={pais} />
        <CityField label="Cidade" error={errors?.cidade_residencia} value={data.cidade_residencia} onChange={v => onChange('cidade_residencia', v)} uf={data.estado_residencia || ''} country={pais} />
      </div>

      <YesNo label="Seu endereço de correspondência é o mesmo do residencial?" value={data.endereco_postal_igual ?? true} onChange={v => onChange('endereco_postal_igual', v)} />
      {data.endereco_postal_igual === false && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2"><TextField label="Logradouro" error={errors?.endereco_postal_linha1} value={data.endereco_postal_linha1} onChange={v => onChange('endereco_postal_linha1', v)} /></div>
            <TextField label="Número" error={errors?.endereco_postal_numero} value={data.endereco_postal_numero} onChange={v => onChange('endereco_postal_numero', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Cidade" error={errors?.endereco_postal_cidade} value={data.endereco_postal_cidade} onChange={v => onChange('endereco_postal_cidade', v)} />
            <TextField label="UF / Estado" error={errors?.endereco_postal_estado} value={data.endereco_postal_estado} onChange={v => onChange('endereco_postal_estado', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="CEP" error={errors?.endereco_postal_cep} value={data.endereco_postal_cep} onChange={v => onChange('endereco_postal_cep', v)} inputMode="numeric" />
            <CountryField label="País" error={errors?.endereco_postal_pais} value={data.endereco_postal_pais || 'Brasil'} onChange={v => onChange('endereco_postal_pais', v)} />
          </div>
        </div>
      )}

      <SubTitle>Contato</SubTitle>
      <TextField label="Telefone principal (celular/WhatsApp)" error={errors?.telefone} value={data.telefone} onChange={v => onChange('telefone', maskPhone(v))} inputMode="numeric" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TextField label="Telefone secundário" value={data.telefone_secundario} onChange={v => onChange('telefone_secundario', maskPhone(v))} inputMode="numeric" disabled={data.telefone_secundario_na ?? true} />
          <NACheckbox checked={data.telefone_secundario_na ?? true} onChange={c => { onChange('telefone_secundario_na', c); if (c) onChange('telefone_secundario', ''); }} />
        </div>
        <div>
          <TextField label="Telefone do trabalho" value={data.telefone_trabalho} onChange={v => onChange('telefone_trabalho', maskPhone(v))} inputMode="numeric" disabled={data.telefone_trabalho_na ?? true} />
          <NACheckbox checked={data.telefone_trabalho_na ?? true} onChange={c => { onChange('telefone_trabalho_na', c); if (c) onChange('telefone_trabalho', ''); }} />
        </div>
      </div>
      <TextField label="Email" error={errors?.email} value={data.email} onChange={v => onChange('email', v)} type="email" />

      <YesNo label="Tem email adicional?" value={data.email_adicional ?? false} onChange={v => onChange('email_adicional', v)} />
      {data.email_adicional && (
        <Repeatable items={data.email_adicional_lista || []} onChange={v => onChange('email_adicional_lista', v)} blank={() => ''} addLabel="Adicionar email" error={errors?.email_adicional_lista}
          renderItem={(it: any, update) => <TextField label="Email" value={it} onChange={v => update(v)} type="email" />} />
      )}
      <YesNo label="Tem telefone adicional?" value={data.telefone_adicional ?? false} onChange={v => onChange('telefone_adicional', v)} />
      {data.telefone_adicional && (
        <Repeatable items={data.telefone_adicional_lista || []} onChange={v => onChange('telefone_adicional_lista', v)} blank={() => ''} addLabel="Adicionar telefone" error={errors?.telefone_adicional_lista}
          renderItem={(it: any, update) => <TextField label="Telefone" value={it} onChange={v => update(maskPhone(v))} inputMode="numeric" />} />
      )}

      <SubTitle>Redes sociais</SubTitle>
      <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
        <input type="checkbox" checked={!!data.sem_redes_sociais} onChange={e => { onChange('sem_redes_sociais', e.target.checked); if (e.target.checked) onChange('redes_sociais', []); }} />
        Não tenho redes sociais
      </label>
      {!data.sem_redes_sociais && (
        <Repeatable
          items={data.redes_sociais || []}
          onChange={v => onChange('redes_sociais', v)}
          blank={() => ({ plataforma: '', usuario: '' })}
          addLabel="Adicionar rede social"
          emptyHint="Adicione suas redes sociais (apenas o @/usuário, sem link)."
          error={errors?.redes_sociais}
          renderItem={(it: any, update) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SelectField label="Plataforma" options={REDES_OPTS} value={it.plataforma} onChange={v => update({ ...it, plataforma: v })} />
              <TextField label="Usuário / @" help="Apenas o nome de usuário, sem URL." value={it.usuario} onChange={v => update({ ...it, usuario: v })} />
            </div>
          )}
        />
      )}
    </div>
  );
}
