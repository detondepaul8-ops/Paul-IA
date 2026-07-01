'use client';

import { useChatStore, Message } from '@/lib/chat-store';
import { cn } from '@/lib/utils';
import { getTaskTypeLabel } from '@/lib/ai-router';
import type { TaskType } from '@/lib/ai-router';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

const MODULE_BADGES: Record<string, string> = {
  chat: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  code: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  content: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  image: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  project: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
      aria-label="Copier le code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function MessageContent({ message }: { message: Message }) {
  if (message.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
        </div>
        <span className="text-sm">Paul IA réfléchit...</span>
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-xs prose-code:font-mono">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group rounded-lg overflow-hidden border border-border my-3">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                  <span className="text-xs text-muted-foreground font-mono">{match[1]}</span>
                  <CopyButton text={String(children).replace(/\n$/, '')} />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.3)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border bg-muted/50 px-3 py-2 text-left text-sm font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-3 py-2 text-sm">{children}</td>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}

export default function MessageList() {
  const { messages } = useChatStore();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">P</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Bienvenue sur Paul IA
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Votre assistant intelligent capable de répondre à vos questions, générer du code,
              créer du contenu, produire des images et structurer des projets complets.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '💬', label: 'Discussion', desc: 'Posez n\'importe quelle question' },
              { icon: '⚡', label: 'Code', desc: 'Génération de code et scripts' },
              { icon: '📝', label: 'Contenu', desc: 'Articles, emails, marketing' },
              { icon: '🎨', label: 'Images', desc: 'Génération d\'images IA' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl border border-border bg-card/50 hover:bg-accent/30 transition-colors"
              >
                <span className="text-lg">{item.icon}</span>
                <p className="font-medium text-sm text-foreground mt-1">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[85%] space-y-2',
                message.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              {/* Module badge for assistant */}
              {message.role === 'assistant' && message.module && !message.isLoading && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium',
                    MODULE_BADGES[message.module] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {getTaskTypeLabel(message.module as TaskType)}
                </span>
              )}

              <div
                className={cn(
                  'rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                )}
              >
                {message.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <MessageContent message={message} />
                )}
              </div>

              {/* Image display */}
              {message.imageBase64 && (
                <div className="rounded-xl overflow-hidden border border-border max-w-sm">
                  <img
                    src={message.imageBase64}
                    alt="Image générée"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}