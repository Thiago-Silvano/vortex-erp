import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  phone: string;
  client_name: string;
  assigned_user_name: string;
  status: string;
  last_message: string;
  last_message_at: string;
}

export default function WhatsAppFinishedPage() {
  const { activeCompany } = useCompany();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      let q = supabase.from('whatsapp_conversations').select('*').eq('status', 'finished').order('last_message_at', { ascending: false });
      if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
      const { data } = await q;
      if (data) setConversations(data as Conversation[]);
    };
    fetchData();
  }, [activeCompany?.id]);

  const filtered = conversations.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-6 w-6" /> Conversas Finalizadas
          </h1>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Última mensagem</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conversa finalizada</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.client_name || 'Desconhecido'}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="max-w-xs truncate">{c.last_message}</TableCell>
                    <TableCell>{c.assigned_user_name || '—'}</TableCell>
                    <TableCell className="text-sm">{c.last_message_at ? format(new Date(c.last_message_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
