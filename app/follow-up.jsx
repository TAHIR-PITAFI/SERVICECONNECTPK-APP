import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FollowUpScreen() {
  const router = useRouter();

  const steps = [
    { title: "Booking Confirmed", status: "completed", time: "10:00 AM" },
    { title: "Provider Dispatched", status: "completed", time: "01:30 PM" },
    { title: "Work in Progress", status: "current", time: "Now" },
    { title: "Quality Check", status: "pending", time: "Pending" },
    { title: "Feedback & Rating", status: "pending", time: "Pending" }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Service Tracking</Text>
      </View>

      <View style={styles.reminderBanner}>
        <Ionicons name="notifications" size={24} color="#fff" />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Service Reminder</Text>
          <Text style={styles.bannerSub}>Your provider will arrive in approx. 15 mins.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Status Timeline</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.indicatorCol}>
                <View style={[
                  styles.dot, 
                  step.status === 'completed' && styles.dotCompleted,
                  step.status === 'current' && styles.dotCurrent
                ]}>
                  {step.status === 'completed' && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                {i < steps.length - 1 && <View style={[styles.line, step.status === 'completed' && styles.lineCompleted]} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, step.status === 'pending' && styles.textPending]}>{step.title}</Text>
                <Text style={styles.stepTime}>{step.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Share your feedback</Text>
          <Text style={styles.sectionSub}>Rate Ahmed Plumber's service quality.</Text>
          <View style={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} style={styles.starBtn}>
                <Ionicons name="star-outline" size={32} color="#f59e0b" />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  reminderBanner: { backgroundColor: '#2563eb', margin: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  bannerText: { marginLeft: 12 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  scroll: { flex: 1, padding: 16 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 24, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  stepRow: { flexDirection: 'row', minHeight: 60 },
  indicatorCol: { alignItems: 'center', width: 30, marginRight: 16 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  dotCompleted: { backgroundColor: '#22c55e' },
  dotCurrent: { backgroundColor: '#2563eb', borderWidth: 4, borderColor: '#bfdbfe' },
  line: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: -2, marginBottom: -2 },
  lineCompleted: { backgroundColor: '#22c55e' },
  stepContent: { flex: 1, paddingBottom: 20 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  textPending: { color: '#94a3b8' },
  stepTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  feedbackSection: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  sectionSub: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  starBtn: { padding: 4 },
  submitBtn: { width: '100%', backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#64748b', fontWeight: '800' }
});
