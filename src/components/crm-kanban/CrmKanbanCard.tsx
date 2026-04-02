import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, differenceInHours } from 'date-fns';
import {
  MessageCircle, FileText, Eye, DollarSign, MoreVertical,
  Clock, MapPin, Users, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CrmLead {
  id: string;
  client_name: string;
  client_phone?: string;
  destination_name?: string;
  total_sale: number;
  passengers_count: number;
  seller_name?: string;
  seller_id?: string;
  created_at: string;
  updated_at: string;
  sale_workflow_status: string;
  status: string;
  short_id: string;
  last_whatsapp_message?: string;
  last_whatsapp_at?: string;
  whatsapp_unread?: number;
  profile_pic?: string | null;
  has_quote: boolean;
  quote_status?: string; // not_sent, sent, viewed, approved
}

interface CrmKanbanCardProps {
  lead: CrmLead;
  columnColor: string;
  onOpenChat: (lead: CrmLead) => void;
  onOpenQuote: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onEdit: (lead: CrmLead) => void;
}

export default function CrmKanbanCard({ lead, columnColor, onOpenChat, onOpenQuote, onConvert, onEdit }: CrmKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'card', lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hoursSinceUpdate = differenceInHours(new Date(), new Date(lead.last_whatsapp_at || lead.updated_at));
  const isStale = hoursSinceUpdate >= 24;
  const isRecent = hoursSinceUpdate <= 2;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const initials = lead.client_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const quoteStatusLabel: Record<string, { text: string; color: string }> = {
    not_sent: { text: 'Não enviada', color: 'bg-muted text-muted-foreground' },
    sent: { text: 'Enviada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    viewed: { text: 'Visualizada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    approved: { text: 'Aprovada', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          'group relative cursor-grab active:cursor-grabbing transition-all duration-150',
          'hover:shadow-md border-l-[3px]',
          isDragging && 'opacity-40 shadow-lg z-50',
        )}
        style={{ borderLeftColor: columnColor }}
      >
        <div className="p-2.5 space-y-1.5">
          {/* Row 1: Avatar + Name + Status indicator */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              {lead.profile_pic && <AvatarImage src={lead.profile_pic} />}
              <AvatarFallback className="text-[10px] font-bold bg-muted">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h4 className="font-semibold text-xs text-foreground truncate">{lead.client_name}</h4>
                {/* Response indicator */}
                <span className={cn('h-2 w-2 rounded-full shrink-0', isRecent ? 'bg-emerald-500' : isStale ? 'bg-destructive' : 'bg-amber-400')} />
              </div>
              {lead.destination_name && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />{lead.destination_name}
                </span>
              )}
            </div>
            {lead.whatsapp_unread && lead.whatsapp_unread > 0 ? (
              <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center">
                {lead.whatsapp_unread}
              </Badge>
            ) : null}
          </div>

          {/* Last WhatsApp message preview */}
          {lead.last_whatsapp_message && (
            <p className="text-[10px] text-muted-foreground truncate pl-9 -mt-0.5">
              💬 {lead.last_whatsapp_message}
            </p>
          )}

          {/* Value + passengers */}
          <div className="flex items-center justify-between pl-9">
            <span className="font-bold text-xs text-foreground">{fmt(Number(lead.total_sale || 0))}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{lead.passengers_count || 1}</span>
              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{format(new Date(lead.updated_at), 'dd/MM')}</span>
            </div>
          </div>

          {/* Quote status badge */}
          {lead.has_quote && lead.quote_status && (
            <div className="pl-9">
              <Badge variant="secondary" className={cn('text-[9px] h-4 px-1.5', quoteStatusLabel[lead.quote_status]?.color)}>
                {quoteStatusLabel[lead.quote_status]?.text || lead.quote_status}
              </Badge>
            </div>
          )}

          {/* Stale warning */}
          {isStale && (
            <div className="flex items-center gap-1 pl-9 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>Sem resposta há {Math.floor(hoursSinceUpdate / 24)}d — Enviar follow-up?</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 pl-9 pt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onOpenChat(lead); }}>
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onOpenQuote(lead); }}>
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{lead.has_quote ? 'Ver Cotação' : 'Criar Cotação'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(lead); }}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            {lead.status === 'draft' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={(e) => { e.stopPropagation(); onConvert(lead); }}>
                    <DollarSign className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Converter em Venda</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
