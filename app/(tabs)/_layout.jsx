import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../utils/Theme';

const { width } = Dimensions.get('window');

// Responsive icon size: slightly smaller on tiny screens
const ICON_SIZE = width < 360 ? 20 : 23;
// Responsive label font: min 10px on 360px screens
const LABEL_SIZE = Math.max(10, Math.min(12, width * 0.028));

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Handle both 3-button navigation and gesture navigation heights on Android and iOS
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const TAB_HEIGHT = 54 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor:   Theme.colors.tabActive,
        tabBarInactiveTintColor: Theme.colors.tabInactive,
        tabBarStyle: {
          height:            TAB_HEIGHT,
          paddingBottom:     bottomInset - 2,
          paddingTop:        6,
          backgroundColor:   Theme.colors.tabBackground,
          borderTopWidth:    1,
          borderTopColor:    Theme.colors.borderLight,
          // Subtle shadow above tab bar
          shadowColor: '#0f1f5c',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize:   LABEL_SIZE,
          fontWeight: '700',
          marginTop:  -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trace"
        options={{
          title: 'AI Trace',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
