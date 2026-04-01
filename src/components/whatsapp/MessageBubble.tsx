import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileText, Mic, Image as ImageIcon, Video, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  replyTarget?: { content: string; sender: string } | null;
}

const mediaCache = new Map<string, string>();

export default function MessageBubble({ msg, serverUrl, empresaId, onReply }: MessageBubbleProps) {
  const [mediaUrl, setMediaUrl] = useState<string>(msg.media_url || '');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isMe = msg.sender === 'me';
  const hasMedia = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(msg.message_type);
  const needsMediaFetch = hasMedia && !mediaUrl && (msg.whatsapp_msg_id || msg.id);

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
          <button
            onClick={() => onReply(msg)}
            className={`absolute top-1 ${isMe ? 'right-2' : 'right-2'} z-10 p-0.5 rounded-full transition-all`}
            style={{ background: isMe ? 'rgba(217, 253, 211, 0.9)' : 'rgba(255,255,255,0.9)' }}
            title="Responder"
          >
            <ChevronDown className="h-4 w-4 text-[#8696a0]" />
          </button>
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

          {/* Media content */}
          {hasMedia && <div className="mb-1">{renderMediaContent()}</div>}

          {/* Text + timestamp in same line */}
          <div className="flex items-end gap-1">
            <div className="flex-1 min-w-0">
              {msg.content && !(msg.message_type === 'document' && mediaUrl) && msg.message_type !== 'ptt' && msg.message_type !== 'audio' && (
                <span className="whitespace-pre-wrap break-words">{msg.content}</span>
              )}
              {msg.content && msg.message_type === 'document' && mediaUrl && !msg.content.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i) && (
                <span className="whitespace-pre-wrap break-words">{msg.content}</span>
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
        </div>
      </div>
    </div>
  );
}
