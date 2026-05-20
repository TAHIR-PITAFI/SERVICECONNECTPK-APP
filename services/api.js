/**
 * API service layer — use this in place of direct orchestrator calls
 * when you want to hit the real Express API instead of local agents.
 *
 * Toggle USE_API_BACKEND = true to switch from local to server mode.
 */

const USE_API_BACKEND = false; // Set to true + set API_BASE to use real backend
const API_BASE = 'http://localhost:3000'; // Change to your deployed URL

export async function parseIntent(text) {
  if (!USE_API_BACKEND) return null; // Falls back to local intentAgent.js
  const res = await fetch(`${API_BASE}/api/parse-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function getProviders(service, location, limit = 5) {
  if (!USE_API_BACKEND) return null;
  const params = new URLSearchParams({ service, location, limit });
  const res = await fetch(`${API_BASE}/api/providers?${params}`);
  return res.json();
}

export async function createBooking(providerId, sessionId, slot) {
  if (!USE_API_BACKEND) return null;
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, sessionId, slot }),
  });
  return res.json();
}

export async function getBooking(bookingId) {
  if (!USE_API_BACKEND) return null;
  const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`);
  return res.json();
}

export async function getTrace(sessionId) {
  if (!USE_API_BACKEND) return null;
  const res = await fetch(`${API_BASE}/api/trace/${sessionId}`);
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
