import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { Copy, Check, Power, MousePointer2, Keyboard, MonitorOff, Users } from 'lucide-react';

interface HostViewProps {
  onBack: () => void;
}

export default function HostView({ onBack }: HostViewProps) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'waiting' | 'connected'>('idle');
  const [copied, setCopied] = useState(false);
  const [allowControl, setAllowControl] = useState(true);
  const [workerCursor, setWorkerCursor] = useState<{ x: number; y: number } | null>(null);
  const [workerClick, setWorkerClick] = useState<{ x: number; y: number } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('session-created', (code: string) => {
      setSessionCode(code);
      setStatus('waiting');
    });

    socketRef.current.on('worker-joined', (workerId: string) => {
      console.log('Worker joined:', workerId);
      startStreaming(workerId);
    });

    socketRef.current.on('signal', ({ from, signal }) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    socketRef.current.on('session-ended', () => {
      stopSession();
    });

    return () => {
      stopSession();
      socketRef.current?.disconnect();
    };
  }, []);

  const startSession = async () => {
    try {
      setStatus('creating');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "browser"
        } as any,
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getTracks()[0].onended = () => {
        stopSession();
      };

      socketRef.current?.emit('create-session');
    } catch (err) {
      console.error('Error starting session:', err);
      setStatus('idle');
    }
  };

  const startStreaming = (workerId: string) => {
    if (!streamRef.current) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: streamRef.current,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('signal', { to: workerId, signal });
    });

    peer.on('connect', () => {
      console.log('P2P Connected');
      setStatus('connected');
    });

    peer.on('data', (data) => {
      if (!allowControl) return;
      
      try {
        const event = JSON.parse(data.toString());
        handleRemoteEvent(event);
      } catch (e) {
        console.error('Error parsing remote event:', e);
      }
    });

    peer.on('close', () => {
      setStatus('waiting');
      peerRef.current = null;
    });

    peerRef.current = peer;
  };

  const handleRemoteEvent = (event: any) => {
    if (event.type === 'mousemove') {
      setWorkerCursor({ x: event.x, y: event.y });
    } else if (event.type === 'mousedown') {
      setWorkerClick({ x: event.x, y: event.y });
      setTimeout(() => setWorkerClick(null), 300);
    }
    // Note: We can't actually move the host's mouse or type for them
    // but we show the visual feedback.
  };

  const stopSession = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setSessionCode(null);
    setStatus('idle');
    setWorkerCursor(null);
  };

  const copyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Session Status</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-pulse' : 
                status === 'waiting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-zinc-700'
              }`} />
              <span className="font-bold capitalize">{status}</span>
            </div>
          </div>

          {sessionCode && (
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Access Code</h2>
              <div className="flex items-center gap-2">
                <code className="bg-zinc-800 px-3 py-1 rounded font-mono text-lg text-orange-500 font-bold tracking-widest">
                  {sessionCode}
                </code>
                <button 
                  onClick={copyCode}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status !== 'idle' && (
            <button
              onClick={() => setAllowControl(!allowControl)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                allowControl 
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {allowControl ? <MousePointer2 className="w-4 h-4" /> : <MonitorOff className="w-4 h-4" />}
              <span className="text-sm font-bold">{allowControl ? 'Control Enabled' : 'Control Blocked'}</span>
            </button>
          )}
          <button
            onClick={status === 'idle' ? startSession : stopSession}
            disabled={status === 'creating'}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
              status === 'idle' 
                ? 'bg-orange-500 text-black hover:scale-105' 
                : 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20'
            }`}
          >
            <Power className="w-4 h-4" />
            {status === 'idle' ? 'Start Sharing' : 'End Session'}
          </button>
        </div>
      </div>

      <div className="relative aspect-video bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <MonitorOff className="w-10 h-10" />
            </div>
            <p className="text-lg font-medium">No active stream</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-orange-500 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Waiting for Worker</h3>
            <p className="text-zinc-400 max-w-xs">Share the code above with your collaborator to start the session.</p>
          </div>
        )}

        {/* Worker Cursor Overlay */}
        {workerCursor && allowControl && (
          <div 
            className="absolute pointer-events-none transition-all duration-75 ease-out"
            style={{ 
              left: `${workerCursor.x * 100}%`, 
              top: `${workerCursor.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <MousePointer2 className="w-6 h-6 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] fill-orange-500" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-orange-500 text-black text-[10px] font-bold rounded whitespace-nowrap">
                WORKER
              </div>
            </div>
          </div>
        )}

        {/* Click Feedback */}
        {workerClick && (
          <div 
            className="absolute pointer-events-none w-12 h-12 border-2 border-orange-500 rounded-full animate-ping"
            style={{ 
              left: `${workerClick.x * 100}%`, 
              top: `${workerClick.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-bold">Privacy First</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Your stream is peer-to-peer and encrypted. We don't store any video data on our servers.
          </p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <MousePointer2 className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="font-bold">Remote Control</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Workers can point and click to guide you. You can revoke control instantly at any time.
          </p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="font-bold">Task Focused</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Optimized for browser-based workflows. Perfect for training, support, or collaborative reviews.
          </p>
        </div>
      </div>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
