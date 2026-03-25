import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard, { KanbanSale } from './KanbanCard';
import { cn } from '@/lib/utils';

export interface KanbanColumnData {
  id: string;
  name: string;
  color: string;
  statusKey: string;
  sortOrder: number;
}

interface KanbanColumnProps {
  column: KanbanColumnData;
  sales: KanbanSale[];
  onViewSale: (id: string) => void;
  onDuplicate?: (sale: KanbanSale) => void;
  onWhatsApp?: (sale: KanbanSale) => void;
  onConvert?: (sale: KanbanSale) => void;
}

export default function KanbanColumn({ column, sales, onViewSale, onDuplicate, onWhatsApp, onConvert }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.statusKey });

  const totalValue = sales.reduce((sum, s) => sum + Number(s.total_sale || 0), 0);
  const ticketMedio = sales.length > 0 ? totalValue / sales.length : 0;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] w-full bg-muted/30 rounded-xl border border-border/50 transition-colors',
        isOver && 'bg-accent/30 border-primary/30',
      )}
    >
      {/* Column Header */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-sm text-foreground truncate">{column.name}</h3>
          <span className="ml-auto bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {sales.length}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Total: {fmt(totalValue)}</span>
          <span>Ticket: {fmt(ticketMedio)}</span>
        </div>
      </div>

      {/* Cards Container */}
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[100px]">
        <SortableContext items={sales.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sales.map(sale => (
            <KanbanCard
              key={sale.id}
              sale={sale}
              columnColor={column.color}
              onView={onViewSale}
              onWhatsApp={onWhatsApp}
              onConvert={onConvert}
            />
          ))}
        </SortableContext>
        {sales.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-lg">
            Arraste cotações aqui
          </div>
        )}
      </div>
    </div>
  );
}
