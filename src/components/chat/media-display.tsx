'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Share2,
  RefreshCw,
  Trash2,
  MoreVertical,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';
import type { ClientMediaType } from '@/lib/chat-store';

interface MediaDisplayProps {
  messageId: string;
  mediaUrl: string;
  mediaType: ClientMediaType;
  regeneratePrompt?: string;
}

export default function MediaDisplay({ messageId, mediaUrl, mediaType, regeneratePrompt }: MediaDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const removeMediaFromMessage = useChatStore((s) => s.removeMediaFromMessage);
  const isLoading = useChatStore((s) => s.isLoading);

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = mediaType === 'image' ? 'png' : mediaType === 'audio' ? 'wav' : 'mp4';
      a.download = `paul-ia-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error('Download failed');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mediaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Copy failed');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Paul IA - Média', url: mediaUrl });
      } catch {
        // User cancelled
      }
    } else {
      await handleCopyLink();
    }
  };

  const handleDelete = () => {
    removeMediaFromMessage(messageId);
  };

  const handleRegenerate = async () => {
    if (isRegenerating || isLoading || !regeneratePrompt) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: regeneratePrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mediaUrl) {
          // Find the message in store and update its media
          const store = useChatStore.getState();
          const idx = store.messages.findIndex((m) => m.id === messageId);
          if (idx >= 0) {
            store.updateMessage(messageId, {
              mediaUrl: data.mediaUrl,
              mediaType: data.mediaType,
              content: data.content,
            });
          }
        }
      }
    } catch (e) {
      console.error('Regenerate failed:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border max-w-md w-full">
      {/* Media content */}
      <div className="relative group bg-black/20">
        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt="Média généré"
            className="w-full h-auto block"
            loading="lazy"
          />
        )}

        {mediaType === 'video' && (
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            className="w-full max-h-[400px] block"
            playsInline
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        )}

        {mediaType === 'audio' && (
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <audio
                src={mediaUrl}
                controls
                preload="metadata"
                className="flex-1 min-w-0"
              >
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80 border-0 text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copié !' : 'Copier le lien'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {regeneratePrompt && (
                <DropdownMenuItem onClick={handleRegenerate} disabled={isRegenerating}>
                  {isRegenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Régénérer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}