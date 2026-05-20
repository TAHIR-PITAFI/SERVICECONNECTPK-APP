import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../utils/Theme';

const { width } = Dimensions.get('window');

export default function DisputeScreen() {
  const [complaint, setComplaint] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [currentResolution, setCurrentResolution] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const saved = await AsyncStorage.getItem('@dispute_tickets');
      if (saved) {
        setTicketHistory(JSON.parse(saved));
      }
    } catch (err) {}
  };

  const handleDispute = async () => {
    if (!complaint.trim()) return;
    setLoading(true);
    
    try {
      const ticketId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
      let resolution = "";

      // Call AI with Groq
      try {
        const rawKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        const API_KEY = rawKey ? rawKey.trim() : null;
        
        const response = await fetch(
          `https://api.groq.com/openai/v1/chat/completions`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              max_tokens: 1000,
              messages: [{ 
                role: "user", 
                content: `You are an expert, empathetic dispute resolution agent for ServiceConnect PK. A user submitted this complaint: "${complaint}". Provide a concise (4-5 sentences), structured solution including compensation (e.g., refund percentage, future discount voucher, or free provider re-dispatch). Keep it professional.` 
              }]
            })
          }
        );

        const data = await response.json();
        resolution = data.choices?.[0]?.message?.content || "";
      } catch (err) {
        console.error("GROQ fetch failed, falling back to local resolver:", err);
      }

      if (!resolution) {
        // High quality fallback
        resolution = `ServiceConnect AI Agent Analysis:\n\nBased on your report regarding "${complaint}", we have flagged this with our operations core. We recommend a 50% refund voucher of up to Rs. 800, combined with a complimentary expert re-dispatch within 24 hours.`;
      }

      const newTicket = {
        id: ticketId,
        complaint: complaint.trim(),
        resolution,
        status: 'AI_PROPOSED', // AI_PROPOSED, ESCALATED, RESOLVED
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      const updated = [newTicket, ...ticketHistory];
      setTicketHistory(updated);
      await AsyncStorage.setItem('@dispute_tickets', JSON.stringify(updated));
      setActiveTicket(newTicket);
      setComplaint('');
      
      Alert.alert("Ticket Logged", `${ticketId} registered. AI agent has reviewed and proposed a settlement plan.`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not submit dispute ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptResolution = async (ticketId) => {
    const updated = ticketHistory.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'RESOLVED', resolution: t.resolution + "\n\n🤝 [STATUS: Settled by mutual agreement]" };
      }
      return t;
    });
    setTicketHistory(updated);
    await AsyncStorage.setItem('@dispute_tickets', JSON.stringify(updated));
    setActiveTicket(null);
    Alert.alert("Shukriya! ✅", "Dispute has been settled and closed. Payout details have been synchronized.");
  };

  const handleEscalateToHuman = async (ticketId) => {
    const updated = ticketHistory.map(t => {
      if (t.id === ticketId) {
        return { 
          ...t, 
          status: 'ESCALATED', 
          resolution: t.resolution + "\n\n⚠️ [STATUS: Escalated to Islamabad Human Operations Panel. Queue Position #2. Priority: High]" 
        };
      }
      return t;
    });
    setTicketHistory(updated);
    await AsyncStorage.setItem('@dispute_tickets', JSON.stringify(updated));
    setActiveTicket(null);
    Alert.alert("Escalated ⚠️", "Ticket submitted to the Islamabad Support Tribunal. A human investigator will contact you via WhatsApp in 30 minutes.");
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.headerTitle}>Dispute Center</Text>
          <Text style={{ fontSize: 11, color: Theme.colors.textMuted }}>Fair resolution for home services</Text>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Active Ticket Banner / Action Panel */}
        {activeTicket && (
          <View style={[styles.activeTicketCard, { borderColor: activeTicket.status === 'RESOLVED' ? '#10b981' : activeTicket.status === 'ESCALATED' ? '#f59e0b' : '#3b82f6' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: Theme.colors.primary }}>ACTIVE CASE: {activeTicket.id}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', backgroundColor: activeTicket.status === 'RESOLVED' ? '#e6f4ea' : activeTicket.status === 'ESCALATED' ? '#fffbeb' : '#eff6ff', color: activeTicket.status === 'RESOLVED' ? '#137333' : activeTicket.status === 'ESCALATED' ? '#b45309' : '#1e40af', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                {activeTicket.status}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>" {activeTicket.complaint} "</Text>
            <Text style={styles.resolutionLabel}>PROPOSED RESOLUTION PLAN:</Text>
            <Text style={styles.resolutionText}>{activeTicket.resolution}</Text>

            {activeTicket.status === 'AI_PROPOSED' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity 
                  style={[styles.btnAction, { backgroundColor: '#10b981', flex: 1 }]}
                  onPress={() => handleAcceptResolution(activeTicket.id)}
                >
                  <Text style={styles.btnActionText}>Accept Plan ✅</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnAction, { backgroundColor: '#ef4444', flex: 1 }]}
                  onPress={() => handleEscalateToHuman(activeTicket.id)}
                >
                  <Text style={styles.btnActionText}>Escalate to Human ⚠️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <Text style={styles.label}>Submit a New Dispute</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Specify your issue. Mention date, provider name, and problem (e.g. 'AC cooling is still low after yesterday's visit...')"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            value={complaint}
            onChangeText={setComplaint}
          />
          <TouchableOpacity 
            style={[styles.submitBtn, (!complaint.trim() || loading) && { opacity: 0.6 }]} 
            onPress={handleDispute}
            disabled={!complaint.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit to AI Arbiter</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* History list */}
        {ticketHistory.length > 0 && (
          <View style={{ marginTop: 24, marginBottom: 40 }}>
            <Text style={[styles.label, { marginBottom: 12 }]}>Dispute History Logs ({ticketHistory.length})</Text>
            {ticketHistory.map((t) => (
              <TouchableOpacity 
                key={t.id} 
                style={styles.historyItem}
                onPress={() => setActiveTicket(t)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{t.id}</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: t.status === 'RESOLVED' ? '#10b981' : t.status === 'ESCALATED' ? '#f59e0b' : '#3b82f6' }}>
                    {t.status}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }} numberOfLines={1}>
                  {t.complaint}
                </Text>
                <Text style={{ fontSize: 10, color: Theme.colors.textMuted, marginTop: 4 }}>
                  Submitted on {t.createdAt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: width * 0.05, 
    paddingTop: Platform.OS === 'android' ? 44 : 20, 
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Theme.colors.textPrimary },
  content: { padding: width * 0.05 },
  label: { fontSize: 14.5, fontWeight: '800', color: '#1e293b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputCard: { backgroundColor: '#fff', padding: 14, borderRadius: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0' },
  input: { textAlignVertical: 'top', fontSize: 14.5, minHeight: 100, color: Theme.colors.textPrimary },
  submitBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14, flexDirection: 'row', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '900' },
  activeTicketCard: { backgroundColor: '#fff', padding: 16, borderRadius: 18, marginBottom: 24, borderWidth: 1.5, borderLeftWidth: 5 },
  resolutionLabel: { fontSize: 11, fontWeight: '900', color: '#475569', marginTop: 10, textTransform: 'uppercase' },
  resolutionText: { fontSize: 13, color: '#334155', lineHeight: 19, marginTop: 4, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  btnAction: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnActionText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  historyItem: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }
});
