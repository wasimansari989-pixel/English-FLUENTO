import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '../theme';

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  isCenter?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Learn', route: '/', icon: 'school-outline' },
  { id: 'formulas', label: 'Formulas', route: '/formulas', icon: 'layers-outline' },
  { id: 'ai-voice', label: 'Voice AI', route: '/talk-to-ai', icon: 'mic', isCenter: true },
  { id: 'practice', label: 'Practice', route: '/practice', icon: 'flash-outline' },
  { id: 'progress', label: 'You', route: '/progress', icon: 'person-outline' },
];

interface BottomNavBarProps {
  activeTab?: 'home' | 'formulas' | 'ai-voice' | 'practice' | 'progress';
}

const AnimatedNavTab: React.FC<{
  item: NavItem;
  active: boolean;
  onPress: () => void;
}> = ({ item, active, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      scaleAnim.setValue(0.92);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.navPill,
          active && styles.navPillActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
      >
        <Text
          style={[
            styles.navLabel,
            active && styles.navLabelActive,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const centerScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        pulseAnim.setValue(1);
        return;
      }
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    });

    return () => loop?.stop();
  }, [pulseAnim]);

  const isCurrentActive = (route: string, id: string) => {
    if (activeTab) return activeTab === id;
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(route);
  };

  const handleNav = (targetRoute: string, targetId: string) => {
    if (isCurrentActive(targetRoute, targetId)) return;
    router.replace(targetRoute as any);
  };

  const handleCenterPressIn = () => {
    Animated.spring(centerScaleAnim, {
      toValue: 0.9,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleCenterPressOut = () => {
    Animated.spring(centerScaleAnim, {
      toValue: 1,
      speed: 35,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom + 8, 18) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dockCapsule}>
        {NAV_ITEMS.map((item) => {
          const active = isCurrentActive(item.route, item.id);

          if (item.isCenter) {
            return (
              <Animated.View
                key={item.id}
                style={{ transform: [{ scale: centerScaleAnim }] }}
              >
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleNav(item.route, item.id)}
                  onPressIn={handleCenterPressIn}
                  onPressOut={handleCenterPressOut}
                  style={styles.centerButton}
                  accessibilityRole="button"
                  accessibilityLabel="AI Voice Speaking Teacher"
                >
                  <Animated.View
                    style={[
                      styles.centerButtonGlow,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                  <Ionicons name="mic" size={20} color="#0A0A0A" />
                </TouchableOpacity>
              </Animated.View>
            );
          }

          return (
            <AnimatedNavTab
              key={item.id}
              item={item}
              active={active}
              onPress={() => handleNav(item.route, item.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 999,
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF', // Elevated White Capsule Dock
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  navPill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPillActive: {
    backgroundColor: '#1E1E24', // Active Dark Pill on Light Dock
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  centerButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lime, // '#D4FF00'
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  centerButtonGlow: {
    position: 'absolute',
    inset: -3,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.50)',
  },
});

export default BottomNavBar;
