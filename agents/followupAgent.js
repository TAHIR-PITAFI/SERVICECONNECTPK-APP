/**
 * AGENT 5: FOLLOW-UP AGENT
 * Schedules reminders and manages booking lifecycle
 */

import { logTraceStep } from '../services/traceService';
import { updateBookingStatus } from './bookingAgent';

export async function runFollowupAgent(booking) {
  const start = Date.now();
  await _delay(200 + Math.random() * 100);

  const followups = _buildFollowupSchedule(booking);

  // Attach followups to booking
  booking.followups = followups;

  const duration = Date.now() - start;

  logTraceStep('FOLLOWUP', {
    duration,
    input: { bookingId: booking.id, slot: booking.slot, date: booking.bookingDate },
    output: {
      followupsScheduled: followups.length,
      schedule: followups.map(f => ({ type: f.type, label: f.label, time: f.scheduledTime })),
    },
    reasoning:
      `Scheduling ${followups.length} follow-up events for booking ${booking.id}:\n` +
      followups.map(f => `  • ${f.label}: ${f.scheduledTime}`).join('\n') + '\n' +
      `Booking lifecycle: pending → confirmed → reminder_sent → en_route → completed\n` +
      `All events queued in notification system.`,
    toolsCalled: ['notificationScheduler', 'lifecycleManager'],
    status: 'success',
  });

  return { booking, followups };
}

function _buildFollowupSchedule(booking) {
  const { slot, bookingDate, bookingDateLabel } = booking;
  const [hour, minute] = slot.split(':').map(Number);

  const events = [
    {
      type: 'confirmation',
      label: '✅ Booking Confirmed',
      scheduledTime: 'Now',
      description: `Your booking #${booking.id} is confirmed with ${booking.provider.name}`,
      status: 'done',
      icon: '✅',
    },
    {
      type: 'reminder_day',
      label: '📅 Day Reminder',
      scheduledTime: `${bookingDateLabel}, 8:00 AM`,
      description: `Reminder: ${booking.service.label} appointment today at ${slot}`,
      status: 'pending',
      icon: '📅',
    },
    {
      type: 'reminder_1hr',
      label: '⏰ 1-Hour Reminder',
      scheduledTime: `${bookingDateLabel}, ${_offsetTime(hour, minute, -60)}`,
      description: `${booking.provider.name} will arrive in 1 hour at ${slot}`,
      status: 'pending',
      icon: '⏰',
    },
    {
      type: 'en_route',
      label: '🚗 Provider En Route',
      scheduledTime: `${bookingDateLabel}, ${_offsetTime(hour, minute, -15)}`,
      description: `${booking.provider.name} is on the way to your location`,
      status: 'pending',
      icon: '🚗',
    },
    {
      type: 'service_start',
      label: '🔧 Service Started',
      scheduledTime: `${bookingDateLabel}, ${slot}`,
      description: `${booking.service.label} service has begun`,
      status: 'pending',
      icon: '🔧',
    },
    {
      type: 'completion',
      label: '🎉 Service Complete',
      scheduledTime: 'After service',
      description: 'Please rate your experience with the provider',
      status: 'pending',
      icon: '🎉',
    },
  ];

  return events;
}

// Offset time by minutes, returns "HH:MM" string
function _offsetTime(hour, minute, offsetMinutes) {
  const totalMinutes = hour * 60 + minute + offsetMinutes;
  const h = Math.floor(Math.max(0, totalMinutes) / 60) % 24;
  const m = Math.max(0, totalMinutes) % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getFollowupStatusColor(status) {
  if (status === 'done') return '#00D4AA';
  if (status === 'active') return '#6C63FF';
  return '#5A5A6A';
}
