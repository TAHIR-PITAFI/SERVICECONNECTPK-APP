import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../utils/Theme';

const { width, height } = Dimensions.get('window');

export default function ModernAlert({
  visible,
  title,
  message,
  type = 'info', // 'success' | 'error' | 'warning' | 'info' | 'question'
  onClose,
  buttons = [],
}) {
  if (!visible) return null;

  // Curated status layouts
  const layouts = {
    success: {
      icon: 'checkmark-circle-outline',
      color: Theme.colors.success,
      gradient: Theme.colors.gradientSuccess || ['#059669', '#0d9488'],
    },
    error: {
      icon: 'close-circle-outline',
      color: Theme.colors.error,
      gradient: ['#dc2626', '#b91c1c'],
    },
    warning: {
      icon: 'alert-circle-outline',
      color: Theme.colors.warning,
      gradient: ['#d97706', '#b45309'],
    },
    info: {
      icon: 'information-circle-outline',
      color: Theme.colors.primary,
      gradient: Theme.colors.gradientPrimary || ['#1a56db', '#1239a8'],
    },
    question: {
      icon: 'help-circle-outline',
      color: Theme.colors.accent || '#7c3aed',
      gradient: Theme.colors.gradientAccent || ['#7c3aed', '#1a56db'],
    },
  };

  const layout = layouts[type] || layouts.info;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.alertCard}>
          {/* Status Icon */}
          <LinearGradient
            colors={layout.gradient}
            style={styles.iconContainer}
          >
            <Ionicons name={layout.icon} size={32} color="#fff" />
          </LinearGradient>

          {/* Texts */}
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.length === 0 ? (
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={styles.singleButtonContainer}
              >
                <LinearGradient
                  colors={layout.gradient}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      onClose();
                    }}
                    activeOpacity={0.8}
                    style={buttons.length === 2 ? styles.halfButton : styles.fullButton}
                  >
                    {isCancel ? (
                      <View style={[styles.button, styles.cancelButton]}>
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>
                          {btn.text}
                        </Text>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={layout.gradient}
                        style={styles.button}
                      >
                        <Text style={styles.buttonText}>{btn.text}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 92, 0.45)', // Sleek theme-tinted overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    // Premium soft card shadow
    shadowColor: '#0f1f5c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Accent shadow
    shadowColor: '#0f1f5c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontSize: Theme.typography.md + 1,
    fontWeight: '900',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: Theme.typography.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  singleButtonContainer: {
    width: '100%',
  },
  fullButton: {
    width: '100%',
  },
  halfButton: {
    flex: 1,
    minWidth: 100,
  },
  button: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  buttonText: {
    color: '#fff',
    fontSize: Theme.typography.sm + 1,
    fontWeight: '800',
  },
  cancelButtonText: {
    color: '#475569',
  },
});
