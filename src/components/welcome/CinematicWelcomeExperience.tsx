import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Animated,
  Easing,
  Platform,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MARUKUBO_WELCOME_HTML, WASII_ANIME_LOGO_HTML } from './welcomeHtml';

interface CinematicWelcomeExperienceProps {
  onComplete?: () => void;
}

/**
 * 2-Stage Cinematic Intro Animation Experience:
 * 1. Toshiya Marukubo's Welcome animation (CodePen dypmMQq)
 * 2. Julian Garnier's Anime.js line-drawing & fireworks logo animation with "WASII" (CodePen xOgyjB)
 *
 * Designed with preloaded dual-layer crossfade to completely eliminate any white/black blink
 * and automatic fallback timers so it NEVER freezes or hangs.
 */
export const CinematicWelcomeExperience: React.FC<CinematicWelcomeExperienceProps> = ({
  onComplete,
}) => {
  const [stage, setStage] = useState<'marukubo' | 'wasii' | 'done'>('marukubo');
  const [stage1Unmounted, setStage1Unmounted] = useState(false);

  const marukuboFade = useRef(new Animated.Value(1)).current;
  const exitFade = useRef(new Animated.Value(1)).current;
  const wasiiRef = useRef<any>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // Seamless crossfade transition from Marukubo Welcome -> Anime.js Logo
  const handleMarukuboFinished = useCallback(() => {
    if (stageRef.current !== 'marukubo') return;
    setStage('wasii');

    // Trigger Anime.js animation in Stage 2 instantly
    wasiiRef.current?.injectJavaScript(
      'window.playLetsStartAnimation && window.playLetsStartAnimation(); true;'
    );

    // Crossfade layer 1 to 0 over 320ms, revealing layer 2 underneath with zero blink
    Animated.timing(marukuboFade, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setStage1Unmounted(true);
    });
  }, [marukuboFade]);

  // Transition from Anime.js Logo -> Main App Onboarding
  const handleWasiiFinished = useCallback(() => {
    if (stageRef.current === 'done') return;
    setStage('done');

    Animated.timing(exitFade, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onComplete?.();
    });
  }, [exitFade, onComplete]);

  // Floating Skip button for instant bypass
  const handleSkipAll = useCallback(() => {
    if (stageRef.current === 'done') return;
    setStage('done');

    Animated.timing(exitFade, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onComplete?.();
    });
  }, [exitFade, onComplete]);

  // Safety Fallback Timers in React Native (Guarantees zero-freeze)
  useEffect(() => {
    // Stage 1 backup timer: auto advance after 2.8 seconds if not completed
    const timer1 = setTimeout(() => {
      if (stageRef.current === 'marukubo') {
        handleMarukuboFinished();
      }
    }, 2800);

    return () => clearTimeout(timer1);
  }, [handleMarukuboFinished]);

  useEffect(() => {
    if (stage === 'wasii') {
      // Stage 2 backup timer: auto finish after 3.2 seconds if not completed
      const timer2 = setTimeout(() => {
        if (stageRef.current === 'wasii') {
          handleWasiiFinished();
        }
      }, 3200);

      return () => clearTimeout(timer2);
    }
  }, [stage, handleWasiiFinished]);

  if (stage === 'done') {
    return null;
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          opacity: exitFade,
          backgroundColor: '#0F0F14',
        },
      ]}
      pointerEvents="auto"
    >
      {/* ========================================================================= */}
      {/* LAYER 1 (Behind): Stage 2 - Anime.js Let's Start Logo + Fireworks         */}
      {/* Preloaded and mounted immediately so DOM/JS is hot; revealed on crossfade */}
      {/* ========================================================================= */}
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={wasiiRef}
          originWhitelist={['*']}
          source={{ html: WASII_ANIME_LOGO_HTML }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          androidLayerType={Platform.OS === 'android' ? 'software' : undefined}
          onMessage={(event: any) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data && data.type === 'WASII_FINISHED') {
                handleWasiiFinished();
              }
            } catch (err) {
              // ignore non-JSON messages
            }
          }}
        />
      </View>

      {/* ========================================================================= */}
      {/* LAYER 2 (In Front): Stage 1 - Toshiya Marukubo's 3D Welcome Animation     */}
      {/* Fades out smoothly into Layer 1 with ZERO white/black flash or screen gap */}
      {/* ========================================================================= */}
      {!stage1Unmounted && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: marukuboFade,
              backgroundColor: '#FFFFFF',
            },
          ]}
        >
          <WebView
            originWhitelist={['*']}
            source={{ html: MARUKUBO_WELCOME_HTML }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            androidLayerType={Platform.OS === 'android' ? 'software' : undefined}
            onMessage={(event: any) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data && data.type === 'MARUKUBO_FINISHED') {
                  handleMarukuboFinished();
                }
              } catch (err) {
                // ignore non-JSON messages
              }
            }}
          />
        </Animated.View>
      )}

      {/* Floating Skip button for instant bypass */}
      <TouchableOpacity
        style={[
          styles.skipButton,
          {
            backgroundColor:
              stage === 'marukubo'
                ? 'rgba(0, 0, 0, 0.75)'
                : 'rgba(255, 255, 255, 0.25)',
          },
        ]}
        onPress={handleSkipAll}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.skipButtonText,
            { color: '#FFFFFF' },
          ]}
        >
          Skip ✕
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    elevation: 99999,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 54,
    right: 18,
    zIndex: 100000,
    elevation: 100000,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
