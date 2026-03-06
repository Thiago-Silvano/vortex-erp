import { useState } from 'react';
import { getAuditLog } from '@/lib/supabase-storage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  summary: string;
  user_email: string;
  created_at: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_COLORS: Record<string, string> = {
  criado: 'bg-green-100 text-green-800',
  atualizado: 'bg-blue-100 text-blue-800',
  excluído: 'bg-red-100 text-red-800',
  duplicado: 'bg-purple-100 text-purple-800',
};

export default function AuditLogDialog({ quoteId, clientName }: { quoteId: string; clientName: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getAuditLog(quoteId);
    setEntries(data as unknown as AuditEntry[]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Histórico de alterações">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Histórico — {clientName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[e.action] || 'bg-muted text-muted-foreground'}`}>
                    {e.action}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatDateTime(e.created_at)}</span>
                </div>
                <p className="text-foreground">{e.summary}</p>
                <p className="text-xs text-muted-foreground mt-1">por {e.user_email}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
