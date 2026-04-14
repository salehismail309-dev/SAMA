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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-orange-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 border-bottom border-zinc-800/50 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <Monitor className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">RemoteLink</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>E2EE Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>Low Latency</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]"
            >
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-6xl font-bold tracking-tight leading-[1.1]">
                    Collaborate on <br />
                    <span className="text-orange-500">Any Browser Tab</span>
                  </h1>
                  <p className="text-xl text-zinc-400 max-w-md leading-relaxed">
                    Share your session securely with a single code. Low-latency streaming and remote control for seamless task collaboration.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setView('host')}
                    className="group relative px-8 py-4 bg-orange-500 text-black font-bold rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Start Session
                  </button>
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Enter Session Code"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="w-full px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500/50 transition-colors font-mono tracking-widest uppercase"
                    />
                    <button
                      onClick={() => view === 'landing' && sessionCode.length >= 6 && setView('worker')}
                      disabled={sessionCode.length < 6}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                    >
                      <LogIn className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-zinc-800/50">
                  <div>
                    <div className="text-2xl font-bold">0ms</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Local Lag</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4K</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Max Res</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">P2P Secure</div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-3xl blur-3xl" />
                <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 h-6 bg-zinc-800 rounded-md mx-4" />
                  </div>
                  <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800">
                    <div className="text-center space-y-2 opacity-20">
                      <Users className="w-12 h-12 mx-auto" />
                      <p className="text-sm font-medium">Waiting for connection...</p>
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

      <footer className="fixed bottom-0 left-0 right-0 py-6 px-6 text-center text-zinc-500 text-sm pointer-events-none">
        <p>© 2026 RemoteLink • Built for Collaboration</p>
      </footer>
    </div>
  );
}

