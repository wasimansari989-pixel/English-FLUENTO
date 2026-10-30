import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 1. CINEMATIC LAUNCH SEQUENCE
 * Replicates .launch-sequence from fluent_futuristic_motion_edition.html
 * Plays an ultra-sleek futuristic intro with rotating rings, floating glowing "F" emblem,
 * wordmark with letter-spacing tracking, and neon lime progress sweep.
 */
export const CinematicLaunchSequence: React.FC<{
  onFinished?: () => void;
}> = ({ onFinished }) => {
  const [visible, setVisible] = useState(true);

  // Rotation animations for rings
  const ring1Spin = useRef(new Animated.Value(0)).current;
  const ring2Spin = useRef(new Animated.Value(0)).current;

  // Float animation for emblem
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Center entrance
  const centerScale = useRef(new Animated.Value(0.92)).current;
  const centerOpacity = useRef(new Animated.Value(0)).current;

  // Wordmark and tag entrance
  const wordmarkTranslate = useRef(new Animated.Value(14)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  // Progress sweep
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Overall exit animation
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Continuous ring rotations
    const loop1 = Animated.loop(
      Animated.timing(ring1Spin, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loop2 = Animated.loop(
      Animated.timing(ring2Spin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Emblem float loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop1.start();
    loop2.start();
    floatLoop.start();

    // 3. Sequential entrance choreographies
    Animated.parallel([
      Animated.timing(centerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(centerScale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Wordmark entrance at 220ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslate, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 220);

    // Tagline entrance at 450ms
    setTimeout(() => {
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }, 450);

    // Progress bar load from 250ms
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
        useNativeDriver: true,
      }).start();
    }, 250);

    // Auto dismiss at 2100ms
    const autoDismissTimer = setTimeout(() => {
      dismiss();
    }, 2100);

    return () => {
      clearTimeout(autoDismissTimer);
      loop1.stop();
      loop2.stop();
      floatLoop.stop();
    };
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.05,
        duration: 420,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onFinished?.();
    });
  };

  if (!visible) return null;

  const spin1 = ring1Spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spin2 = ring2Spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const progressTranslate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  return (
    <Animated.View
      style={[
        styles.launchContainer,
        {
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={dismiss}
        style={styles.launchTouchArea}
      >
        {/* Background Rotating Celestial Rings */}
        <Animated.View
          style={[
            styles.launchRingOuter,
            { transform: [{ rotate: spin1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.launchRingInner,
            { transform: [{ rotate: spin2 }] },
          ]}
        />

        {/* Central Content */}
        <Animated.View
          style={[
            styles.launchCenter,
            {
              opacity: centerOpacity,
              transform: [{ scale: centerScale }],
            },
          ]}
        >
          {/* Futuristic Emblem Box with Neon Lime 'F' */}
          <Animated.View
            style={[
              styles.launchEmblem,
              { transform: [{ translateY: floatAnim }] },
            ]}
          >
            {/* Tilted orbital ring around emblem */}
            <Animated.View
              style={[
                styles.emblemOrbitRing,
                { transform: [{ rotate: spin1 }] },
              ]}
            />
            <Text style={styles.launchMark}>F</Text>
          </Animated.View>

          {/* Wordmark: FLUENT */}
          <Animated.View
            style={{
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslate }],
            }}
          >
            <Text style={styles.launchWordmark}>FLUENT</Text>
          </Animated.View>

          {/* Tagline: THINK · SPEAK · BE FLUENT */}
          <Animated.View style={{ opacity: tagOpacity }}>
            <Text style={styles.launchTag}>THINK · SPEAK · BE FLUENT</Text>
          </Animated.View>

          {/* Progress Loading Bar */}
          <View style={styles.launchProgressTrack}>
            <Animated.View
              style={[
                styles.launchProgressFill,
                { transform: [{ translateX: progressTranslate }] },
              ]}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * 2. FUTURISTIC AMBIENT SCENE
 * Replicates .ambient-scene & .ambient-blob from fluent_futuristic_motion_edition.html
 * Adds soft floating lavender and lime ambient blobs behind screens.
 */
export const AmbientScene: React.FC = () => {
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(blob1Anim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, {
          toValue: 1,
          duration: 11000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(blob2Anim, {
          toValue: 0,
          duration: 11000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const orbitLoop = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 32000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop1.start();
    loop2.start();
    orbitLoop.start();

    return () => {
      loop1.stop();
      loop2.stop();
      orbitLoop.stop();
    };
  }, []);

  const blob1X = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const blob1Y = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });
  const blob1Scale = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const blob2X = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 26],
  });
  const blob2Y = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const orbitSpin = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.ambientSceneContainer} pointerEvents="none">
      {/* Lavender Soft Blob (Top Right) */}
      <Animated.View
        style={[
          styles.ambientBlobLavender,
          {
            transform: [
              { translateX: blob1X },
              { translateY: blob1Y },
              { scale: blob1Scale },
            ],
          },
        ]}
      />

      {/* Neon Lime Soft Glow Blob (Bottom Left) */}
      <Animated.View
        style={[
          styles.ambientBlobLime,
          {
            transform: [
              { translateX: blob2X },
              { translateY: blob2Y },
            ],
          },
        ]}
      />

      {/* Celestial Ambient Orbit Ring (Left Side) */}
      <Animated.View
        style={[
          styles.ambientOrbitRing,
          {
            transform: [{ rotate: orbitSpin }],
          },
        ]}
      />
    </View>
  );
};

/**
 * 3. HERO STAGE ORBIT RINGS & PULSING SPARKS
 * Replicates .hero-orbit and .hero-spark from fluent_futuristic_motion_edition.html
 * Inside hero card: concentric rotating rings and pulsing star sparks.
 */
export const HeroStageOrbits: React.FC = () => {
  const orbit1Anim = useRef(new Animated.Value(0)).current;
  const orbit2Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(orbit1Anim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const loop2 = Animated.loop(
      Animated.timing(orbit2Anim, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const sparkPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const sparkPulse2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, {
          toValue: 1.5,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 0.65,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop1.start();
    loop2.start();
    sparkPulse.start();
    sparkPulse2.start();

    return () => {
      loop1.stop();
      loop2.stop();
      sparkPulse.stop();
      sparkPulse2.stop();
    };
  }, []);

  const spin1 = orbit1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spin2 = orbit2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Outer Rotating Dashed Ring */}
      <Animated.View
        style={[
          styles.heroOrbitRingOuter,
          { transform: [{ rotate: spin1 }] },
        ]}
      />

      {/* Inner Lime Ring */}
      <Animated.View
        style={[
          styles.heroOrbitRingInner,
          { transform: [{ rotate: spin2 }] },
        ]}
      />

      {/* Spark 1: Neon Lime Star (Top Right) */}
      <Animated.View
        style={[
          styles.heroSparkLime,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [0.7, 1.45],
              outputRange: [0.45, 1],
            }),
          },
        ]}
      />

      {/* Spark 2: Lavender Star (Bottom Left) */}
      <Animated.View
        style={[
          styles.heroSparkLavender,
          {
            transform: [{ scale: pulseAnim2 }],
            opacity: pulseAnim2.interpolate({
              inputRange: [0.65, 1.5],
              outputRange: [0.4, 0.95],
            }),
          },
        ]}
      />
    </View>
  );
};

