import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { subDays, startOfYear, format } from 'date-fns';

interface DateRange { start: string; end: string; }

interface Props {
  onChange: (range: DateRange) => void;
  children?: React.ReactNode;
}

export default function ReportFilters({ onChange, children }: Props) {
  const [preset, setPreset] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const applyPreset = (val: string) => {
    setPreset(val);
    const today = new Date();
    let start: Date;
    if (val === '0') start = today;
    else if (val === '7') start = subDays(today, 7);
    else if (val === '30') start = subDays(today, 30);
    else if (val === '365') start = startOfYear(today);
    else if (val === 'custom') return;
    else start = subDays(today, 30);
    onChange({ start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <Label className="text-xs text-muted-foreground">Período</Label>
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Hoje</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="365">Ano</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" className="w-40" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" className="w-40" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => onChange({ start: customStart, end: customEnd })}>Aplicar</Button>
        </>
      )}
      {children}
    </div>
  );
}
