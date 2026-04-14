import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { Copy, Check, Power, MousePointer2, Keyboard, MonitorOff, Users, Shield } from 'lucide-react';

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

  const statusMap = {
    idle: 'خامل',
    creating: 'جاري الإنشاء...',
    waiting: 'في انتظار المنضم...',
    connected: 'متصل الآن'
  };

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
    <div className="space-y-10" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between bg-zinc-900/50 p-8 rounded-2xl border border-gold/20 gap-6">
        <div className="flex items-center gap-10">
          <div className="space-y-2 text-right">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">حالة الجلسة</h2>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-pulse' : 
                status === 'waiting' ? 'bg-gold animate-pulse' : 
                'bg-zinc-700'
              }`} />
              <span className="font-bold text-lg">{statusMap[status]}</span>
            </div>
          </div>

          {sessionCode && (
            <div className="space-y-2 text-right">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">رمز الدخول الملكي</h2>
              <div className="flex items-center gap-3">
                <code className="bg-zinc-800 px-4 py-2 rounded-lg font-mono text-2xl text-gold font-black tracking-[0.2em]">
                  {sessionCode}
                </code>
                <button 
                  onClick={copyCode}
                  className="p-3 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-gold border border-gold/10"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {status !== 'idle' && (
            <button
              onClick={() => setAllowControl(!allowControl)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all font-bold ${
                allowControl 
                  ? 'bg-gold/10 border-gold/50 text-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {allowControl ? <MousePointer2 className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
              <span className="text-sm">{allowControl ? 'التحكم مفعل' : 'التحكم محظور'}</span>
            </button>
          )}
          <button
            onClick={status === 'idle' ? startSession : stopSession}
            disabled={status === 'creating'}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl font-black transition-all text-lg ${
              status === 'idle' 
                ? 'gold-gradient text-black hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.3)]' 
                : 'bg-red-500/10 border-2 border-red-500/50 text-red-500 hover:bg-red-500/20'
            }`}
          >
            <Power className="w-5 h-5" />
            {status === 'idle' ? 'ابدأ البث' : 'إنهاء الجلسة'}
          </button>
        </div>
      </div>

      <div className="relative aspect-video bg-zinc-950 rounded-[2rem] overflow-hidden border-2 border-gold/20 shadow-2xl group">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-6">
            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-gold/10">
              <MonitorOff className="w-12 h-12 text-gold/20" />
            </div>
            <p className="text-xl font-bold tracking-wide">لا يوجد بث نشط حالياً</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mb-8 border border-gold/30">
              <Users className="w-10 h-10 text-gold animate-bounce" />
            </div>
            <h3 className="text-3xl font-display font-bold mb-4 gold-text-gradient">في انتظار المنضم</h3>
            <p className="text-zinc-400 max-w-sm text-lg leading-relaxed">شارك الرمز الملكي أعلاه مع شريكك لبدء الجلسة التعاونية.</p>
          </div>
        )}

        {/* Worker Cursor Overlay */}
        {workerCursor && allowControl && (
          <div 
            className="absolute pointer-events-none transition-all duration-75 ease-out z-50"
            style={{ 
              left: `${workerCursor.x * 100}%`, 
              top: `${workerCursor.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <MousePointer2 className="w-8 h-8 text-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] fill-gold" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-gold text-black text-[10px] font-black rounded-full whitespace-nowrap border border-black/20">
                المساعد الملكي
              </div>
            </div>
          </div>
        )}

        {/* Click Feedback */}
        {workerClick && (
          <div 
            className="absolute pointer-events-none w-16 h-16 border-4 border-gold rounded-full animate-ping z-40"
            style={{ 
              left: `${workerClick.x * 100}%`, 
              top: `${workerClick.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-zinc-900/30 p-8 rounded-3xl border border-gold/10 space-y-4 relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="w-12 h-12 rounded-xl bg-lapis/10 flex items-center justify-center border border-lapis/20">
            <Shield className="w-6 h-6 text-lapis" />
          </div>
          <h3 className="font-bold text-xl">الخصوصية أولاً</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            بثك مشفر تماماً ومن نوع (ند لند). نحن لا نخزن أي بيانات فيديو على خوادمنا. أمانك هو أولويتنا.
          </p>
        </div>
        <div className="bg-zinc-900/30 p-8 rounded-3xl border border-gold/10 space-y-4 relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <MousePointer2 className="w-6 h-6 text-gold" />
          </div>
          <h3 className="font-bold text-xl">تحكم عن بعد</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            يمكن للمساعدين الإشارة والنقر لإرشادك. يمكنك سحب صلاحيات التحكم فوراً في أي وقت بضغطة واحدة.
          </p>
        </div>
        <div className="bg-zinc-900/30 p-8 rounded-3xl border border-gold/10 space-y-4 relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <Keyboard className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="font-bold text-xl">تركيز على المهام</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            محسن لسير العمل المعتمد على المتصفح. مثالي للتدريب، الدعم الفني، أو المراجعات التعاونية السريعة.
          </p>
        </div>
      </div>
    </div>
  );
}