/**
 * 4. KINETIC KICKER
 * Replicates .kinetic-kicker with the glowing neon lime horizontal indicator line
 */
export const KineticKicker: React.FC<{
  text: string;
  style?: TextStyle;
}> = ({ text, style }) => {
  return (
    <View style={styles.kickerRow}>
      <View style={styles.kickerLine} />
      <Text style={[styles.kickerText, style]}>{text}</Text>
    </View>
  );
};

/**
 * 5. ANIMATED NEON UNDERLINE
 * Replicates .hero-phrase:after with animated scaleX reveal
 */
export const AnimatedPhrase: React.FC<{
  text: string;
  style?: TextStyle;
}> = ({ text, style }) => {
  const underlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(underlineAnim, {
      toValue: 1,
      duration: 700,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.phraseContainer}>
      <Text style={style}>{text}</Text>
      <Animated.View
        style={[
          styles.phraseUnderline,
          {
            transform: [{ scaleX: underlineAnim }],
          },
        ]}
      />
    </View>
  );
};

/**
 * 6. FLOATING PILL CHIP
 * Replicates .hero-chips .chip float animation
 */
export const FloatingPill: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}> = ({ children, delay = 0, style }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4.5,
          duration: 1800,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ translateY: floatAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * 7. MINI LAUNCH EMBLEM BADGE
 * Replicates the 58x58 futuristic launch emblem used in YOUR NEXT CHAPTER card
 */
export const LaunchEmblemBadge: React.FC<{ size?: number }> = ({ size = 56 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    floatLoop.start();
    spinLoop.start();

    return () => {
      floatLoop.stop();
      spinLoop.stop();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['18deg', '378deg'],
  });

  return (
    <Animated.View
      style={[
        styles.miniEmblem,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.35),
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.miniEmblemOrbit,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: Math.round((size + 16) * 0.35),
            transform: [{ rotate: spin }],
          },
        ]}
      />
      <Text style={[styles.miniEmblemMark, { fontSize: Math.round(size * 0.44) }]}>F</Text>
    </Animated.View>
  );
};

/**
 * 8. SURFACE SWEEP LIGHT
 * Replicates .hero-stage:after surface-sweep from fluent_futuristic_motion_edition.html
 * A diagonal soft white light band that smoothly sweeps across the hero card every 5.8s.
 */
