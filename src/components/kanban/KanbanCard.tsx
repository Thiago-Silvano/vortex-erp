import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays, isValid } from 'date-fns';
import {
  Plane, Hotel, Car, Ticket, Eye, FileText, Link2,
  MessageCircle, DollarSign, AlertTriangle, Users, MapPin,
  Calendar, Clock, Copy, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const safeFormat = (value: string | null | undefined, fmt: string, suffix = ''): string => {
  if (!value) return '';
  const d = new Date(suffix ? value + suffix : value);
  return isValid(d) ? format(d, fmt) : '';
};

export interface KanbanSale {
  id: string;
  client_name: string;
  destination_name: string;
  trip_start_date: string | null;
  trip_end_date: string | null;
  total_sale: number;
  passengers_count: number;
  seller_name?: string;
  created_at: string;
  updated_at: string;
  sale_workflow_status: string;
  status: string;
  short_id: string;
  has_aereo?: boolean;
  has_hotel?: boolean;
  has_carro?: boolean;
  has_experiencia?: boolean;
}

interface KanbanCardProps {
  sale: KanbanSale;
  columnColor: string;
  onView: (id: string) => void;
  onDuplicate?: (sale: KanbanSale) => void;
  onWhatsApp?: (sale: KanbanSale) => void;
  onConvert?: (sale: KanbanSale) => void;
  onDelete?: (sale: KanbanSale) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function KanbanCard({ sale, columnColor, onView, onDuplicate, onWhatsApp, onConvert, onDelete, selected, onToggleSelect }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sale.id,
    data: { type: 'card', sale },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updatedAt = sale.updated_at ? new Date(sale.updated_at) : null;
  const daysSinceUpdate = updatedAt && isValid(updatedAt) ? differenceInDays(new Date(), updatedAt) : 0;
  const isStale = daysSinceUpdate >= 3;
  const isHot = daysSinceUpdate <= 1;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'group relative cursor-grab active:cursor-grabbing transition-all duration-200',
          'hover:shadow-md border-l-4',
          isDragging && 'opacity-50 shadow-lg rotate-2 z-50',
          isStale && 'ring-1 ring-destructive/40',
          isHot && 'ring-1 ring-emerald-400/50',
          selected && 'ring-2 ring-primary',
        )}
        style={{ borderLeftColor: columnColor }}
      >
        {onToggleSelect && (
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect(sale.id)}
            />
          </div>
        )}
        <div className="p-3 space-y-2" {...attributes} {...listeners}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn("font-semibold text-sm text-foreground leading-tight truncate flex-1", onToggleSelect && "pr-7")}>
              {sale.client_name}
            </h4>
            {isStale && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Sem interação há {daysSinceUpdate} dias</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Destination */}
          {sale.destination_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{sale.destination_name}</span>
            </div>
          )}

          {/* Period */}
          {sale.trip_start_date && safeFormat(sale.trip_start_date, 'dd/MM', 'T12:00:00') && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {safeFormat(sale.trip_start_date, 'dd/MM', 'T12:00:00')}
                {sale.trip_end_date && safeFormat(sale.trip_end_date, 'dd/MM', 'T12:00:00') && ` - ${safeFormat(sale.trip_end_date, 'dd/MM', 'T12:00:00')}`}
              </span>
            </div>
          )}

          {/* Value + Passengers row */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">{fmt(Number(sale.total_sale || 0))}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{sale.passengers_count || 1}</span>
            </div>
          </div>

          {/* Service icons */}
          <div className="flex items-center gap-1.5">
            {sale.has_aereo && <Plane className="h-3.5 w-3.5 text-blue-500" />}
            {sale.has_hotel && <Hotel className="h-3.5 w-3.5 text-amber-500" />}
            {sale.has_carro && <Car className="h-3.5 w-3.5 text-emerald-500" />}
            {sale.has_experiencia && <Ticket className="h-3.5 w-3.5 text-purple-500" />}
          </div>

          {/* Footer: seller + date */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            {sale.seller_name ? (
              <span className="truncate max-w-[60%]">{sale.seller_name}</span>
            ) : (
              <span className="italic">Sem vendedor</span>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {safeFormat(sale.created_at, 'dd/MM') || '-'}
            </div>
          </div>
        </div>

        {/* Hover actions overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/95 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 pt-6 flex items-center justify-center gap-1 rounded-b-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(sale.id); }}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(sale.id); }}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar PDF</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(`/proposta/${sale.short_id}`, '_blank'); }}>
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Link interativo</TooltipContent>
          </Tooltip>
          {onDuplicate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDuplicate(sale); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicar</TooltipContent>
            </Tooltip>
          )}
          {onWhatsApp && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={(e) => { e.stopPropagation(); onWhatsApp(sale); }}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          )}
          {onConvert && sale.status === 'draft' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onConvert(sale); }}>
                  <DollarSign className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Converter em venda</TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sale); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          )}
        </div>
      </Card>
    </div>
  );
}
