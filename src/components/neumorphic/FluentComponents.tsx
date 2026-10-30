import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';

export const fluentTokens = {
  bg: '#E8E8EB',
  panel: '#E5E5E8',
  panelElevated: '#ECECEF',
  white: '#FAFAFD',
  ink: '#19191D',
  muted: '#777780',
  line: 'rgba(30, 30, 38, 0.11)',
  lime: '#D4FF00',
  limeDark: '#171717',
  coral: '#FF3B30',
  lavender: '#CDB6E9',
  blue: '#2486F6',
  borderLight: 'rgba(255, 255, 255, 0.95)',
  borderDark: 'rgba(30, 30, 38, 0.08)',
};

/**
 * Animated Futuristic AI Orb with orbital rings, core glow, and orbital dot
 */
export const FluentOrb: React.FC<{ size?: number; style?: ViewStyle }> = ({
  size = 104,
  style,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 1800,
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

    // Orbit ring rotation
    const orbitLoop = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    orbitLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      orbitLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, orbitAnim, pulseAnim]);

  const spin = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.orbWrapper, { height: size + 46 }, style]}>
      <Animated.View
        style={[
          styles.orbContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        {/* Outer Halo / Glow */}
        <View
          style={[
            styles.orbOuterHalo,
            {
              width: size + 34,
              height: size + 34,
              borderRadius: (size + 34) / 2,
            },
          ]}
        />

        {/* Orbit Ring 1 */}
        <Animated.View
          style={[
            styles.orbOrbitRing1,
            {
              width: size + 24,
              height: size + 24,
              borderRadius: (size + 24) / 2,
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Orbit Ring 2 (Lime accent ring) */}
        <Animated.View
          style={[
            styles.orbOrbitRing2,
            {
              width: size + 36,
              height: size + 18,
              borderRadius: (size + 36) / 2,
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* The Central Sphere */}
        <View
          style={[
            styles.orbSphere,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {/* Internal high-contrast core light */}
          <Animated.View
            style={[
              styles.orbCore,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        </View>

        {/* Orbiting Lime Dot */}
        <Animated.View
          style={[
            styles.orbitDot,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Soft Neumorphic Elevated Card
 */
export const FluentCard: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  inset?: boolean;
}> = ({ children, style, inset }) => {
  return (
    <View style={[styles.card, inset ? styles.cardInset : styles.cardRaised, style]}>
      {children}
    </View>
  );
};

/**
 * Premium Fluent Action Button (Lime / Ink / Light / Outline)
 */
export const FluentButton: React.FC<{
  title: string;
  variant?: 'lime' | 'ink' | 'light' | 'outline';
  onPress: () => void;
  disabled?: boolean;
  arrow?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}> = ({
  title,
  variant = 'lime',
  onPress,
  disabled = false,
  arrow = false,
  style,
  textStyle,
}) => {
  const isLime = variant === 'lime';
  const isInk = variant === 'ink';
  const isLight = variant === 'light';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.buttonBase,
        isLime && styles.buttonLime,
        isInk && styles.buttonInk,
        isLight && styles.buttonLight,
        isOutline && styles.buttonOutline,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          isLime && styles.buttonTextLime,
          isInk && styles.buttonTextInk,
          isLight && styles.buttonTextLight,
          isOutline && styles.buttonTextOutline,
          disabled && styles.buttonTextDisabled,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {arrow && (
        <Text
          style={[
            styles.arrowText,
            isLime && styles.buttonTextLime,
            isInk && styles.buttonTextInk,
            isLight && styles.buttonTextLight,
            isOutline && styles.buttonTextOutline,
          ]}
        >
          {' →'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Step Progress Indicator Track
 */
export const FluentProgressTrack: React.FC<{ progressPercent: number; style?: ViewStyle }> = ({
  progressPercent,
  style,
}) => {
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return (
    <View style={[styles.progressTrack, style]}>
      <View style={[styles.progressBar, { width: `${clamped}%` }]} />
    </View>
  );
};

/**
 * Top Navigation Bar with Back button, Center Label, and Help button
 */
export const FluentTopBar: React.FC<{
  title: string;
  onBack?: () => void;
  onHelp?: () => void;
  showBack?: boolean;
  showHelp?: boolean;
}> = ({ title, onBack, onHelp, showBack = true, showHelp = true }) => {
  return (
    <View style={styles.topbar}>
      {showBack && onBack ? (
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={styles.iconBtn}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Text style={styles.backIconText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtnPlaceholder} />
      )}

      <View style={styles.topLabelContainer}>
        <Text style={styles.topLabelText} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {showHelp && onHelp ? (
        <TouchableOpacity
          onPress={onHelp}
          activeOpacity={0.7}
          style={styles.iconBtn}
          accessibilityLabel="Help"
          accessibilityRole="button"
        >
          <Text style={styles.helpIconText}>?</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtnPlaceholder} />
      )}
    </View>
  );
};

/**
 * 3D Embossed Hero Text ('SPEAK\nENGLISH')
 * Replicates the prototype's .home-hero h1:
 * font-size: clamp(48px,13vw,68px); letter-spacing: -.07em; line-height: .9; font-weight: 1000;
 * color: #EBEBED; text-shadow: 2px 2px 1px #a6a6ad, -1px -1px 1px #fff, 5px 7px 5px rgba(25,25,30,.24)
 */
export interface EmbossedHeroTextProps {
  text?: string;
  fontSize?: number;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'center' | 'left';
  containerStyle?: ViewStyle;
}

export const EmbossedHeroText: React.FC<EmbossedHeroTextProps> = ({
  text = 'SPEAK\nENGLISH',
  fontSize = 62,
  color,
  letterSpacing,
  lineHeight: customLineHeight,
  textAlign = 'center',
  containerStyle,
}) => {
  // Line height: exactly 0.90 * fontSize for tight, compact uppercase hero stacking
  const lineHeight = customLineHeight ?? Math.round(fontSize * 0.90);
  const resolvedLetterSpacing =
    letterSpacing !== undefined ? letterSpacing : -2.8;

  // Authentic reference clay face color (#EBEBED)
  const faceColor = color || '#EBEBED';

  // Scaled 3D offsets matching prototype CSS exactly:
  // text-shadow: 2px 2px 1px #a6a6ad, -1px -1px 1px #fff, 5px 7px 5px rgba(25,25,30,.24)
  const bevelOffset = Math.max(1.5, Math.round(fontSize * 0.035 * 10) / 10);
  const highlightOffset = Math.max(1.0, Math.round(fontSize * 0.02 * 10) / 10);
  const shadowX = Math.max(3.0, Math.round(fontSize * 0.075 * 10) / 10);
  const shadowY = Math.max(4.5, Math.round(fontSize * 0.105 * 10) / 10);
  const shadowBlur = Math.max(5, Math.round(fontSize * 0.09));

  // Generous padding around the text views so Android canvas NEVER clips the text shadows
  const padX = 24;
  const padTop = 10;
  const padBottom = 22;

  const baseTextStyle: TextStyle = {
    fontSize,
    lineHeight,
    fontWeight: '900',
    letterSpacing: resolvedLetterSpacing,
    textAlign,
    includeFontPadding: false,
    paddingHorizontal: padX,
    paddingTop: padTop,
    paddingBottom: padBottom,
  };

  // Non-breaking spaces extend Android StaticLayout line boundary past the rightmost glyph
  const renderedText = text
    .split('\n')
    .map((line) => `\u00A0\u00A0${line}\u00A0\u00A0`)
    .join('\n');

  return (
    <View
      style={[
        {
          position: 'relative',
          alignItems: textAlign === 'left' ? 'flex-start' : 'center',
          marginHorizontal: -padX,
          marginVertical: -padTop + 6,
          overflow: 'visible',
        },
        containerStyle,
      ]}
    >
      {/* Layer 1: Ambient Cast Drop Shadow (5px 7px 5px rgba(25,25,30,.24)) */}
      <Text
        style={[
          baseTextStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            color: faceColor,
            textShadowColor: 'rgba(25, 25, 30, 0.24)',
            textShadowOffset: { width: shadowX, height: shadowY },
            textShadowRadius: shadowBlur,
          },
        ]}
        aria-hidden
      >
        {renderedText}
      </Text>

      {/* Layer 2: Extruded Bottom-Right Crisp Bevel (2px 2px 1px #a6a6ad) */}
      <Text
        style={[
          baseTextStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            color: faceColor,
            textShadowColor: '#A6A6AD',
            textShadowOffset: { width: bevelOffset, height: bevelOffset },
            textShadowRadius: 1,
          },
        ]}
        aria-hidden
      >
        {renderedText}
      </Text>

      {/* Layer 3: Specular Top-Left Pure White Rim (-1px -1px 1px #fff) */}
      <Text
        style={[
          baseTextStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            color: faceColor,
            textShadowColor: '#FFFFFF',
            textShadowOffset: { width: -highlightOffset, height: -highlightOffset },
            textShadowRadius: 1,
          },
        ]}
        aria-hidden
      >
        {renderedText}
      </Text>

      {/* Layer 4: Main Surface Face */}
      <Text
        style={[
          baseTextStyle,
          {
            color: faceColor,
          },
        ]}
      >
        {renderedText}
      </Text>
    </View>
  );
};

/**
 * 3D Embossed Word (.outline-word in prototype)
 * Replicates:
 * color: #E7E7EA, text-shadow: 2px 2px 2px #a9a9af, -1px -1px 2px #fff, 4px 5px 4px rgba(30,30,35,.22)
 */
export interface EmbossedWordProps {
  text: string;
  fontSize?: number;
  letterSpacing?: number;
  containerStyle?: ViewStyle;
}

export const EmbossedWord: React.FC<EmbossedWordProps> = ({
  text,
  fontSize = 34,
  letterSpacing = -1.2,
  containerStyle,
}) => {
  return (
    <Text
      style={[
        {
          fontSize,
          lineHeight: Math.round(fontSize * 1.18),
          fontWeight: '900',
          letterSpacing,
          color: '#E7E7EA',
          textShadowColor: 'rgba(25, 25, 32, 0.40)',
          textShadowOffset: { width: 1.8, height: 2.2 },
          textShadowRadius: 3,
          includeFontPadding: false,
        },
        containerStyle as TextStyle,
      ]}
    >
      {text}
    </Text>
  );
};

export type HeadingLineConfig =
  | string
  | {
      prefix?: string;
      embossed: string;
      suffix?: string;
    };

export interface FluentHeadingProps {
  lines: HeadingLineConfig[];
  center?: boolean;
  fontSize?: number;
  containerStyle?: ViewStyle;
}

export const FluentHeading: React.FC<FluentHeadingProps> = ({
  lines,
  center = false,
  fontSize = 32,
  containerStyle,
}) => {
  const lineHeight = Math.round(fontSize * 1.18);

  return (
    <View
      style={[
        {
          marginVertical: 4,
          alignItems: center ? 'center' : 'flex-start',
        },
        containerStyle,
      ]}
    >
      {lines.map((line, idx) => {
        if (typeof line === 'string') {
          return (
            <Text
              key={idx}
              style={{
                fontSize,
                lineHeight,
                fontWeight: '900',
                letterSpacing: -1.2,
                color: '#19191D',
                textAlign: center ? 'center' : 'left',
                includeFontPadding: false,
                marginVertical: 1,
              }}
            >
              {line}
            </Text>
          );
        }

        const { prefix, embossed, suffix } = line;
        return (
          <Text
            key={idx}
            style={{
              fontSize,
              lineHeight,
              fontWeight: '900',
              letterSpacing: -1.2,
              color: '#19191D',
              textAlign: center ? 'center' : 'left',
              includeFontPadding: false,
              marginVertical: 1,
            }}
          >
            {prefix ? `${prefix.trimEnd()} ` : ''}
            <Text
              style={{
                color: '#E7E7EA',
                textShadowColor: 'rgba(25, 25, 32, 0.40)',
                textShadowOffset: { width: 1.8, height: 2.2 },
                textShadowRadius: 3,
              }}
            >
              {embossed}
            </Text>
            {suffix ? ` ${suffix.trimStart()}` : ''}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Orb
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbOuterHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(205, 182, 233, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  orbOrbitRing1: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 99, 180, 0.45)',
  },
  orbOrbitRing2: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 255, 0, 0.65)',
  },
  orbSphere: {
    backgroundColor: '#282830',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#695297',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  orbCore: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    top: 20,
    left: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#D4FF00',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 18,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  orbitDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#D4FF00',
    top: 8,
    right: 18,
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

  // Card
  card: {
    borderRadius: 24,
    padding: 18,
    marginVertical: 6,
  },
  cardRaised: {
    backgroundColor: '#EBEBF0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 5, height: 6 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardInset: {
    backgroundColor: '#E2E2E6',
    borderWidth: 1,
    borderColor: 'rgba(30, 30, 38, 0.08)',
  },

  // Button
  buttonBase: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginVertical: 4,
  },
  buttonLime: {
    backgroundColor: '#D4FF00',
    borderWidth: 1,
    borderColor: '#EAFF7A',
    ...Platform.select({
      ios: {
        shadowColor: '#7D9600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  buttonInk: {
    backgroundColor: '#19191D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#19191D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  buttonLight: {
    backgroundColor: '#FAFBFD',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(25, 25, 29, 0.24)',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  buttonTextLime: {
    color: '#171717',
  },
  buttonTextInk: {
    color: '#FFFFFF',
  },
  buttonTextLight: {
    color: '#19191D',
  },
  buttonTextOutline: {
    color: '#19191D',
  },
  buttonTextDisabled: {
    color: '#777780',
  },
  arrowText: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Progress
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CDCED3',
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#19191D',
  },

  // TopBar
  topbar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FAFBFD',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  iconBtnPlaceholder: {
    width: 42,
    height: 42,
  },
  backIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#19191D',
    lineHeight: 26,
    marginTop: -2,
  },
  helpIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#19191D',
  },
  topLabelContainer: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: '#FAFBFD',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    maxWidth: 240,
    ...Platform.select({
      ios: {
        shadowColor: '#C9C9CE',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 7,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  topLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#19191D',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