export const SurfaceSweep: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 1900,
          easing: Easing.bezier(0.5, 0, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.delay(2800),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const sweepX = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 0.9, SCREEN_WIDTH * 0.9],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.surfaceSweepBeam,
          {
            transform: [
              { rotate: '25deg' },
              { translateX: sweepX },
            ],
          },
          style,
        ]}
      />
    </View>
  );
};

/**
 * 9. KINETIC HERO TITLE ("SPEAK \n ENGLISH")
 * Replicates:
 * - .kinetic-title with perspective: 600px
 * - .title-line with overflow: hidden
 * - .title-word with translateY(115%) rotateX(-35deg) -> 0deg entrance
 * - word 1 (SPEAK) delay: 180ms
 * - word 2 (ENGLISH) delay: 340ms with metallic silver surface
 * - title-glint: metallic sweep across "ENGLISH" every 2.7s
 */
export const KineticHeroTitle: React.FC<{
  fontSize?: number;
  containerStyle?: ViewStyle;
}> = ({ fontSize = 62, containerStyle }) => {
  // Line 1 entrance
  const line1Progress = useRef(new Animated.Value(0)).current;
  // Line 2 entrance
  const line2Progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Line 1 Entrance (delay: 180ms, duration: 850ms)
    const timer1 = setTimeout(() => {
      Animated.timing(line1Progress, {
        toValue: 1,
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();
    }, 180);

    // 2. Line 2 Entrance (delay: 340ms, duration: 850ms)
    const timer2 = setTimeout(() => {
      Animated.timing(line2Progress, {
        toValue: 1,
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();
    }, 340);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const lineHeight = Math.round(fontSize * 0.94);
  const letterSpacing = -2.8;

  // Line 1 3D transforms
  const line1Y = line1Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [65, 0],
  });
  const line1Rot = line1Progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-35deg', '0deg'],
  });

  // Line 2 3D transforms
  const line2Y = line2Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [65, 0],
  });
  const line2Rot = line2Progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-35deg', '0deg'],
  });

  // Scaled 3D offsets matching prototype CSS exactly
  const bevelOffset = Math.max(1.5, Math.round(fontSize * 0.035 * 10) / 10);
  const highlightOffset = Math.max(1.0, Math.round(fontSize * 0.02 * 10) / 10);
  const shadowX = Math.max(3.0, Math.round(fontSize * 0.075 * 10) / 10);
  const shadowY = Math.max(4.5, Math.round(fontSize * 0.105 * 10) / 10);
  const shadowBlur = Math.max(5, Math.round(fontSize * 0.09));

  // Generous canvas padding so Android text renderer never clips shadows
  const padX = 26;
  const padTop = 10;
  const padBottom = 22;

  // Non-breaking spaces extend Android StaticLayout advance width past 'K' and 'H'
  // so textShadow (+shadowX +shadowBlur) is never vertically clipped at line end.
  const line1Text = '\u00A0\u00A0SPEAK\u00A0\u00A0';
  const line2Text = '\u00A0\u00A0ENGLISH\u00A0\u00A0';

  const baseTextStyle: TextStyle = {
    fontSize,
    lineHeight,
    fontWeight: '900',
    letterSpacing,
    textAlign: 'center',
    includeFontPadding: false,
    paddingHorizontal: padX,
    paddingTop: padTop,
    paddingBottom: padBottom,
  };

  return (
    <View
      style={[
        {
          alignItems: 'center',
          marginVertical: 4,
          marginHorizontal: -padX,
          overflow: 'visible',
        },
        containerStyle,
      ]}
    >
      {/* ================= LINE 1: SPEAK ================= */}
      <View style={styles.kineticLineWrapper}>
        <Animated.View
          style={{
            opacity: line1Progress,
            overflow: 'visible',
            transform: [
              { perspective: 600 },
              { translateY: line1Y },
              { rotateX: line1Rot },
            ],
          }}
        >
          {/* Layer 1: Ambient Cast Drop Shadow */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: 'rgba(25, 25, 30, 0.24)',
                textShadowOffset: { width: shadowX, height: shadowY },
                textShadowRadius: shadowBlur,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line1Text}
          </Text>

          {/* Layer 2: Extruded Bottom-Right Crisp Bevel */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: '#A6A6AD',
                textShadowOffset: { width: bevelOffset, height: bevelOffset },
                textShadowRadius: 1,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line1Text}
          </Text>

          {/* Layer 3: Specular Top-Left Pure White Rim */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: '#FFFFFF',
                textShadowOffset: { width: -highlightOffset, height: -highlightOffset },
                textShadowRadius: 1,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line1Text}
          </Text>

          {/* Layer 4: Main Surface Face (smooth light clay) */}
          <Text
            style={[
              baseTextStyle,
              {
                color: '#EBEBED',
              },
            ]}
            numberOfLines={1}
          >
            {line1Text}
          </Text>
        </Animated.View>
      </View>

      {/* ================= LINE 2: ENGLISH (Clean White Clay, No Sweep Animation) ================= */}
      <View style={[styles.kineticLineWrapper, { marginTop: -22 }]}>
        <Animated.View
          style={{
            opacity: line2Progress,
            overflow: 'visible',
            transform: [
              { perspective: 600 },
              { translateY: line2Y },
              { rotateX: line2Rot },
            ],
          }}
        >
          {/* Layer 1: Ambient Cast Drop Shadow */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: 'rgba(25, 25, 30, 0.24)',
                textShadowOffset: { width: shadowX, height: shadowY },
                textShadowRadius: shadowBlur,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line2Text}
          </Text>

          {/* Layer 2: Extruded Bottom-Right Crisp Bevel */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: '#A6A6AD',
                textShadowOffset: { width: bevelOffset, height: bevelOffset },
                textShadowRadius: 1,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line2Text}
          </Text>

          {/* Layer 3: Specular Top-Left Pure White Rim */}
          <Text
            style={[
              baseTextStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                color: '#EBEBED',
                textShadowColor: '#FFFFFF',
                textShadowOffset: { width: -highlightOffset, height: -highlightOffset },
                textShadowRadius: 1,
              },
            ]}
            numberOfLines={1}
            aria-hidden
          >
            {line2Text}
          </Text>

          {/* Layer 4: Main Surface Face (Pure White Clay #EBEBED matching SPEAK) */}
          <Text
            style={[
              baseTextStyle,
              {
                color: '#EBEBED',
              },
            ]}
            numberOfLines={1}
          >
            {line2Text}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Surface Sweep Beam
  surfaceSweepBeam: {
    position: 'absolute',
    top: -120,
    left: '30%',
    width: 65,
    height: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderRadius: 32,
    zIndex: 1,
  },

  // Kinetic Title
  kineticLineWrapper: {
    overflow: 'visible',
    alignItems: 'center',
  },
  // Launch Sequence Styles
  launchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#151519',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchTouchArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchRingOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.22)',
  },
  launchRingInner: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(205, 182, 233, 0.28)',
  },
  launchCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  launchEmblem: {
    width: 82,
    height: 82,
    borderRadius: 27,
    backgroundColor: '#1E1E24',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#D4FF00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  emblemOrbitRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.45)',
  },
  launchMark: {
    fontSize: 38,
    fontWeight: '900',
    color: '#D4FF00',
    letterSpacing: -1,
    textShadowColor: 'rgba(212, 255, 0, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  launchWordmark: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  launchTag: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: 'rgba(255, 255, 255, 0.58)',
    textTransform: 'uppercase',
  },
  launchProgressTrack: {
    width: 136,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginTop: 28,
  },
  launchProgressFill: {
    width: 50,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#D4FF00',
  },

  // Ambient Scene Styles
  ambientSceneContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientBlobLavender: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(205, 182, 233, 0.22)',
    right: -70,
    top: 60,
  },
  ambientBlobLime: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(212, 255, 0, 0.09)',
    left: -80,
    bottom: 120,
  },
  ambientOrbitRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(173, 144, 224, 0.14)',
    left: -140,
    top: '25%',
  },

  // Hero Stage Orbit Rings
  heroOrbitRingOuter: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: 'rgba(169, 145, 218, 0.26)',
    borderStyle: 'dashed',
    top: '50%',
    left: '50%',
    marginTop: -115,
    marginLeft: -115,
  },
  heroOrbitRingInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.24)',
    top: '50%',
    left: '50%',
    marginTop: -85,
    marginLeft: -85,
  },
  heroSparkLime: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D4FF00',
    top: 22,
    right: 26,
    ...Platform.select({
      ios: {
        shadowColor: '#D4FF00',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  heroSparkLavender: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#B6A0ED',
    bottom: 30,
    left: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#B6A0ED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },

  // Kinetic Kicker
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kickerLine: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#D4FF00',
  },
  kickerText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontWeight: '800',
    color: '#777780',
  },

  // Phrase Underline
  phraseContainer: {
    position: 'relative',
    display: 'flex',
  },
  phraseUnderline: {
    position: 'absolute',
    left: 0,
    bottom: -3,
    width: '100%',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#D4FF00',
  },

  // Mini Emblem Badge
  miniEmblem: {
    backgroundColor: '#1E1E24',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#D4FF00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  miniEmblemOrbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.35)',
  },
  miniEmblemMark: {
    fontWeight: '900',
    color: '#D4FF00',
    letterSpacing: -0.5,
  },
});
