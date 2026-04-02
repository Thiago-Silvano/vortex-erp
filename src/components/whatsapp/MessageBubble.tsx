import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileText, Mic, Image as ImageIcon, Video, ChevronDown, Trash2, Reply, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageBubbleProps {
  msg: {
    id: string;
    sender: string;
    content: string;
    message_type: string;
    media_url: string;
    created_at: string;
    whatsapp_msg_id?: string;
    reply_to_content?: string;
    reply_to_id?: string;
  };
  serverUrl: string;
  empresaId: string;
  onReply: (msg: MessageBubbleProps['msg']) => void;
  onDeleteForMe?: (msg: MessageBubbleProps['msg']) => void;
  onDeleteForAll?: (msg: MessageBubbleProps['msg']) => void;
  onStartChat?: (phone: string, name: string) => void;
  onSaveContact?: (phone: string, name: string) => void;
  replyTarget?: { content: string; sender: string } | null;
}

const mediaCache = new Map<string, string>();

// ========== vCard parser ==========
interface VCardData {
  fullName: string;
  phones: string[];
  bizName?: string;
  bizDescription?: string;
}

function parseVCard(text: string): VCardData | null {
  if (!text || !text.includes('BEGIN:VCARD')) return null;
  const lines = text.split(/\r?\n/);
  let fullName = '';
  const phones: string[] = [];
  let bizName = '';
  let bizDescription = '';

  for (const line of lines) {
    if (line.startsWith('FN:')) {
      fullName = line.slice(3).trim();
    } else if (line.startsWith('TEL')) {
      // TEL;waid=554891388665:+55 48 99138-8665
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        phones.push(line.slice(colonIdx + 1).trim());
      }
    } else if (line.startsWith('X-WA-BIZ-NAME:')) {
      bizName = line.slice('X-WA-BIZ-NAME:'.length).trim();
    } else if (line.startsWith('X-WA-BIZ-DESCRIPTION:')) {
      bizDescription = line.slice('X-WA-BIZ-DESCRIPTION:'.length).trim();
    }
  }

  if (!fullName && !phones.length) return null;
  return { fullName, phones, bizName: bizName || undefined, bizDescription: bizDescription || undefined };
}

function isVCard(content: string): boolean {
  return !!content && content.includes('BEGIN:VCARD') && content.includes('END:VCARD');
}

// ========== Linkify helper ==========
const URL_REGEX = /(https?:\/\/[^\s<]+|(?:www\.)[^\s<]+\.[^\s<]{2,})/gi;

