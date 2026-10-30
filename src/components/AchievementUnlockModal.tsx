import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AchievementItem } from '../types/gamification';
import { colors, radii, shadows } from '../theme';

interface AchievementUnlockModalProps {
  achievement: AchievementItem | null;
  onDismiss: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  achievement,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringRotateAnim = useRef(new Animated.Value(0)).current;
  const counterRingRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!achievement) return;

    let ringLoop: Animated.CompositeAnimation | null = null;
    let counterLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (reducedMotion) {
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
        pulseAnim.setValue(1);
        return;
      }

      // Spring entrance
      scaleAnim.setValue(0.82);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous clockwise ring rotation
      ringRotateAnim.setValue(0);
      ringLoop = Animated.loop(
        Animated.timing(ringRotateAnim, {
          toValue: 1,
          duration: 6500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      ringLoop.start();

      // Counter-rotating aura
      counterRingRotateAnim.setValue(0);
      counterLoop = Animated.loop(
        Animated.timing(counterRingRotateAnim, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      counterLoop.start();

      // Reward badge gentle breathing pulse
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.97,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    });

    return () => {
      ringLoop?.stop();
      counterLoop?.stop();
      pulseLoop?.stop();
    };
  }, [achievement]);

  if (!achievement) return null;

  const spin = ringRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = counterRingRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Modal
      transparent
      visible={!!achievement}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Orbital Aura Rings Container */}
          <View style={styles.orbitalAuraWrapper}>
            {/* Outer Counter-Rotating Glow Halo */}
            <Animated.View
              style={[
                styles.outerGlowRing,
                {
                  borderColor: achievement.color,
                  transform: [{ rotate: counterSpin }],
                },
              ]}
            >
              <View
                style={[
                  styles.outerOrbitalDot,
                  { backgroundColor: achievement.color },
                ]}
              />
            </Animated.View>

            {/* Inner Clockwise Orbit Ring */}
            <Animated.View
              style={[
                styles.iconRing,
                {
                  borderColor: achievement.color,
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View
                style={[
                  styles.innerOrbitalDot,
                  { backgroundColor: '#FFFFFF' },
                ]}
              />
            </Animated.View>

            {/* Static Icon Sphere Core */}
            <View
              style={[
                styles.iconInner,
                {
                  backgroundColor: achievement.color,
                  shadowColor: achievement.color,
                },
              ]}
            >
              <Ionicons name={achievement.icon as any} size={36} color="#0A0A0B" />
            </View>
          </View>

          {/* Celebration Tag */}
          <View style={styles.tagPill}>
            <Ionicons name="sparkles" size={12} color="#D6FF57" />
            <Text style={styles.tagText}>ACHIEVEMENT UNLOCKED!</Text>
          </View>

          {/* Titles */}
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.hindiTitle}>{achievement.hindiTitle}</Text>

          {/* Description */}
          <Text style={styles.description}>{achievement.description}</Text>

          {/* XP Reward Badge with gentle breathing pulse */}
          <Animated.View
            style={[
              styles.rewardBadge,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="diamond" size={16} color="#0A0A0B" />
            <Text style={styles.rewardText}>+{achievement.xpReward} XP REWARD</Text>
          </Animated.View>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Awesome! Continue / जारी रखें</Text>
            <Ionicons name="arrow-forward" size={16} color="#0A0A0B" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#18181B',
    borderRadius: 32,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 255, 87, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  orbitalAuraWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  outerGlowRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  outerOrbitalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -4,
  },
  iconRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  innerOrbitalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    top: -3.5,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(214, 255, 87, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 255, 87, 0.3)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D6FF57',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  hindiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    color: '#D4D4D8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 22,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0A0A0B',
    letterSpacing: 0.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A0A0B',
  },
});

