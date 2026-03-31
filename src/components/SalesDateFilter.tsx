import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

export type DateFilterPeriod = 'day' | 'week' | 'month' | 'last_month' | 'year' | 'custom';

interface SalesDateFilterProps {
  period: DateFilterPeriod;
  onPeriodChange: (period: DateFilterPeriod) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

export function getDateRange(period: DateFilterPeriod, customStart: string, customEnd: string): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case 'day':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      if (customStart && customEnd) {
        return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
      }
      return null;
    default:
      return null;
  }
}

export default function SalesDateFilter({ period, onPeriodChange, customStart, customEnd, onCustomStartChange, onCustomEndChange }: SalesDateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={(v) => onPeriodChange(v as DateFilterPeriod)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mês atual</SelectItem>
          <SelectItem value="day">Hoje</SelectItem>
          <SelectItem value="week">Semana</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="year">Ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {period === 'custom' && (
        <>
          <Input type="date" value={customStart} onChange={e => onCustomStartChange(e.target.value)} className="w-[150px]" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={customEnd} onChange={e => onCustomEndChange(e.target.value)} className="w-[150px]" min={customStart || undefined} />
        </>
      )}
    </div>
  );
}
