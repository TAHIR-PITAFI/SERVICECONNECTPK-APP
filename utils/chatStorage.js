import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sc_chat_sessions';
const MAX_SESSIONS = 15;

/**
 * Save a completed chat session
 * @param {Array} messages - array of { id, text, sender } objects
 */
export async function saveChatSession(messages) {
  try {
    if (!messages || messages.length <= 1) return; // skip greeting-only sessions
    const sessions = await loadChatSessions();
    const session = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      preview: messages.find(m => m.sender === 'user')?.text || 'Chat session',
      messages,
    };
    const updated = [session, ...sessions].slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('chatStorage.saveChatSession error:', e);
  }
}

/**
 * Load all saved chat sessions
 * @returns {Array} sessions array
 */
export async function loadChatSessions() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all chat sessions
 */
export async function clearChatSessions() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('chatStorage.clearChatSessions error:', e);
  }
}

/**
 * Format a session timestamp for display
 */
export function formatSessionTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}
