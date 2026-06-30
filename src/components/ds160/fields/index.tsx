import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { errClass, FieldError } from '../fieldError';
import { COUNTRIES, Opt, US_STATES } from '../types';
import { BRAZIL_STATES, isBrasil } from '@/data/brazil-states';
import BrazilCitySelect from '../BrazilCitySelect';

export function HelpTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help text-slate-400 hover:text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Field({
  label, help, error, children,
}: { label: ReactNode; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1.5 text-slate-600">
        {label}
        {help && <HelpTooltip text={help} />}
      </Label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

interface BaseFieldProps {
  label: ReactNode;
  help?: string;
  error?: string;
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TextField({
  label, help, error, value, onChange, placeholder, disabled, type = 'text', inputMode,
}: BaseFieldProps & { type?: string; inputMode?: any }) {
  return (
    <Field label={label} help={help} error={error}>
      <Input
        type={type}
        inputMode={inputMode}
        className={errClass(error)}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}

export function AreaField({
  label, help, error, value, onChange, placeholder, disabled, rows = 3,
}: BaseFieldProps & { rows?: number }) {
  return (
    <Field label={label} help={help} error={error}>
      <Textarea
        className={errClass(error)}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
      />
    </Field>
  );
}

export function DateField({
  label, help, error, value, onChange, disabled,
}: BaseFieldProps) {
  return (
    <Field label={label} help={help} error={error}>
      <Input
        type="date"
        className={errClass(error)}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </Field>
  );
}

export function SelectField({
  label, help, error, value, onChange, options, placeholder = 'Selecione', disabled,
}: BaseFieldProps & { options: Opt[] }) {
  return (
    <Field label={label} help={help} error={error}>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={errClass(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function CountryField({
  label, help, error, value, onChange, placeholder = 'Selecione o país', disabled,
}: BaseFieldProps) {
  return (
    <Field label={label} help={help} error={error}>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={errClass(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function UsStateField({
  label = 'Estado (EUA)', help, error, value, onChange, placeholder = 'Selecione o estado', disabled,
}: BaseFieldProps) {
  return (
    <Field label={label} help={help} error={error}>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={errClass(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {US_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function UfField({
  label = 'Estado (UF)', help, error, value, onChange, country = 'Brasil', disabled,
}: BaseFieldProps & { country?: string }) {
  const br = isBrasil(country);
  return (
    <Field label={label} help={help} error={error}>
      {br ? (
        <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className={errClass(error)}><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            {BRAZIL_STATES.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.nome} ({s.uf})</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input className={errClass(error)} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Estado / Província" disabled={disabled} />
      )}
    </Field>
  );
}

export function CityField({
  label = 'Cidade', help, error, value, onChange, uf = '', country = 'Brasil', disabled,
}: BaseFieldProps & { uf?: string; country?: string }) {
  const br = isBrasil(country);
  return (
    <Field label={label} help={help} error={error}>
      {br ? (
        <BrazilCitySelect uf={uf} value={value || ''} onChange={onChange} />
      ) : (
        <Input className={errClass(error)} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Cidade" disabled={disabled} />
      )}
    </Field>
  );
}

export function YesNo({
  label, help, value, onChange,
}: { label: ReactNode; help?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-slate-600">
        {label}
        {help && <HelpTooltip text={help} />}
      </Label>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={value === true ? 'default' : 'outline'} className="rounded-full px-5" onClick={() => onChange(true)}>Sim</Button>
        <Button type="button" size="sm" variant={value === false ? 'default' : 'outline'} className="rounded-full px-5" onClick={() => onChange(false)}>Não</Button>
      </div>
    </div>
  );
}

export function NACheckbox({
  label = 'Não se aplica / Não sei', checked, onChange,
}: { label?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 cursor-pointer select-none">
      <Checkbox checked={!!checked} onCheckedChange={(v) => onChange(!!v)} />
      {label}
    </label>
  );
}

export function Repeatable<T>({
  label, help, items, onChange, blank, renderItem, addLabel = 'Adicionar', emptyHint,
}: {
  label?: ReactNode;
  help?: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  renderItem: (item: T, update: (val: T) => void, index: number) => ReactNode;
  addLabel?: string;
  emptyHint?: string;
}) {
  const list = Array.isArray(items) ? items : [];
  const update = (i: number, val: T) => { const n = [...list]; n[i] = val; onChange(n); };
  const add = () => onChange([...list, blank()]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      {label && (
        <Label className="flex items-center gap-1.5 text-slate-600">
          {label}
          {help && <HelpTooltip text={help} />}
        </Label>
      )}
      {list.length === 0 && emptyHint && (
        <p className="text-xs text-slate-400">{emptyHint}</p>
      )}
      {list.map((it, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3 relative">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
            aria-label="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {renderItem(it, (val) => update(i, val), i)}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={add}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">{children}</h2>;
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">{children}</h3>;
}