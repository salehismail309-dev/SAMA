import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { nanoid } from 'nanoid';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Session storage (In-memory for MVP)
  // sessionCode -> { hostSocketId, createdAt }
  const sessions = new Map<string, { hostSocketId: string; createdAt: number }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host creates a session
    socket.on('create-session', () => {
      const sessionCode = nanoid(6).toUpperCase();
      sessions.set(sessionCode, {
        hostSocketId: socket.id,
        createdAt: Date.now()
      });
      socket.join(sessionCode);
      socket.emit('session-created', sessionCode);
      console.log(`Session created: ${sessionCode} by ${socket.id}`);
    });

    // Worker joins a session
    socket.on('join-session', (sessionCode: string) => {
      const session = sessions.get(sessionCode.toUpperCase());
      if (session) {
        socket.join(sessionCode.toUpperCase());
        socket.emit('session-joined', sessionCode.toUpperCase());
        // Notify host that someone joined
        io.to(session.hostSocketId).emit('worker-joined', socket.id);
        console.log(`Worker ${socket.id} joined session ${sessionCode}`);
      } else {
        socket.emit('error', 'Invalid or expired session code');
      }
    });

    // WebRTC Signaling
    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Remote Control Events (if using Socket.io fallback, but we prefer WebRTC Data Channel)
    socket.on('remote-event', ({ sessionCode, event }) => {
      const session = sessions.get(sessionCode.toUpperCase());
      if (session) {
        io.to(session.hostSocketId).emit('remote-event', event);
      }
    });

    socket.on('disconnect', () => {
      // Clean up sessions where this socket was the host
      for (const [code, session] of sessions.entries()) {
        if (session.hostSocketId === socket.id) {
          sessions.delete(code);
          io.to(code).emit('session-ended');
          console.log(`Session ${code} ended because host disconnected`);
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  // Cleanup expired sessions every minute
  setInterval(() => {
    const now = Date.now();
    const EXPIRY = 10 * 60 * 1000; // 10 minutes
    for (const [code, session] of sessions.entries()) {
      if (now - session.createdAt > EXPIRY) {
        sessions.delete(code);
        io.to(code).emit('session-expired');
        console.log(`Session ${code} expired`);
      }
    }
  }, 60000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
