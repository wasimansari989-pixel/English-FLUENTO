import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmbossedHeroText } from './neumorphic/FluentComponents';

interface FormulaLabGlassDeckProps {
  onAddXp?: (amount: number) => void;
}

/**
 * FormulaLabGlassDeck
 * Elevated 3D Claymorphic Formula Card matching user-designed reference card:
 * - Removed static image file speak english 2.webp
 * - Renders pure white 3D embossed text "Show me to\n+ V1 + object" using EmbossedHeroText
 * - Recreates the complete native card layout: #1 badge, COMMON EXPRESSIONS,
 *   Hindi meaning (तो दिखा in purple), example box with purple left border,
 *   and progress bar with 1 / 600 counter.
 * - Tapping navigates to /formulas/1 (Formula Detail)
 * - Header pill navigates to /formulas (all 600 formulas)
 */
export const FormulaLabGlassDeck: React.FC<FormulaLabGlassDeckProps> = React.memo(({ onAddXp }) => {
  const router = useRouter();

  const handleCardPress = useCallback(() => {
    onAddXp?.(5);
    router.push('/formulas/1' as any);
  }, [router, onAddXp]);

  const handleExplorePress = useCallback(() => {
    router.push('/formulas' as any);
  }, [router]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="sparkles" size={16} color="#7C3AED" />
          <Text style={styles.sectionTitle}>600 Formula Lab</Text>
        </View>
        <TouchableOpacity
          style={styles.wordLabBadgePill}
          activeOpacity={0.75}
          onPress={handleExplorePress}
          accessibilityLabel="Explore 600 formulas"
        >
          <Text style={styles.wordLabBadgeText}>EXPLORE 600 FORMULAS</Text>
        </TouchableOpacity>
      </View>

      {/* Elevated 3D Formula Card — Native UI with White Embossed Text */}
      <View style={styles.cardContainer}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleCardPress}
          style={styles.cardTouchWrapper}
          accessibilityLabel="Formula 1: Show me to speak"
          accessibilityRole="button"
        >
          {/* 1. Header Row: #1 and Category */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardFormulaNumber}>#1</Text>
            <Text style={styles.cardCategoryText}>COMMON EXPRESSIONS</Text>
          </View>

          {/* 2. Main 3D Formula Text — Pure White Embossed */}
          <View style={styles.formulaWrapper}>
            <EmbossedHeroText
              text={'Show me to\n+ V1 + object'}
              fontSize={40}
              lineHeight={50}
              letterSpacing={-1.2}
              textAlign="left"
              containerStyle={styles.formulaTextContainer}
            />
          </View>

          {/* 3. Hindi Meaning Row */}
          <View style={styles.hindiRow}>
            <Text style={styles.hindiLabel}>हिंदी अर्थ:</Text>
            <Text style={styles.hindiValue}>तो दिखा</Text>
          </View>

          {/* 4. Example Box with Dedicated Purple Left Accent Bar */}
          <View style={styles.exampleBox}>
            <View style={styles.exampleAccentBar} />
            <View style={styles.exampleContent}>
              <Text style={styles.exampleEnglish}>"Show me to speak."</Text>
              <Text style={styles.exampleHindi}>बोलकर तो दिखा.</Text>
            </View>
          </View>

          {/* 5. Progress Row & Counter */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressCounter}>1 / 600</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

FormulaLabGlassDeck.displayName = 'FormulaLabGlassDeck';

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.3,
  },
  wordLabBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  wordLabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  cardContainer: {
    width: '100%',
    borderRadius: 36,
    backgroundColor: '#EBEBED',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 0 : 8,
    overflow: 'visible',
  },
  cardTouchWrapper: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  cardFormulaNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111114',
    letterSpacing: -0.5,
  },
  cardCategoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#55555E',
    letterSpacing: 1.4,
    marginLeft: 14,
    textTransform: 'uppercase',
  },
  formulaWrapper: {
    marginVertical: 4,
    overflow: 'visible',
  },
  formulaTextContainer: {
    marginVertical: 0,
    overflow: 'visible',
  },
  hindiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  hindiLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#26262B',
  },
  hindiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#7C3AED',
    marginLeft: 10,
  },
  exampleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
  },
  exampleAccentBar: {
    width: 4.5,
    alignSelf: 'stretch',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
    marginRight: 14,
  },
  exampleContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exampleEnglish: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111114',
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
  },
  exampleHindi: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#D1D5DB',
    borderRadius: 99,
    marginRight: 18,
    overflow: 'hidden',
  },
  progressFill: {
    width: '26%',
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 99,
  },
  progressCounter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.5,
  },
});

export default FormulaLabGlassDeck;
