'use client';

/**
 * MODE VOCAL PAUL IA — conversation vocale continue, proche du mode direct.
 * Mécanisme transféré de CELTIIS BASSILA (composant éprouvé en production) :
 *  - PHASES : écoute (STT) → réflexion (requête en cours) → parole (TTS) ;
 *  - ÉCOUTE : SpeechRecognition navigateur SEUL (mode stt) — fin de parole =
 *    silence de transcription (1,6 s) → envoi automatique sans bouton ;
 *  - REPLI (mode recorder) : getUserMedia + MediaRecorder + VAD → /api/voice
 *    (ASR serveur 4 canaux) si le STT navigateur est indisponible ;
 *  - BARGE-IN : pendant la parole de l'IA, un analyseur surveille le micro
 *    (annulation d'écho du navigateur) — une voix franche coupe la synthèse ;
 *  - L'écoute reprend automatiquement ~450 ms après la fin de la réponse ;
 *  - Une reformulation pendant la réflexion ANNULE la requête (AbortController).
 * Aucune logique métier CELTIIS n'est reprise — assistant universel Paul IA.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, X, MicOff, Volume2 } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';

type Phase = 'listening' | 'thinking' | 'speaking';
type Mode = 'stt' | 'recorder';
interface Turn { role: 'user' | 'assistant'; content: string }

// ─── NETTOYAGE DE TRANSCRIPTION (transféré tel quel de CELTIIS) ────────────
const nrmWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function cleanTranscription(t: string): string {
  const words = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (out.length && nrmWord(w) === nrmWord(out[out.length - 1]) && nrmWord(w).length >= 2) continue;
    let skipped = false;
    for (let k = 8; k >= 3; k--) {
      if (out.length >= k && i + k <= words.length) {
        const tail = out.slice(-k).map(nrmWord).join(' ');
        const next = words.slice(i, i + k).map(nrmWord).join(' ');
        if (tail && tail === next) { i += k - 1; skipped = true; break; }
      }
    }
    if (!skipped) out.push(w);
  }
  return out.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/** Couleur de l'orbe par phase — identité Paul IA. */
const ORB_RGB: Record<Phase, [number, number, number]> = {
  listening: [34, 197, 94],   // vert
  thinking: [245, 158, 11],   // ambre
  speaking: [56, 189, 248],   // ciel
};

