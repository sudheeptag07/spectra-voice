'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation } from '@elevenlabs/react';
import { AudioLines, CheckCircle2, Mic, PhoneOff, Volume2, Zap } from 'lucide-react';
import type { CandidateWithInterview } from '@/lib/types';

type Props = {
  candidateId: string;
};

type RoomState = 'idle' | 'connecting' | 'live' | 'completed' | 'error';

function formatError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickMessageRow(payload: unknown): { role: string; text: string } | null {
  const row = asRecord(payload);
  const type = typeof row.type === 'string' ? row.type : '';

  const userTranscript = asRecord(row.user_transcription_event).user_transcript;
  if (type === 'user_transcript' && typeof userTranscript === 'string' && userTranscript.trim()) {
    return { role: 'user', text: userTranscript.trim() };
  }

  const agentResponse = asRecord(row.agent_response_event).agent_response;
  if (type === 'agent_response' && typeof agentResponse === 'string' && agentResponse.trim()) {
    return { role: 'agent', text: agentResponse.trim() };
  }

  const text = row.text;
  if (typeof text === 'string' && text.trim()) {
    const role = typeof row.role === 'string' ? row.role : 'speaker';
    return { role, text: text.trim() };
  }

  const message = row.message;
  if (typeof message === 'string' && message.trim()) {
    const role = typeof row.role === 'string' ? row.role : type || 'speaker';
    return { role, text: message.trim() };
  }

  return null;
}

