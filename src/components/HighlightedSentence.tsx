import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, View, Platform } from 'react-native';
import { SentenceSegment } from '../types/formula';
import { colors, radii } from '../theme';

interface HighlightedSentenceProps {
  segments?: SentenceSegment[];
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isHindi?: boolean;
  style?: StyleProp<TextStyle>;
  isDark?: boolean;
}

export const HighlightedSentence: React.FC<HighlightedSentenceProps> = React.memo(({
  segments,
  fallbackText = '',
  size = 'md',
  isHindi = false,
  style,
  isDark = false
}) => {
  // If no segments provided or empty, render fallback text
  if (!segments || segments.length === 0) {
    return (
      <Text
        style={[
          styles.baseText,
          styles[size],
          isHindi ? styles.hindiFont : styles.englishFont,
          isDark ? styles.darkText : styles.lightText,
          style
        ]}
        accessibilityRole="text"
      >
        {fallbackText}
      </Text>
    );
  }

  const fullSentence = segments.map((s) => s.text).join('');

  return (
    <Text
      style={[
        styles.baseText,
        styles[size],
        isHindi ? styles.hindiFont : styles.englishFont,
        isDark ? styles.darkText : styles.lightText,
        style
      ]}
      accessibilityRole="text"
      accessibilityLabel={fullSentence}
    >
      {segments.map((segment, index) => {
        if (segment.highlight) {
          return (
            <Text
              key={`${index}-${segment.text}`}
              style={[
                styles.highlightedText,
                isDark && (isHindi ? styles.highlightedTextDarkHindi : styles.highlightedTextDark),
              ]}
            >
              {segment.text}
            </Text>
          );
        }
        return (
          <Text key={`${index}-${segment.text}`}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
});

HighlightedSentence.displayName = 'HighlightedSentence';

export const HighlightLegend: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => {
  return (
    <View style={[styles.legendContainer, isDark && styles.legendContainerDark]}>
      <View style={styles.legendItem}>
        <View style={styles.legendColorBoxCoral} />
        <Text style={[styles.legendLabel, isDark && styles.legendLabelDark]}>
          <Text style={styles.legendCoralText}>Coral Tag</Text> = English Formula Pattern
        </Text>
      </View>
      <View style={styles.legendItem}>
        <View style={styles.legendColorBoxGold} />
        <Text style={[styles.legendLabel, isDark && styles.legendLabelDark]}>
          <Text style={styles.legendGoldText}>Gold Tag</Text> = Hindi Corresponding Meaning
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  baseText: {
    lineHeight: 24,
  },
  sm: {
    fontSize: 14,
    lineHeight: 22,
  },
  md: {
    fontSize: 15,
    lineHeight: 24,
  },
  lg: {
    fontSize: 17,
    lineHeight: 26,
  },
  xl: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
  },
  englishFont: {
    letterSpacing: -0.2,
    fontWeight: '600',
  },
  hindiFont: {
    letterSpacing: 0,
    lineHeight: 24,
    fontWeight: '500',
  },
  lightText: {
    color: '#1E293B',
  },
  darkText: {
    color: '#F8FAFC',
  },
  highlightedText: {
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.14)',
    fontWeight: '800',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  highlightedTextDark: {
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.20)',
    borderRadius: 4,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
  highlightedTextDarkHindi: {
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.20)',
    borderRadius: 4,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
  legendContainer: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 10,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  legendContainerDark: {
    backgroundColor: '#121212',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorBoxCoral: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  legendColorBoxGold: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  legendLabelDark: {
    color: '#8B8B9B',
  },
  legendCoralText: {
    color: '#FF3B30',
    fontWeight: '800',
  },
  legendGoldText: {
    color: '#D4FF00',
    fontWeight: '700',
  },
});