// ─────────────────────────────────────────────────────────────────────────────
// ORBE VOCALE — canvas réactif
// ─────────────────────────────────────────────────────────────────────────────
function VoiceOrb({ phaseRef, userEnergyRef, aiEnergyRef, onTap }: {
  phaseRef: React.MutableRefObject<Phase>;
  userEnergyRef: React.MutableRefObject<number>;
  aiEnergyRef: React.MutableRefObject<number>;
  onTap: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const draw = (tsMs: number) => {
      const t = tsMs / 1000;
      userEnergyRef.current *= 0.93;
      aiEnergyRef.current *= 0.9;
      const energy = Math.min(1, userEnergyRef.current + aiEnergyRef.current);
      const phase = phaseRef.current;
      const [r, g, b] = ORB_RGB[phase];
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const baseR = Math.min(w, h) * 0.18;
      // halo
      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, baseR * 2.2 + energy * 40);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // anneaux
      for (let i = 0; i < 3; i++) {
        const rr = baseR * (1 + i * 0.18) + Math.sin(t * (2 + i)) * 3 + energy * (12 + i * 10);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 - i * 0.16})`;
        ctx.lineWidth = 2.5 - i * 0.6;
        ctx.stroke();
      }
      // noyau
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.55 + energy * 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phaseRef, userEnergyRef, aiEnergyRef]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      onClick={onTap}
      className="cursor-pointer select-none touch-none"
      aria-label="Orbe vocale Paul IA — toucher pour arrêter"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    messages, addMessage, updateMessage, setIsLoading,
    currentConversationId, setCurrentConversation, addConversation, isLoading,
  } = useChatStore();

  const [phase, setPhase] = useState<Phase>('listening');
  const [mode, setMode] = useState<Mode>('stt');
  const [lastUser, setLastUser] = useState('');
  const [lastAssistant, setLastAssistant] = useState('');
  const [error, setError] = useState('');

  const phaseRef = useRef<Phase>('listening');
  const userEnergyRef = useRef(0);
  const aiEnergyRef = useRef(0);

  const recRef = useRef<any>(null);              // SpeechRecognition
  const abortRef = useRef<AbortController | null>(null);
  const mutedRef = useRef(false);
  const runningRef = useRef(false);
  const stoppingRef = useRef(false);
  const modeRef = useRef<Mode>('stt');
  const convIdRef = useRef<string | null>(null);
  const finalBufRef = useRef('');                // transcription finalisée en cours
  const interimBufRef = useRef('');
  const lastFinalAtRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recBargeRef = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const msgListRef = useRef(messages);
  msgListRef.current = messages;

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  // ── SYNTHÈSE VOCALE (TTS navigateur, segmentée pour la fluidité) ──────────
  const speak = useCallback((text: string): Promise<void> => new Promise((resolve) => {
    const clean = text
      .replace(/```[\s\S]*?```/g, ' bloc de code ')
      .replace(/[*_#>`]/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/SOURCES\s*:[\s\S]*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 700);
    if (!clean || !('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const parts = clean.match(/[^.!?]+[.!?]*/g) || [clean];
    let done = 0;
    const onEnd = () => { done++; if (done >= parts.length) resolve(); };
    for (const part of parts.slice(0, 12)) {
      const u = new SpeechSynthesisUtterance(part.trim());
      u.lang = 'fr-FR';
      u.rate = 1.05;
      u.onend = onEnd;
      u.onerror = onEnd;
      speechSynthesis.speak(u);
    }
  }), []);

  const interruptPlayback = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { /* — */ }
    aiEnergyRef.current = 0;
    if (abortRef.current) { try { abortRef.current.abort(); } catch { /* — */ } abortRef.current = null; }
    setPhaseBoth('listening');
  }, []);

  // ── ENVOI DU TOUR DE PAROLE → /api/chat ───────────────────────────────────
  const sendTurn = useCallback(async (rawText: string) => {
    const text = cleanTranscription(rawText);
    if (!text) return;
    setError('');
    setLastUser(text);
    setLastAssistant('');
    setPhaseBoth('thinking');
    finalBufRef.current = '';
    interimBufRef.current = '';

    const userMsgId = crypto.randomUUID();
    addMessage({ id: userMsgId, role: 'user', content: text });
    const loadingId = crypto.randomUUID();
    addMessage({ id: loadingId, role: 'assistant', content: '', isLoading: true });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const history = msgListRef.current
        .filter((m) => !m.isLoading)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: convIdRef.current, history }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (data.conversationId && !convIdRef.current) {
        convIdRef.current = data.conversationId;
        setCurrentConversation(data.conversationId);
        addConversation({
          id: data.conversationId, title: text.slice(0, 60), module: data.module,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _count: { messages: 1 },
        });
      }
      updateMessage(loadingId, {
        content: data.content, module: data.module,
        mediaUrl: data.mediaUrl || null, mediaType: data.mediaType || null, isLoading: false,
      });
      setPhaseBoth('speaking');
      aiEnergyRef.current = 1;
      await speak(String(data.content || ''));
      setLastAssistant(String(data.content || '').slice(0, 400));
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // remplacé par une reformulation
      const msg = 'Une erreur est survenue. Réessaie.';
      updateMessage(loadingId, { content: msg, isLoading: false });
      setError(msg);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      // reprise automatique de l'écoute ~450 ms après la réponse
      if (!stoppingRef.current) {
        setTimeout(() => { if (runningRef.current && !mutedRef.current) startListening(); }, 450);
      }
    }
  }, [addMessage, addConversation, currentConversationId, setCurrentConversation, setIsLoading, speak, updateMessage]);

  // ── MODE REPLIER : getUserMedia + MediaRecorder + VAD → /api/voice ────────
  const stopRecorderMode = useCallback(async () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch { /* — */ } }
    recorderRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { try { await audioCtxRef.current.close(); } catch { /* — */ } audioCtxRef.current = null; }
  }, []);

  const startRecorderMode = useCallback(async () => {
    modeRef.current = 'recorder';
    setMode('recorder');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      if (stoppingRef.current || !runningRef.current) return;
      const blob = new Blob(chunks, { type: mime || 'audio/webm' });
      if (blob.size < 1200) { startRecorderMode(); return; } // trop court : réécoute
      setPhaseBoth('thinking');
      try {
        const fd = new FormData();
        fd.append('audio', blob, `audio.${(mime || 'audio/webm').includes('mp4') ? 'mp4' : 'webm'}`);
        const res = await fetch('/api/voice', { method: 'POST', body: fd });
        const data = await res.json();
        const text = String(data?.text || '').trim();
        if (text) await sendTurn(text);
        else { setError('Transcription impossible — réessaie.'); startRecorderMode(); }
      } catch {
        setError('Transcription impossible — réessaie.');
        startRecorderMode();
      }
    };
    rec.start();
    setPhaseBoth('listening');
  }, [sendTurn]);

  // ── BARGE-IN (surveillance du micro pendant la parole de l'IA) ────────────
  const startBargeAnalyser = useCallback(async () => {
    if (recBargeRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let loudFrames = 0;
      const loop = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 2; i < 60; i++) sum += buf[i];
        const avg = sum / 58;
        if (avg > 26) {
          loudFrames++;
          if (loudFrames >= 6) { loudFrames = 0; interruptPlayback(); }
        } else {
          loudFrames = Math.max(0, loudFrames - 1);
        }
        recBargeRef.current!.raf = requestAnimationFrame(loop);
      };
      recBargeRef.current = { ctx, stream, raf: requestAnimationFrame(loop) };
    } catch { /* pas de barge-in si micro refusé */ }
  }, [interruptPlayback]);

  const stopBargeAnalyser = useCallback(() => {
    const b = recBargeRef.current;
    if (b) { cancelAnimationFrame(b.raf); b.stream.getTracks().forEach((t) => t.stop()); b.ctx.close().catch(() => null); recBargeRef.current = null; }
  }, []);

  // ── MODE STT : SpeechRecognition continu ──────────────────────────────────
  const startListening = useCallback(() => {
    if (!runningRef.current || stoppingRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { startRecorderMode(); return; }
    try {
      const rec = new SR();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = true;
      recRef.current = rec;
      rec.onresult = (ev: any) => {
        if (stoppingRef.current) return;
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const txt = String(r[0]?.transcript || '');
          if (r.isFinal) {
            const add = txt.trim();
            if (add) {
              finalBufRef.current = (finalBufRef.current + ' ' + add).trim();
              lastFinalAtRef.current = Date.now();
              userEnergyRef.current = Math.min(1, userEnergyRef.current + 0.5);
            }
            interimBufRef.current = '';
          } else if (txt.trim()) {
            interimBufRef.current = txt.trim();
            userEnergyRef.current = Math.min(1, userEnergyRef.current + 0.3);
          }
        }
      };
      rec.onerror = (ev: any) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setError('Micro refusé — autorise le micro pour parler à Paul IA.');
          stopVoice();
        } else if (ev.error === 'no-speech' || ev.error === 'network') {
          try { rec.stop(); } catch { /* — */ }
        }
      };
      rec.onend = () => {
        // watchdog : relance si la session meurt (hors arrêt volontaire)
        if (runningRef.current && !stoppingRef.current && phaseRef.current !== 'speaking') {
          setTimeout(() => { if (runningRef.current && !stoppingRef.current) startListening(); }, 300);
        }
      };
      rec.start();
      setPhaseBoth(phaseRef.current === 'thinking' ? 'thinking' : 'listening');
    } catch {
      startRecorderMode();
    }
  }, [startRecorderMode]);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (rec) { try { rec.onend = null; rec.stop(); } catch { /* — */ } recRef.current = null; }
  }, []);

  // Envoi automatique : fin de parole = 1,6 s sans nouveau segment
  useEffect(() => {
    if (mode !== 'stt' || !runningRef.current) return;
    const tick = setInterval(() => {
      if (stoppingRef.current || mutedRef.current) return;
      if (phaseRef.current === 'speaking') return;
      const hasContent = finalBufRef.current.trim().length > 0;
      const quiet = Date.now() - lastFinalAtRef.current >= 1600;
      if (hasContent && quiet) {
        stopListening();
        sendTurn(finalBufRef.current);
      }
    }, 300);
    return () => clearInterval(tick);
  }, [mode, sendTurn, stopListening]);

  // ── CYCLE DE VIE ──────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    runningRef.current = true;
    stoppingRef.current = false;
    mutedRef.current = false;
    finalBufRef.current = '';
    interimBufRef.current = '';
    startListening();
  }, [startListening]);

  const stopVoice = useCallback(() => {
    stoppingRef.current = true;
    runningRef.current = false;
    stopListening();
    stopRecorderMode();
    stopBargeAnalyser();
    try { window.speechSynthesis.cancel(); } catch { /* — */ }
    if (abortRef.current) { try { abortRef.current.abort(); } catch { /* — */ } abortRef.current = null; }
    setPhaseBoth('listening');
    onClose();
  }, [onClose, stopBargeAnalyser, stopListening, stopRecorderMode]);

  useEffect(() => {
    if (!open) { if (runningRef.current) stopVoice(); return; }
    startVoice();
    return () => {
      stoppingRef.current = true;
      runningRef.current = false;
      stopListening();
      stopRecorderMode();
      stopBargeAnalyser();
      try { window.speechSynthesis.cancel(); } catch { /* — */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pendant la parole : barge-in actif ; pendant l'écoute : barge-in coupé
  useEffect(() => {
    if (open && phase === 'speaking') startBargeAnalyser();
    else stopBargeAnalyser();
  }, [phase, open, startBargeAnalyser, stopBargeAnalyser]);

  if (!open) return null;

  const phaseLabel = phase === 'listening' ? 'Je t\'écoute…'
    : phase === 'thinking' ? 'Je réfléchis…' : 'Je réponds…';

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-between px-4 py-6">
      {/* Barre supérieure */}
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Mode vocal — conversation continue avec Paul IA</span>
        </div>
        <button onClick={stopVoice} aria-label="Fermer le mode vocal"
          className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Orbe + transcription */}
      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
        <VoiceOrb
          phaseRef={phaseRef}
          userEnergyRef={userEnergyRef}
          aiEnergyRef={aiEnergyRef}
          onTap={() => {
            if (phaseRef.current === 'speaking') interruptPlayback();
            else if (phaseRef.current === 'thinking') {
              if (abortRef.current) { try { abortRef.current.abort(); } catch { /* — */ } }
              setPhaseBoth('listening');
              if (modeRef.current === 'stt') { stopListening(); startListening(); }
            }
          }}
        />
        <p className="text-lg font-medium text-foreground">{phaseLabel}</p>
        {mode === 'recorder' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MicOff className="h-3.5 w-3.5" /> transcription serveur (repli)
          </p>
        )}
        <div className="w-full max-w-2xl min-h-[120px] space-y-3 text-center px-2">
          {lastUser && (
            <p className="text-sm text-muted-foreground italic">« {lastUser} »</p>
          )}
          {lastAssistant && (
            <p className="text-sm text-foreground line-clamp-6">{lastAssistant}</p>
          )}
          {interimBufRef.current && phase === 'listening' && !lastUser && (
            <p className="text-xs text-muted-foreground">{interimBufRef.current}</p>
          )}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      {/* Aide */}
      <p className="text-[11px] text-muted-foreground text-center max-w-md">
        Parle naturellement : Paul IA détecte la fin de ta phrase et répond à voix haute.
        Touche l&apos;orbe pour l&apos;interrompre, ou ferme pour revenir au clavier.
      </p>
    </div>
  );
}
