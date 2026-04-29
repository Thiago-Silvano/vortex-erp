import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CrmKanbanCard, { CrmLead } from './CrmKanbanCard';
import { cn } from '@/lib/utils';

export interface CrmColumnData {
  id: string;
  name: string;
  color: string;
  statusKey: string;
  sortOrder: number;
}

interface CrmKanbanColumnProps {
  column: CrmColumnData;
  leads: CrmLead[];
  layout?: 'vertical' | 'horizontal';
  onOpenChat: (lead: CrmLead) => void;
  onOpenQuote: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onEdit: (lead: CrmLead) => void;
}

export default function CrmKanbanColumn({ column, leads, layout = 'vertical', onOpenChat, onOpenQuote, onConvert, onEdit }: CrmKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.statusKey });

  const totalValue = leads.reduce((sum, s) => sum + Number(s.total_sale || 0), 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={cn(
        'flex flex-col bg-muted/30 rounded-lg border border-border/50 transition-colors',
        isHorizontal ? 'w-full' : 'min-w-[260px] max-w-[290px] w-full',
        isOver && 'bg-accent/30 border-primary/30',
      )}
    >
      {/* Column Header */}
      <div className="p-2.5 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-xs text-foreground truncate">{column.name}</h3>
          <span className="ml-auto bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Total: {fmt(totalValue)}
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 px-1.5 pb-1.5 min-h-[80px]',
          isHorizontal
            ? 'flex flex-row gap-1.5 overflow-x-auto'
            : 'space-y-1.5 overflow-y-auto max-h-[calc(100vh-240px)]',
        )}
      >
        <SortableContext
          items={leads.map(l => l.id)}
          strategy={isHorizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
        >
          {leads.map(lead => (
            <div key={lead.id} className={isHorizontal ? 'shrink-0 w-[260px]' : ''}>
              <CrmKanbanCard
                lead={lead}
                columnColor={column.color}
                onOpenChat={onOpenChat}
                onOpenQuote={onOpenQuote}
                onConvert={onConvert}
                onEdit={onEdit}
              />
            </div>
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className={cn(
            'flex items-center justify-center text-[10px] text-muted-foreground italic border border-dashed border-border/50 rounded-md',
            isHorizontal ? 'h-16 w-full' : 'h-16',
          )}>
            Arraste leads aqui
          </div>
        )}
      </div>
    </div>
  );
}
