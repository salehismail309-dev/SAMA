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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

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
      setError('انتهت صلاحية الجلسة');
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8" dir="rtl">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-gold/10 border-t-gold rounded-full animate-spin" />
          <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-gold animate-pulse" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-display font-bold gold-text-gradient">جاري الاتصال بالجلسة</h2>
          <p className="text-zinc-500 text-lg">نقوم بإنشاء اتصال ملكي آمن...</p>
        </div>
        <button onClick={onBack} className="text-zinc-400 hover:text-gold transition-colors flex items-center gap-3 font-bold">
          <ArrowLeft className="w-5 h-5 rotate-180" />
          إلغاء الطلب
        </button>
      </div>
    );
  }

  if (status === 'error' || status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8" dir="rtl">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 ${
          status === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-zinc-900 border-gold/20 text-gold/30'
        }`}>
          {status === 'error' ? <AlertCircle className="w-12 h-12" /> : <Loader2 className="w-12 h-12" />}
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-display font-bold">{status === 'error' ? 'فشل الاتصال' : 'انتهت الجلسة'}</h2>
          <p className="text-zinc-500 text-lg">{error || 'لقد قام المضيف بإنهاء الجلسة أو انقطع الاتصال.'}</p>
        </div>
        <button 
          onClick={onBack}
          className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 border-2 border-gold/20 rounded-2xl font-black transition-all hover:border-gold/50 text-lg"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-zinc-900 rounded-xl transition-all border border-gold/10 hover:border-gold/30">
            <ArrowLeft className="w-7 h-7 rotate-180" />
          </button>
          <div>
            <h2 className="font-display font-bold text-2xl flex items-center gap-3">
              جلسة مباشرة: <span className="gold-text-gradient font-mono tracking-widest">{code}</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              متصل بالمضيف الملكي
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-gold/10 rounded-xl border border-gold/30 text-xs font-black text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <MousePointer2 className="w-4 h-4" />
            التحكم نشط
          </div>
          <button 
            onClick={toggleFullScreen}
            className="p-3 hover:bg-zinc-900 rounded-xl transition-all text-zinc-400 hover:text-gold border border-gold/10"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative aspect-video bg-black rounded-[2.5rem] overflow-hidden border-2 border-gold/30 shadow-2xl cursor-none group"
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
            <MousePointer2 className="w-8 h-8 text-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] fill-gold" />
          </div>
        )}

        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-gold/20 text-sm font-bold text-gold">
            حرك الماوس للإشارة • انقر للتحديد
          </div>
          <div className="flex gap-3">
            <div className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-gold/20">
              <Keyboard className="w-5 h-5 text-gold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
