/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Monitor, Users, Play, LogIn, Shield, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HostView from './components/HostView';
import WorkerView from './components/WorkerView';

type ViewState = 'landing' | 'host' | 'worker';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [sessionCode, setSessionCode] = useState('');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-gold/30" dir="rtl">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-lapis/10 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 border-b border-gold/20 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Monitor className="w-6 h-6 text-black" />
            </div>
            <span className="font-display font-black text-3xl tracking-wider gold-text-gradient">SMIA</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-zinc-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" />
              <span>تشفير ملكي</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold" />
              <span>سرعة البرق</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-2 gap-16 items-center min-h-[60vh]"
            >
              <div className="space-y-10">
                <div className="space-y-6">
                  <h1 className="text-7xl font-display font-bold tracking-tight leading-[1.1]">
                    تعاون في <br />
                    <span className="gold-text-gradient">أي جلسة متصفح</span>
                  </h1>
                  <p className="text-xl text-zinc-400 max-w-md leading-relaxed">
                    شارك جلستك بأمان تام باستخدام رمز فريد. بث منخفض التأخير وتحكم عن بعد لتعاون سلس في المهام.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <button
                    onClick={() => setView('host')}
                    className="group relative px-10 py-5 gold-gradient text-black font-black rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] flex items-center justify-center gap-3 text-lg"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    ابدأ جلسة جديدة
                  </button>
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="أدخل رمز الجلسة"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="w-full px-8 py-5 bg-zinc-900/50 border border-gold/30 rounded-xl focus:outline-none focus:border-gold transition-colors font-mono tracking-widest uppercase text-center text-lg"
                    />
                    <button
                      onClick={() => view === 'landing' && sessionCode.length >= 6 && setView('worker')}
                      disabled={sessionCode.length < 6}
                      className="absolute left-2 top-2 bottom-2 px-5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center border border-gold/20"
                    >
                      <LogIn className="w-6 h-6 text-gold" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-10 pt-10 border-t border-gold/20">
                  <div>
                    <div className="text-3xl font-display font-bold gold-text-gradient">0ms</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">تأخير محلي</div>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold gold-text-gradient">4K</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">أقصى دقة</div>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold gold-text-gradient">100%</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">أمان مطلق</div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-gold/20 to-transparent rounded-3xl blur-3xl" />
                <div className="relative bg-zinc-900 border-2 border-gold/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 h-7 bg-zinc-800 rounded-md mx-4 border border-gold/10" />
                  </div>
                  <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center border border-gold/20">
                    <div className="text-center space-y-4 opacity-30">
                      <Users className="w-16 h-16 mx-auto text-gold" />
                      <p className="text-lg font-bold tracking-wide">في انتظار الاتصال...</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'host' && (
            <motion.div
              key="host"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <HostView onBack={() => setView('landing')} />
            </motion.div>
          )}

          {view === 'worker' && (
            <motion.div
              key="worker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <WorkerView code={sessionCode} onBack={() => setView('landing')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-8 px-6 text-center text-zinc-500 text-sm pointer-events-none">
        <p className="font-display tracking-widest">© 2026 SMIA • بني للتعاون الملكي</p>
      </footer>
    </div>
  );
}


