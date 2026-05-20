import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { traceService } from '../../services/traceService';
import { Theme } from '../../utils/Theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const AGENT_COLORS = {
  'Intent Agent':        '#8b5cf6',
  'Discovery Agent':     '#3b82f6',
  'Ranking Agent':       '#10b981',
  'Pricing Agent':       '#f59e0b',
  'Booking Agent':       '#ef4444',
  'Dispatch Agent':      '#06b6d4',
  'Navigation Agent':    '#ec4899',
  'Scheduling Agent':    '#eab308',
  'Communication Agent': '#0d9488',
  'Follow-Up Agent':     '#14b8a6',
  'Dispute Agent':       '#6366f1',
  'Auth System':         '#1a56db',
};

function AgentCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const color = AGENT_COLORS[log.agent] || '#64748b';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };

  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={[styles.agentDot, { backgroundColor: color + '22' }]}>
          <Ionicons name="hardware-chip-outline" size={18} color={color} />
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={[styles.agentName, { color }]}>{log.agent.toUpperCase()}</Text>
          <Text style={styles.timestamp}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.logSectionLabel}>INPUT</Text>
          <Text style={styles.codeText}>{typeof log.input === 'string' ? log.input : JSON.stringify(log.input, null, 2)}</Text>
          <Text style={[styles.logSectionLabel, { marginTop: 12 }]}>REASONING</Text>
          <View style={[styles.reasonBox, { borderLeftColor: color }]}>
            <Text style={styles.reasonText}>{log.reasoning}</Text>
          </View>
          <Text style={[styles.logSectionLabel, { marginTop: 12, color: '#10b981' }]}>OUTPUT</Text>
          <Text style={styles.codeText}>{JSON.stringify(log.output, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}

export default function TraceScreen() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (traceService?.subscribe) {
      return traceService.subscribe(setLogs);
    }
  }, []);

  const agentCounts = Object.keys(AGENT_COLORS).reduce((acc, name) => {
    acc[name] = logs.filter(l => l.agent === name).length;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient colors={Theme.colors.gradientDark} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Agent Trace</Text>
            <Text style={styles.headerSub}>Autonomous Pipeline Monitor</Text>
          </View>
          <TouchableOpacity style={styles.clearBtn} onPress={() => traceService.clearLogs()} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{logs.length}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>12</Text>
            <Text style={styles.statLabel}>Agents</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#34d399' }]}>● Live</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
        {/* Agent legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {Object.entries(AGENT_COLORS).map(([name, color]) => (
            <View key={name} style={[styles.legendChip, { borderColor: color + '55', backgroundColor: color + '22' }]}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color }]}>{name.replace(' Agent', '')} ({agentCounts[name]})</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="terminal-outline" size={44} color={Theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyText}>Go to the Book tab and make a service request to see the AI agents reasoning in real-time.</Text>
          </View>
        ) : (
          logs.map((log, i) => <AgentCard key={i} log={log} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Theme.colors.background },
  header:         { paddingHorizontal: 20, paddingVertical: 18, paddingTop: 20, gap: 16 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:    { fontSize: Theme.typography.xl, fontWeight: '900', color: '#fff' },
  headerSub:      { fontSize: Theme.typography.xs, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  clearBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center' },
  statsRow:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 12 },
  stat:           { flex: 1, alignItems: 'center' },
  statVal:        { fontSize: Theme.typography.lg, fontWeight: '900', color: '#fff' },
  statLabel:      { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: 2 },
  legendChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  legendDot:      { width: 6, height: 6, borderRadius: 3 },
  legendText:     { fontSize: 10, fontWeight: '700' },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 14, paddingBottom: 32, gap: 10 },
  card:           { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Theme.shadows.soft },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  agentDot:       { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeaderInfo: { flex: 1 },
  agentName:      { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  timestamp:      { fontSize: 10, color: Theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
  cardBody:       { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Theme.colors.borderLight },
  logSectionLabel:{ fontSize: 9, fontWeight: '900', color: Theme.colors.textMuted, letterSpacing: 1, marginBottom: 6, marginTop: 2, textTransform: 'uppercase' },
  codeText:       { fontSize: 11, color: '#334155', backgroundColor: Theme.colors.backgroundAlt, padding: 10, borderRadius: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 16 },
  reasonBox:      { backgroundColor: '#fff', padding: 10, borderRadius: 10, borderLeftWidth: 3, ...Theme.shadows.soft },
  reasonText:     { fontSize: 13, color: Theme.colors.textPrimary, fontStyle: 'italic', lineHeight: 19 },
  empty:          { alignItems: 'center', marginTop: 80, padding: 40 },
  emptyIcon:      { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 18, ...Theme.shadows.soft },
  emptyTitle:     { fontSize: Theme.typography.xl, fontWeight: '900', color: Theme.colors.textPrimary },
  emptyText:      { textAlign: 'center', color: Theme.colors.textSecondary, marginTop: 10, lineHeight: 20, fontSize: Theme.typography.sm },
});
