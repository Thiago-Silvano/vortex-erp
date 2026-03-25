import { useState, useMemo, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent, DragOverEvent,
} from '@dnd-kit/core';
import KanbanColumn, { KanbanColumnData } from './KanbanColumn';
import KanbanCard, { KanbanSale } from './KanbanCard';

interface KanbanBoardProps {
  columns: KanbanColumnData[];
  sales: KanbanSale[];
  onMoveCard: (saleId: string, newStatus: string) => void;
  onViewSale: (id: string) => void;
  onDuplicate?: (sale: KanbanSale) => void;
  onWhatsApp?: (sale: KanbanSale) => void;
  onConvert?: (sale: KanbanSale) => void;
}

export default function KanbanBoard({ columns, sales, onMoveCard, onViewSale, onDuplicate, onWhatsApp, onConvert }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const salesByColumn = useMemo(() => {
    const map: Record<string, KanbanSale[]> = {};
    columns.forEach(c => { map[c.statusKey] = []; });
    sales.forEach(s => {
      const key = s.sale_workflow_status || 'em_aberto';
      if (map[key]) map[key].push(s);
      else if (map['em_aberto']) map['em_aberto'].push(s);
    });
    return map;
  }, [columns, sales]);

  const activeSale = useMemo(() => sales.find(s => s.id === activeId), [activeId, sales]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const saleId = active.id as string;
    const overId = over.id as string;

    // If dropped over a column droppable
    const targetColumn = columns.find(c => c.statusKey === overId);
    if (targetColumn) {
      const sale = sales.find(s => s.id === saleId);
      if (sale && sale.sale_workflow_status !== targetColumn.statusKey) {
        onMoveCard(saleId, targetColumn.statusKey);
      }
      return;
    }

    // If dropped over another card, find its column
    const targetSale = sales.find(s => s.id === overId);
    if (targetSale) {
      const sale = sales.find(s => s.id === saleId);
      if (sale && sale.sale_workflow_status !== targetSale.sale_workflow_status) {
        onMoveCard(saleId, targetSale.sale_workflow_status);
      }
    }
  }, [columns, sales, onMoveCard]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // handled in dragEnd
  }, []);

  const activeColumn = activeSale 
    ? columns.find(c => c.statusKey === activeSale.sale_workflow_status) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {columns.sort((a, b) => a.sortOrder - b.sortOrder).map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            sales={salesByColumn[col.statusKey] || []}
            onViewSale={onViewSale}
            onDuplicate={onDuplicate}
            onWhatsApp={onWhatsApp}
            onConvert={onConvert}
          />
        ))}
      </div>

      <DragOverlay>
        {activeSale && activeColumn ? (
          <div className="rotate-3 opacity-90">
            <KanbanCard
              sale={activeSale}
              columnColor={activeColumn.color}
              onView={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
