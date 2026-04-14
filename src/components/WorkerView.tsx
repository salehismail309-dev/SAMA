import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { ArrowLeft, Loader2, MousePointer2, Keyboard, AlertCircle, Maximize2 } from 'lucide-react';

interface WorkerViewProps {
  code: string;
  onBack: () => void;
}

export default function WorkerView({ code, onBack }: WorkerViewProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join-session', code);
    });

    socketRef.current.on('session-joined', () => {
      console.log('Joined session:', code);
    });

    socketRef.current.on('signal', ({ from, signal }) => {
      if (!peerRef.current) {
        startPeer(from, signal);
      } else {
        peerRef.current.signal(signal);
      }
    });

    socketRef.current.on('error', (msg: string) => {
      setError(msg);
      setStatus('error');
    });

    socketRef.current.on('session-ended', () => {
      setStatus('ended');
    });

    socketRef.current.on('session-expired', () => {
      setError('Session has expired');
      setStatus('error');
    });

    return () => {
      peerRef.current?.destroy();
      socketRef.current?.disconnect();
    };
  }, [code]);

  const startPeer = (hostId: string, initialSignal: any) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('signal', { to: hostId, signal });
    });

    peer.on('stream', (stream) => {
      console.log('Received stream');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('connected');
    });

    peer.on('connect', () => {
      console.log('P2P Connected');
    });

    peer.on('close', () => {
      setStatus('ended');
    });

    peer.signal(initialSignal);
    peerRef.current = peer;
  };

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEvent = (e: React.MouseEvent | React.WheelEvent) => {
    if (status !== 'connected' || !peerRef.current || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Update local cursor for visual feedback
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Only send if within bounds
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      const event = {
        type: e.type,
        x,
        y,
        button: (e as React.MouseEvent).button,
      };
      
      try {
        peerRef.current.send(JSON.stringify(event));
      } catch (err) {
        console.error('Error sending remote event:', err);
      }
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-orange-500 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Connecting to Session</h2>
          <p className="text-zinc-500">Establishing secure P2P connection...</p>
        </div>
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>
      </div>
    );
  }

  if (status === 'error' || status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border ${
          status === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
        }`}>
          {status === 'error' ? <AlertCircle className="w-10 h-10" /> : <Loader2 className="w-10 h-10" />}
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{status === 'error' ? 'Connection Failed' : 'Session Ended'}</h2>
          <p className="text-zinc-500">{error || 'The host has ended the session or disconnected.'}</p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold transition-all"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold text-xl flex items-center gap-2">
              Live Session: <span className="text-orange-500 font-mono">{code}</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Connected to Host
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-bold text-zinc-400">
            <MousePointer2 className="w-3 h-3" />
            Control Active
          </div>
          <button 
            onClick={toggleFullScreen}
            className="p-2 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl cursor-none group"
        onMouseMove={handleMouseEvent}
        onMouseDown={handleMouseEvent}
        onMouseLeave={() => setCursorPos(null)}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Custom Cursor */}
        {cursorPos && (
          <div 
            className="absolute pointer-events-none z-50"
            style={{ 
              left: cursorPos.x, 
              top: cursorPos.y,
              transform: 'translate(-50%, -50%)' 
            }}
          >
            <MousePointer2 className="w-6 h-6 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] fill-orange-500" />
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-medium">
            Move mouse to point • Click to highlight
          </div>
          <div className="flex gap-2">
            <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10">
              <Keyboard className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