function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0; // reset regex state
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          style={{ color: '#027eb5' }}
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageBubble({ msg, serverUrl, empresaId, onReply, onDeleteForMe, onDeleteForAll, onStartChat, onSaveContact }: MessageBubbleProps) {
  const [mediaUrl, setMediaUrl] = useState<string>(msg.media_url || '');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isMe = msg.sender === 'me';
  const hasMedia = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(msg.message_type);
  const needsMediaFetch = hasMedia && !mediaUrl && (msg.whatsapp_msg_id || msg.id);
  const vcard = isVCard(msg.content) ? parseVCard(msg.content) : null;

  useEffect(() => {
    if (!needsMediaFetch || loadingMedia) return;
    const msgIdentifier = msg.whatsapp_msg_id || msg.id;
    if (mediaCache.has(msgIdentifier)) {
      setMediaUrl(mediaCache.get(msgIdentifier)!);
      return;
    }
    const loadMedia = async () => {
      setLoadingMedia(true);
      try {
        const { data: dbMsg } = await supabase
          .from('whatsapp_messages')
          .select('media_url')
          .eq('whatsapp_msg_id', msgIdentifier)
          .maybeSingle() as any;
        if (dbMsg?.media_url) {
          mediaCache.set(msgIdentifier, dbMsg.media_url);
          setMediaUrl(dbMsg.media_url);
        }
      } catch (err) {
        console.error('Error loading media:', err);
      }
      setLoadingMedia(false);
    };
    loadMedia();
  }, [needsMediaFetch]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return format(d, 'HH:mm');
    } catch { return ''; }
  };

  const renderVCard = (vc: VCardData) => {
    return (
      <div className="min-w-[260px] max-w-[300px]">
        {/* Contact card header */}
        <div className="flex items-center gap-3 px-3 py-3">
          <div
            className="h-[50px] w-[50px] rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#dfe5e7' }}
          >
            <User className="h-6 w-6" style={{ color: '#ffffff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] font-medium truncate" style={{ color: '#111b21' }}>
              {vc.fullName}
            </p>
            {vc.bizName && (
              <p className="text-[12px] truncate" style={{ color: '#667781' }}>
                {vc.bizName}
              </p>
            )}
            {vc.bizDescription && (
              <p className="text-[11px] truncate" style={{ color: '#8696a0' }}>
                {vc.bizDescription}
              </p>
            )}
          </div>
        </div>

        {/* Phone numbers */}
        {vc.phones.length > 0 && (
          <div className="border-t px-3 py-2" style={{ borderColor: '#e9edef' }}>
            {vc.phones.map((phone, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: '#667781' }} />
                <span className="text-[13px]" style={{ color: '#111b21' }}>{phone}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="border-t flex" style={{ borderColor: '#e9edef' }}>
          <button
            className="flex-1 py-2 text-[14px] font-medium text-center transition-colors hover:bg-black/5"
            style={{ color: '#00a884' }}
            onClick={(e) => {
              e.stopPropagation();
              if (vc.phones[0]) {
                const digits = vc.phones[0].replace(/\D/g, '');
                onStartChat?.(digits, vc.fullName);
              }
            }}
          >
            Conversar
          </button>
          <div className="w-px" style={{ backgroundColor: '#e9edef' }} />
          <button
            className="flex-1 py-2 text-[14px] font-medium text-center transition-colors hover:bg-black/5"
            style={{ color: '#00a884' }}
            onClick={(e) => {
              e.stopPropagation();
              if (vc.phones[0]) {
                const digits = vc.phones[0].replace(/\D/g, '');
                onSaveContact?.(digits, vc.fullName);
              }
            }}
          >
            Salvar contato
          </button>
        </div>
      </div>
    );
  };

  const renderMediaContent = () => {
    if (loadingMedia) {
      return (
        <div className="flex items-center gap-2 p-3 rounded bg-black/5 animate-pulse min-w-[200px]">
          <div className="h-4 w-4 rounded-full bg-black/10" />
          <span className="text-xs text-[#667781]">Carregando mídia...</span>
        </div>
      );
    }

    if (!mediaUrl && hasMedia) {
      return (
        <div className="flex items-center gap-2 p-2 rounded bg-black/5">
          {msg.message_type === 'image' || msg.message_type === 'sticker' ? <ImageIcon className="h-4 w-4 text-[#667781]" /> :
           msg.message_type === 'video' ? <Video className="h-4 w-4 text-[#667781]" /> :
           msg.message_type === 'ptt' || msg.message_type === 'audio' ? <Mic className="h-4 w-4 text-[#667781]" /> :
           <FileText className="h-4 w-4 text-[#667781]" />}
          <span className="text-xs text-[#667781]">
            {msg.message_type === 'image' ? '📷 Imagem' :
             msg.message_type === 'video' ? '🎥 Vídeo' :
             msg.message_type === 'ptt' || msg.message_type === 'audio' ? '🎤 Áudio' :
             msg.message_type === 'sticker' ? '🏷️ Figurinha' : '📎 Arquivo'}
          </span>
        </div>
      );
    }

    switch (msg.message_type) {
      case 'image':
      case 'sticker':
        return (
          <img
            src={mediaUrl}
            alt=""
            className="rounded max-w-full max-h-[300px] object-contain cursor-pointer"
            onClick={() => window.open(mediaUrl, '_blank')}
            loading="lazy"
          />
        );
      case 'video':
        return <video src={mediaUrl} controls className="rounded max-w-full max-h-[300px]" preload="metadata" />;
      case 'ptt':
      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[240px]">
            <Mic className="h-5 w-5 shrink-0 text-[#54656f]" />
            <audio src={mediaUrl} controls className="h-8 flex-1" preload="metadata" />
          </div>
        );
      case 'document':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f5f6f6] hover:bg-[#e9edef] transition-colors"
          >
            <FileText className="h-10 w-10 shrink-0 text-[#8696a0] p-2 bg-[#dfe5e7] rounded" />
            <span className="text-[13px] flex-1 truncate text-[#111b21]">{msg.content || 'Documento'}</span>
            <Download className="h-5 w-5 shrink-0 text-[#8696a0]" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-[2px]`}>
      <div
        className="relative max-w-[65%] min-w-[80px]"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* Bubble tail */}
        <div className={`absolute top-0 ${isMe ? '-right-2' : '-left-2'}`}>
          <svg width="8" height="13" viewBox="0 0 8 13">
            {isMe ? (
              <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" fill="#d9fdd3" />
            ) : (
              <path d="M2.812 0H8v11.193L1.533 2.568C.474 1.156 1.042 0 2.812 0z" fill="#ffffff" />
            )}
          </svg>
        </div>

        {/* Menu dropdown trigger */}
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`absolute top-1 right-2 z-10 p-0.5 rounded-full transition-all`}
                style={{ background: isMe ? 'rgba(217, 253, 211, 0.9)' : 'rgba(255,255,255,0.9)' }}
              >
                <ChevronDown className="h-4 w-4 text-[#8696a0]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-lg shadow-lg border-0 py-1" style={{ backgroundColor: '#ffffff' }}>
              <DropdownMenuItem
                className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                style={{ color: '#3b4a54' }}
                onClick={() => onReply(msg)}
              >
                <Reply className="h-4 w-4" style={{ color: '#54656f' }} />
                Responder
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ backgroundColor: '#e9edef' }} />
              <DropdownMenuItem
                className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                style={{ color: '#3b4a54' }}
                onClick={() => onDeleteForMe?.(msg)}
              >
                <Trash2 className="h-4 w-4" style={{ color: '#54656f' }} />
                Apagar para mim
              </DropdownMenuItem>
              {isMe && (
                <DropdownMenuItem
                  className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                  style={{ color: '#e53935' }}
                  onClick={() => onDeleteForAll?.(msg)}
                >
                  <Trash2 className="h-4 w-4" style={{ color: '#e53935' }} />
                  Apagar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div
          className={`rounded-lg px-[9px] py-[6px] shadow-sm text-[14.2px] leading-[19px] ${
            isMe
              ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
              : 'bg-white text-[#111b21] rounded-tl-none'
          }`}
        >
          {/* Quoted reply */}
          {msg.reply_to_content && (
            <div className={`mb-1 px-2 py-1.5 rounded-md text-[12.8px] border-l-[3px] ${
              isMe
                ? 'bg-[#c8e6c0] border-[#06cf9c]'
                : 'bg-[#f0f0f0] border-[#06cf9c]'
            }`}>
              <p className="text-[#06cf9c] font-medium text-[12px] mb-0.5">
                {msg.reply_to_id ? 'Respondendo' : ''}
              </p>
              <p className="truncate text-[#667781]">{msg.reply_to_content}</p>
            </div>
          )}

          {/* vCard rendering */}
          {vcard ? (
            <>
              {renderVCard(vcard)}
              <div className="flex justify-end mt-1">
                <span className="text-[11px] text-[#667781] whitespace-nowrap shrink-0 leading-none pb-[2px]">
                  {formatTime(msg.created_at)}
                  {isMe && (
                    <span className="inline-block ml-[3px]">
                      <svg viewBox="0 0 16 11" height="11" width="16" className="inline text-[#53bdeb]">
                        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.14.462.462 0 0 0-.346.149.403.403 0 0 0-.122.323c.004.121.06.238.156.323l2.357 2.433a.515.515 0 0 0 .361.174.468.468 0 0 0 .383-.19l6.555-8.039a.45.45 0 0 0 .069-.42.414.414 0 0 0-.2-.23z" fill="currentColor" />
                        <path d="M15.764.638a.46.46 0 0 0-.631.057l-6.19 7.636-0.7-.73a.265.265 0 0 0-.063.166c.004.121.06.238.156.323l.54.558a.515.515 0 0 0 .361.174.468.468 0 0 0 .383-.19l6.555-8.039a.423.423 0 0 0-.411-.955z" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Media content */}
              {hasMedia && <div className="mb-1">{renderMediaContent()}</div>}

              {/* Text + timestamp in same line */}
              <div className="flex items-end gap-1">
                <div className="flex-1 min-w-0">
                  {msg.content && !(msg.message_type === 'document' && mediaUrl) && msg.message_type !== 'ptt' && msg.message_type !== 'audio' && (
                    <span className="whitespace-pre-wrap break-words">{linkifyText(msg.content)}</span>
                  )}
                  {msg.content && msg.message_type === 'document' && mediaUrl && !msg.content.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i) && (
                    <span className="whitespace-pre-wrap break-words">{linkifyText(msg.content)}</span>
                  )}
                </div>
                <span className="text-[11px] text-[#667781] whitespace-nowrap shrink-0 leading-none pb-[2px] ml-1">
                  {formatTime(msg.created_at)}
                  {isMe && (
                    <span className="inline-block ml-[3px]">
                      <svg viewBox="0 0 16 11" height="11" width="16" className="inline text-[#53bdeb]">
                        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.14.462.462 0 0 0-.346.149.403.403 0 0 0-.122.323c.004.121.06.238.156.323l2.357 2.433a.515.515 0 0 0 .361.174.468.468 0 0 0 .383-.19l6.555-8.039a.45.45 0 0 0 .069-.42.414.414 0 0 0-.2-.23z" fill="currentColor" />
                        <path d="M15.764.638a.46.46 0 0 0-.631.057l-6.19 7.636-0.7-.73a.265.265 0 0 0-.063.166c.004.121.06.238.156.323l.54.558a.515.515 0 0 0 .361.174.468.468 0 0 0 .383-.19l6.555-8.039a.423.423 0 0 0-.411-.955z" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