export function InterviewRoom({ candidateId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<RoomState>('idle');
  const [candidate, setCandidate] = useState<CandidateWithInterview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enteredRoom, setEnteredRoom] = useState(false);
  const sessionStartedRef = useRef(false);
  const userEndedRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  const isEndingRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const transcriptRef = useRef<Array<{ role: string; text: string }>>([]);

  const conversation = useConversation({
    onConnect: () => {
      setState('live');
      sessionStartedRef.current = true;
      connectedAtRef.current = Date.now();
      userEndedRef.current = false;
      void setStatus('interviewing');
    },
    onDisconnect: () => {
      if (isEndingRef.current) {
        return;
      }
      if (!sessionStartedRef.current) {
        setState('idle');
        setError('Unable to establish a stable voice session. Please click Start Conversation again.');
        return;
      }
      const connectedAt = connectedAtRef.current ?? Date.now();
      const connectedMs = Date.now() - connectedAt;
      const canAutoComplete = sessionStartedRef.current && connectedMs >= 45000;

      if (userEndedRef.current || canAutoComplete) {
        void finalizeInterview();
        return;
      }

      sessionStartedRef.current = false;
      connectedAtRef.current = null;
      setState('idle');
      setError('Connection interrupted. Please click Start Conversation again.');
    },
    onError: (event) => {
      setState('error');
      setError(event || 'Unable to connect to ElevenLabs conversation service.');
    },
    onMessage: (message) => {
      const row = pickMessageRow(message);
      if (!row) return;
      transcriptRef.current.push(row);
    }
  });

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/candidates/${candidateId}`, { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as CandidateWithInterview;
        setCandidate(data);
        if (data.status === 'completed') {
          setState('completed');
          setEnteredRoom(true);
        }
      }
    }

    void load();
  }, [candidateId]);

  useEffect(() => {
    return () => {
      if (!sessionStartedRef.current || isEndingRef.current) {
        return;
      }
      isEndingRef.current = true;
      void conversation.endSession().finally(() => {
        isEndingRef.current = false;
      });
    };
    // Intentionally run only on unmount to avoid cancelling an in-flight connection on rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(status: 'pending' | 'interviewing' | 'completed'): Promise<boolean> {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        return false;
      }

      setCandidate((prev) => (prev ? { ...prev, status } : prev));
      return true;
    } catch {
      return false;
    }
  }

  async function finalizeInterview() {
    if (isFinalizingRef.current) {
      return;
    }
    isFinalizingRef.current = true;
    sessionStartedRef.current = false;
    connectedAtRef.current = null;
    userEndedRef.current = false;
    const persistTask = persistInterviewFromClient();
    const statusTask = setStatus('completed');

    // Never block navigation indefinitely on network/webhook calls.
    await Promise.race([Promise.allSettled([persistTask, statusTask]), sleep(1200)]);

    setState('completed');
    router.push(`/thank-you?id=${candidateId}`);
  }

  async function persistInterviewFromClient() {
    if (transcriptRef.current.length === 0) {
      return;
    }

    try {
      await fetch('/api/elevenlabs-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: conversation.getId() || `local-${candidateId}-${Date.now()}`,
          dynamic_variables: {
            candidate_id: candidateId
          },
          transcript: transcriptRef.current
        })
      });
    } catch {
      // If this fallback fails, external webhook may still populate data later.
    }
  }

  async function startInterview() {
    setError(null);
    if (isStartingRef.current || isEndingRef.current) {
      return;
    }
    if (candidate?.status === 'completed' || state === 'completed') {
      setError('Interview already completed. Restart is not allowed.');
      return;
    }

    setState('connecting');
    isStartingRef.current = true;

    try {
      userEndedRef.current = false;
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const cvText = (candidate?.cv_text || '').slice(0, 3000);
      const dynamicVariables = {
        candidate_name: candidate?.name || 'Candidate',
        candidate_id: candidateId,
        cv_text: cvText
      };

      const signedUrlResponse = await fetch('/api/elevenlabs/signed-url', { cache: 'no-store' });
      if (!signedUrlResponse.ok) {
        const payload = (await signedUrlResponse.json()) as { error?: string };
        throw new Error(payload.error || 'Unable to get signed ElevenLabs URL.');
      }
      const { signedUrl } = (await signedUrlResponse.json()) as { signedUrl: string };

      // Attempt 1: full contextual configuration.
      try {
        await conversation.startSession({
          signedUrl,
          connectionType: 'websocket',
          dynamicVariables
        });
      } catch {
        // Attempt 2: minimal signed-url config.
        try {
          await conversation.startSession({
            signedUrl,
            connectionType: 'websocket',
            dynamicVariables
          });
        } catch (secondaryError) {
          // Attempt 3: minimal public agent websocket config.
          const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
          if (!agentId) {
            throw secondaryError;
          }
          await conversation.startSession({
            agentId,
            connectionType: 'websocket',
            dynamicVariables
          });
        }
      }
    } catch (err) {
      setState('error');
      setError(formatError(err));
    } finally {
      isStartingRef.current = false;
    }
  }

  async function endInterview() {
    if (isEndingRef.current || isFinalizingRef.current) {
      return;
    }
    userEndedRef.current = true;
    isEndingRef.current = true;
    try {
      // Bound endSession wait so UI does not get stuck.
      await Promise.race([conversation.endSession(), sleep(1500)]);
    } catch {
      // Ignore local disconnection errors and still complete the interview status.
    } finally {
      isEndingRef.current = false;
    }
    sessionStartedRef.current = false;
    await finalizeInterview();
  }

  if (!enteredRoom) {
    return (
      <section className="mx-auto mt-10 max-w-5xl text-center">
        <h1 className="spectra-heading mt-5 text-4xl md:text-6xl">
          <span className="text-white">Spectra </span>
          <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Voice</span>
        </h1>
        <p className="muted mx-auto mt-5 max-w-3xl text-base leading-relaxed md:text-xl">Ready when you are!</p>

        <div className="glass-panel mx-auto mt-10 w-full max-w-xl p-8">
          <Zap className="mx-auto h-10 w-10 text-yellow-400" />
          <h2 className="spectra-heading mt-5 text-3xl text-white">You&apos;re up next!</h2>
          <p className="muted mx-auto mt-4 max-w-md text-base leading-relaxed">
            The interview assistant is ready. Please ensure your microphone is working and you are in a quiet environment.
          </p>
          <button
            onClick={() => setEnteredRoom(true)}
            className="mt-7 rounded-2xl bg-white px-7 py-3 text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Enter Interview Room
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-8 max-w-4xl text-center">
      <h1 className="spectra-heading text-3xl text-white md:text-5xl">Spectra Voice Assistant</h1>
      <p className="muted mt-3 text-base md:text-xl">GTM Sales Screening for Skylark Drones</p>

      <div className="mx-auto mt-8 flex h-48 w-48 items-center justify-center rounded-full border border-sky-500/30 bg-sky-900/30 md:h-56 md:w-56">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-sky-800/40 text-sky-300 md:h-40 md:w-40">
          {state === 'live' ? <AudioLines className="h-14 w-14 animate-pulse" /> : <Volume2 className="h-14 w-14" />}
        </div>
      </div>

      <p className="mt-5 text-base text-slate-400 md:text-xl">
        {state === 'live' ? (
          <span className="inline-flex items-center gap-2 text-emerald-400">
            <span className="h-3 w-3 rounded-full bg-emerald-400" /> Live
          </span>
        ) : state === 'connecting' ? (
          'Connecting...'
        ) : (
          'Waiting to start...'
        )}
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {state !== 'live' ? (
          <button
            onClick={startInterview}
            disabled={state === 'connecting' || state === 'completed' || candidate?.status === 'completed'}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold text-white transition hover:text-[#F14724] disabled:cursor-not-allowed disabled:opacity-60 md:text-xl"
          >
            <Mic className="h-6 w-6" />
            Start Conversation
          </button>
        ) : null}

        {state === 'live' ? (
          <button
            onClick={endInterview}
            className="inline-flex items-center gap-3 rounded-2xl bg-rose-500 px-7 py-3 text-lg font-semibold text-white shadow-[0_12px_32px_rgba(244,63,94,0.35)] transition hover:bg-rose-400"
          >
            <PhoneOff className="h-6 w-6" />
            End Interview
          </button>
        ) : null}

      </div>

      {error ? <p className="mt-5 text-sm text-rose-300">{error}</p> : null}

      <div className="glass-panel mx-auto mt-10 max-w-3xl p-6 text-left">
        <p className="text-base font-semibold uppercase tracking-wider text-slate-400">Interview Tips</p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-400">
          <li>Speak clearly and at a normal pace.</li>
          <li>Use a headset if possible for best audio quality.</li>
          <li>You can interrupt the assistant if needed.</li>
          <li>This is a one-time interview and cannot be restarted after completion.</li>
        </ul>
      </div>

      {state === 'completed' ? (
        <p className="mt-6 inline-flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" /> Interview completed.
        </p>
      ) : null}
    </section>
  );
}
