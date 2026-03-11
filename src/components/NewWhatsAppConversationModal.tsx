import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (convId: string) => void;
  initialPhone?: string;
  initialName?: string;
}

interface Seller {
  id: string;
  full_name: string;
}

const COUNTRIES = [
  { code: '55', flag: '🇧🇷', name: 'Brasil' },
  { code: '1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '54', flag: '🇦🇷', name: 'Argentina' },
  { code: '351', flag: '🇵🇹', name: 'Portugal' },
  { code: '34', flag: '🇪🇸', name: 'Espanha' },
  { code: '39', flag: '🇮🇹', name: 'Itália' },
  { code: '49', flag: '🇩🇪', name: 'Alemanha' },
  { code: '33', flag: '🇫🇷', name: 'França' },
  { code: '44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '81', flag: '🇯🇵', name: 'Japão' },
  { code: '86', flag: '🇨🇳', name: 'China' },
  { code: '91', flag: '🇮🇳', name: 'Índia' },
  { code: '61', flag: '🇦🇺', name: 'Austrália' },
  { code: '52', flag: '🇲🇽', name: 'México' },
  { code: '57', flag: '🇨🇴', name: 'Colômbia' },
  { code: '56', flag: '🇨🇱', name: 'Chile' },
  { code: '51', flag: '🇵🇪', name: 'Peru' },
  { code: '58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '593', flag: '🇪🇨', name: 'Equador' },
  { code: '595', flag: '🇵🇾', name: 'Paraguai' },
  { code: '598', flag: '🇺🇾', name: 'Uruguai' },
  { code: '591', flag: '🇧🇴', name: 'Bolívia' },
  { code: '506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '507', flag: '🇵🇦', name: 'Panamá' },
  { code: '53', flag: '🇨🇺', name: 'Cuba' },
  { code: '1809', flag: '🇩🇴', name: 'República Dominicana' },
  { code: '502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '504', flag: '🇭🇳', name: 'Honduras' },
  { code: '505', flag: '🇳🇮', name: 'Nicarágua' },
  { code: '503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '41', flag: '🇨🇭', name: 'Suíça' },
  { code: '43', flag: '🇦🇹', name: 'Áustria' },
  { code: '31', flag: '🇳🇱', name: 'Países Baixos' },
  { code: '32', flag: '🇧🇪', name: 'Bélgica' },
  { code: '46', flag: '🇸🇪', name: 'Suécia' },
  { code: '47', flag: '🇳🇴', name: 'Noruega' },
  { code: '45', flag: '🇩🇰', name: 'Dinamarca' },
  { code: '358', flag: '🇫🇮', name: 'Finlândia' },
  { code: '48', flag: '🇵🇱', name: 'Polônia' },
  { code: '420', flag: '🇨🇿', name: 'República Tcheca' },
  { code: '36', flag: '🇭🇺', name: 'Hungria' },
  { code: '40', flag: '🇷🇴', name: 'Romênia' },
  { code: '30', flag: '🇬🇷', name: 'Grécia' },
  { code: '90', flag: '🇹🇷', name: 'Turquia' },
  { code: '7', flag: '🇷🇺', name: 'Rússia' },
  { code: '380', flag: '🇺🇦', name: 'Ucrânia' },
  { code: '972', flag: '🇮🇱', name: 'Israel' },
  { code: '971', flag: '🇦🇪', name: 'Emirados Árabes' },
  { code: '966', flag: '🇸🇦', name: 'Arábia Saudita' },
  { code: '20', flag: '🇪🇬', name: 'Egito' },
  { code: '27', flag: '🇿🇦', name: 'África do Sul' },
  { code: '234', flag: '🇳🇬', name: 'Nigéria' },
  { code: '254', flag: '🇰🇪', name: 'Quênia' },
  { code: '212', flag: '🇲🇦', name: 'Marrocos' },
  { code: '82', flag: '🇰🇷', name: 'Coreia do Sul' },
  { code: '66', flag: '🇹🇭', name: 'Tailândia' },
  { code: '84', flag: '🇻🇳', name: 'Vietnã' },
  { code: '62', flag: '🇮🇩', name: 'Indonésia' },
  { code: '60', flag: '🇲🇾', name: 'Malásia' },
  { code: '63', flag: '🇵🇭', name: 'Filipinas' },
  { code: '65', flag: '🇸🇬', name: 'Singapura' },
  { code: '64', flag: '🇳🇿', name: 'Nova Zelândia' },
  { code: '353', flag: '🇮🇪', name: 'Irlanda' },
  { code: '354', flag: '🇮🇸', name: 'Islândia' },
  { code: '352', flag: '🇱🇺', name: 'Luxemburgo' },
  { code: '356', flag: '🇲🇹', name: 'Malta' },
  { code: '385', flag: '🇭🇷', name: 'Croácia' },
  { code: '381', flag: '🇷🇸', name: 'Sérvia' },
  { code: '359', flag: '🇧🇬', name: 'Bulgária' },
  { code: '370', flag: '🇱🇹', name: 'Lituânia' },
  { code: '371', flag: '🇱🇻', name: 'Letônia' },
  { code: '372', flag: '🇪🇪', name: 'Estônia' },
  { code: '386', flag: '🇸🇮', name: 'Eslovênia' },
  { code: '421', flag: '🇸🇰', name: 'Eslováquia' },
];

function normalizeToE164(countryCode: string, rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  // If user already typed the country code, remove it
  if (digits.startsWith(countryCode)) {
    return digits;
  }
  return countryCode + digits;
}

export default function NewWhatsAppConversationModal({ open, onOpenChange, onConversationCreated, initialPhone, initialName }: Props) {
  const { activeCompany } = useCompany();
  const [countryCode, setCountryCode] = useState('55');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);

  // Pre-fill from props
  useEffect(() => {
    if (open && initialPhone) {
      setPhone(initialPhone);
    }
    if (open && initialName) {
      setContactName(initialName);
    }
  }, [open, initialPhone, initialName]);

  useEffect(() => {
    if (!open || !activeCompany?.id) return;
    supabase.from('sellers').select('id, full_name').eq('empresa_id', activeCompany.id).eq('status', 'active').order('full_name')
      .then(({ data }) => { if (data) setSellers(data); });
  }, [open, activeCompany?.id]);

  const sortedCountries = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);

  const resetForm = () => {
    setCountryCode('55');
    setPhone('');
    setContactName('');
    setInitialMessage('');
    setSellerId('');
  };

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 6) {
      toast.error('Número de telefone inválido');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizeToE164(countryCode, digits);
      const name = contactName.trim() || normalizedPhone;

      const { data: { user } } = await supabase.auth.getUser();
      const agentName = user?.email?.split('@')[0] || 'Agente';

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('empresa_id', activeCompany?.id || '')
        .limit(1);

      let convId: string;

      if (existing && existing.length > 0) {
        convId = existing[0].id;
        toast.info('Conversa já existe, abrindo...');
      } else {
        const { data: conv, error } = await supabase.from('whatsapp_conversations').insert({
          phone: normalizedPhone,
          client_name: name,
          empresa_id: activeCompany?.id,
          status: 'new_lead',
          priority: 'normal',
          assigned_user_id: user?.id,
          assigned_user_name: agentName,
          last_message: initialMessage.trim() || '',
          last_message_at: new Date().toISOString(),
        }).select('id').single();

        if (error) throw error;
        convId = conv.id;
      }

      // Send initial message if provided
      if (initialMessage.trim()) {
        try {
          await supabase.functions.invoke('whatsapp-send', {
            body: {
              conversation_id: convId,
              content: initialMessage.trim(),
              message_type: 'text',
              sender_name: agentName,
              empresa_id: activeCompany?.id,
            },
          });
        } catch {
          // Save locally as fallback
          await supabase.from('whatsapp_messages').insert({
            conversation_id: convId,
            sender_type: 'agent',
            sender_name: agentName,
            content: initialMessage.trim(),
            message_type: 'text',
          });
        }
      }

      toast.success('Conversa iniciada!');
      resetForm();
      onOpenChange(false);
      onConversationCreated?.(convId);
    } catch (err: any) {
      toast.error('Erro ao criar conversa: ' + (err.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" style={{ color: '#25D366' }} />
            Nova Conversa WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Country + Phone */}
          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[180px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sortedCountries.map(c => (
                    <SelectItem key={c.code + c.name} value={c.code}>
                      {c.flag} {c.name} +{c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="flex-1"
              />
            </div>
          </div>

          {/* Contact name */}
          <div className="space-y-2">
            <Label>Nome do contato <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ex: João Silva" />
          </div>

          {/* Initial message */}
          <div className="space-y-2">
            <Label>Mensagem inicial <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea value={initialMessage} onChange={e => setInitialMessage(e.target.value)} placeholder="Olá! Tudo bem?" rows={3} />
          </div>

          {/* Seller */}
          {sellers.length > 0 && (
            <div className="space-y-2">
              <Label>Vendedor responsável <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
                <SelectContent>
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !phone.replace(/\D/g, '')}
            style={{ backgroundColor: '#25D366', color: 'white' }}
            className="hover:opacity-90"
          >
            {loading ? 'Criando...' : 'Iniciar Conversa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
