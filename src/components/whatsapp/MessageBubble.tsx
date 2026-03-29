import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileText, Play, Reply, Mic, Image as ImageIcon, Video } from 'lucide-react';
import { uploadMediaToStorage } from '@/lib/whatsappApi';
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

// Cache to avoid re-fetching media
const mediaCache = new Map<string, string>();

export default function MessageBubble({ msg, serverUrl, empresaId, onReply }: MessageBubbleProps) {
  const [mediaUrl, setMediaUrl] = useState<string>(msg.media_url || '');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const touchStartX = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isMe = msg.sender === 'me';
  const hasMedia = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(msg.message_type);
  const needsMediaFetch = hasMedia && !mediaUrl && (msg.whatsapp_msg_id || msg.id);

  useEffect(() => {
    if (!needsMediaFetch || loadingMedia) return;
    
    const msgIdentifier = msg.whatsapp_msg_id || msg.id;
    
    // Check cache first
    if (mediaCache.has(msgIdentifier)) {
      setMediaUrl(mediaCache.get(msgIdentifier)!);
      return;
    }

    const loadMedia = async () => {
      setLoadingMedia(true);
      try {
        // Media is now stored in DB/storage via webhook, no server fetch needed
        // Check if there's a stored URL in the database
        const { data: dbMsg } = await supabase
          .from('whatsapp_messages')
          .select('media_url')
          .eq('whatsapp_msg_id', msgIdentifier)
          .maybeSingle() as any;
        if (dbMsg?.media_url) {
          mediaCache.set(msgIdentifier, dbMsg.media_url);
          setMediaUrl(dbMsg.media_url);

            // Update DB record
            await (supabase.from('whatsapp_messages')
              .update({ media_url: publicUrl, media_type: result.mimetype })
              .eq('id', msg.id) as any);
          } else {
            // Fallback to data URI
            const dataUri = `data:${result.mimetype};base64,${result.data}`;
            mediaCache.set(msgIdentifier, dataUri);
            setMediaUrl(dataUri);
          }
        }
      } catch (err) {
        console.error('Error loading media:', err);
      }
      setLoadingMedia(false);
    };

    loadMedia();
  }, [needsMediaFetch]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      onReply(msg);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
      return format(d, 'dd/MM HH:mm', { locale: ptBR });
    } catch { return ''; }
  };

  const renderMediaContent = () => {
    if (loadingMedia) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-black/10 animate-pulse">
          {msg.message_type === 'image' || msg.message_type === 'sticker' ? (
            <ImageIcon className="h-5 w-5 opacity-50" />
          ) : msg.message_type === 'video' ? (
            <Video className="h-5 w-5 opacity-50" />
          ) : msg.message_type === 'ptt' || msg.message_type === 'audio' ? (
            <Mic className="h-5 w-5 opacity-50" />
          ) : (
            <FileText className="h-5 w-5 opacity-50" />
          )}
          <span className="text-xs opacity-60">Carregando mídia...</span>
        </div>
      );
    }

    if (!mediaUrl && hasMedia) {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5">
          {msg.message_type === 'image' || msg.message_type === 'sticker' ? (
            <ImageIcon className="h-4 w-4 opacity-40" />
          ) : msg.message_type === 'video' ? (
            <Video className="h-4 w-4 opacity-40" />
          ) : msg.message_type === 'ptt' || msg.message_type === 'audio' ? (
            <Mic className="h-4 w-4 opacity-40" />
          ) : (
            <FileText className="h-4 w-4 opacity-40" />
          )}
          <span className="text-xs opacity-50">
            {msg.message_type === 'image' ? '📷 Imagem' :
             msg.message_type === 'video' ? '🎥 Vídeo' :
             msg.message_type === 'ptt' || msg.message_type === 'audio' ? '🎤 Áudio' :
             msg.message_type === 'sticker' ? '🏷️ Figurinha' :
             '📎 Arquivo'}
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
            className="rounded-lg max-w-full max-h-[300px] object-contain cursor-pointer"
            onClick={() => window.open(mediaUrl, '_blank')}
            loading="lazy"
          />
        );
      case 'video':
        return (
          <video
            src={mediaUrl}
            controls
            className="rounded-lg max-w-full max-h-[300px]"
            preload="metadata"
          />
        );
      case 'ptt':
      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <Mic className="h-4 w-4 shrink-0 opacity-60" />
            <audio src={mediaUrl} controls className="h-8 flex-1" preload="metadata" />
          </div>
        );
      case 'document':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} transition-colors`}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="text-xs flex-1 truncate">{msg.content || 'Documento'}</span>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
      ref={bubbleRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply button (desktop hover) */}
      {isMe && (
        <button
          onClick={() => onReply(msg)}
          className="self-center mr-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
          title="Responder"
        >
          <Reply className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
        isMe
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted rounded-bl-md'
      }`}>
        {/* Quoted reply */}
        {msg.reply_to_content && (
          <div className={`mb-1.5 px-2 py-1 rounded text-xs border-l-2 ${
            isMe
              ? 'bg-white/10 border-white/40 text-primary-foreground/80'
              : 'bg-black/5 border-primary/40 text-muted-foreground'
          }`}>
            <p className="truncate">{msg.reply_to_content}</p>
          </div>
        )}

        {/* Media content */}
        {hasMedia && (
          <div className="mb-1">
            {renderMediaContent()}
          </div>
        )}

        {/* Text content - don't show for document type if it's just the filename and we showed it in media */}
        {msg.content && !(msg.message_type === 'document' && mediaUrl) && msg.message_type !== 'ptt' && msg.message_type !== 'audio' && (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}

        {/* Caption for documents with text beyond filename */}
        {msg.content && msg.message_type === 'document' && mediaUrl && !msg.content.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i) && (
          <p className="whitespace-pre-wrap break-words mt-1">{msg.content}</p>
        )}

        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          {formatTime(msg.created_at)}
        </p>
      </div>

      {/* Reply button (desktop hover) */}
      {!isMe && (
        <button
          onClick={() => onReply(msg)}
          className="self-center ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
          title="Responder"
        >
          <Reply className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
