/**
 * ServiceBot API — Express server
 * Run: node server.js  (port 3000)
 */
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory store ──────────────────────────────────────────────────────────
const bookings = new Map();
const sessions = new Map();

// ─── Mock providers (same as app data) ───────────────────────────────────────
const PROVIDERS = [
  { id:'p1', name:'Ali AC Services', service:'ac', sector:'G-11', rating:4.8, reviews:127, distanceKm:1.2, priceMin:800, priceMax:1500, available:true, experience:8 },
  { id:'p2', name:'Cool Tech AC', service:'ac', sector:'G-9', rating:4.5, reviews:89, distanceKm:2.1, priceMin:1000, priceMax:2000, available:true, experience:5 },
  { id:'p5', name:'Master Plumbers', service:'plumber', sector:'F-7', rating:4.7, reviews:145, distanceKm:1.8, priceMin:500, priceMax:1200, available:true, experience:12 },
  { id:'p8', name:'PipeXpert', service:'plumber', sector:'G-11', rating:4.9, reviews:312, distanceKm:1.5, priceMin:550, priceMax:1300, available:true, experience:15 },
  { id:'p9', name:'Volt Masters', service:'electrician', sector:'F-8', rating:4.6, reviews:167, distanceKm:2.3, priceMin:600, priceMax:1500, available:true, experience:9 },
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Parse intent from natural language
app.post('/api/parse-intent', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  // Basic service extraction
  const serviceMap = {
    ac: ['ac', 'air condition', 'cooling'],
    plumber: ['plumber', 'pipe', 'nalka', 'pani'],
    electrician: ['electrician', 'bijli', 'electric'],
    tutor: ['tutor', 'teacher', 'ustaz'],
    beautician: ['salon', 'beauty', 'parlour'],
    cleaning: ['clean', 'safai'],
  };

  let service = null;
  const lower = text.toLowerCase();
  for (const [svc, keywords] of Object.entries(serviceMap)) {
    if (keywords.some(k => lower.includes(k))) { service = svc; break; }
  }

  const locationMatch = text.match(/\b([FGHI]-\d{1,2})\b/i);
  const location = locationMatch ? locationMatch[0].toUpperCase() : 'Islamabad';
  const isUrgent = /abhi|now|emergency|urgent/i.test(text);
  const tomorrow = /kal|tomorrow/i.test(text);

  const sessionId = uuidv4();
  const intent = { service, location, time: isUrgent ? 'urgent' : tomorrow ? 'tomorrow' : 'today', rawText: text };
  sessions.set(sessionId, { intent, createdAt: Date.now() });

  res.json({ sessionId, intent, confidence: service ? 85 : 20 });
});

// Get providers by service + location
app.get('/api/providers', (req, res) => {
  const { service, location, limit = 5 } = req.query;
  let results = PROVIDERS;

  if (service) results = results.filter(p => p.service === service);

  // Score and rank
  const scored = results.map(p => ({
    ...p,
    score: (p.rating * 20) + Math.max(0, 25 - p.distanceKm * 4) + (p.available ? 20 : 0),
  })).sort((a, b) => b.score - a.score).slice(0, Number(limit));

  res.json({ providers: scored, count: scored.length });
});

// Create booking
app.post('/api/bookings', (req, res) => {
  const { providerId, sessionId, slot } = req.body;
  if (!providerId) return res.status(400).json({ error: 'providerId is required' });

  const provider = PROVIDERS.find(p => p.id === providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  if (!provider.available) return res.status(409).json({ error: 'Provider not available' });

  const session = sessions.get(sessionId);
  const bookingId = 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const booking = {
    id: bookingId,
    providerId,
    provider,
    service: provider.service,
    location: session?.intent?.location || 'Islamabad',
    slot: slot || 'Today, flexible',
    status: 'confirmed',
    estimatedCost: `Rs ${provider.priceMin}–${provider.priceMax}`,
    createdAt: new Date().toISOString(),
    followUps: [
      { id: 'r1', scheduledFor: '1 hour before', message: `Reminder: ${provider.name} arriving soon`, channel: 'push' },
      { id: 'r2', scheduledFor: '30 min before', message: `${provider.name} is on the way`, channel: 'sms' },
      { id: 'r3', scheduledFor: 'After service', message: `Rate your experience with ${provider.name}`, channel: 'in_app' },
    ],
  };

  bookings.set(bookingId, booking);

  res.status(201).json({ booking, message: 'Booking confirmed successfully' });
});

// Get booking by ID
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking });
});

// Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
  if (!bookings.has(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
  const booking = bookings.get(req.params.id);
  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  res.json({ message: 'Booking cancelled', booking });
});

// Get agent trace for a session
app.get('/api/trace/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session, traceAvailable: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 ServiceBot API running at http://localhost:${PORT}`);
  console.log('Routes:');
  console.log('  GET  /health');
  console.log('  POST /api/parse-intent');
  console.log('  GET  /api/providers?service=ac&location=G-11');
  console.log('  POST /api/bookings');
  console.log('  GET  /api/bookings/:id');
  console.log('  DELETE /api/bookings/:id');
  console.log('  GET  /api/trace/:sessionId\n');
});

module.exports = app;
