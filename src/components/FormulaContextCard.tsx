import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SentenceFormula } from '../types/formula';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface FormulaContextCardProps {
  formula: SentenceFormula;
  onClearContext?: () => void;
  onViewFormula?: () => void;
  isDark?: boolean;
}

export const FormulaContextCard: React.FC<FormulaContextCardProps> = ({
  formula,
  onClearContext,
  onViewFormula,
  isDark = false
}) => {
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <View style={styles.limeDot}>
            <Ionicons name="sparkles" size={10} color={colors.limeText} />
          </View>
          <Text style={[styles.contextTitle, isDark && styles.contextTitleDark]}>
            Studying Formula #{formula.id}
          </Text>
        </View>

        {onClearContext && (
          <TouchableOpacity onPress={onClearContext} style={styles.clearBtn} accessibilityLabel="Clear formula context">
            <Ionicons name="close" size={15} color={isDark ? colors.darkSecondaryText : colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onViewFormula} activeOpacity={0.8} style={styles.contentBox}>
        <Text style={[styles.formulaText, isDark && styles.formulaTextDark]} numberOfLines={1}>
          {formula.englishFormula}
        </Text>
        <Text style={[styles.hindiText, isDark && styles.hindiTextDark]} numberOfLines={1}>
          अर्थ: {formula.hindiMeaning}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    ...shadows.subtle
  },
  containerDark: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  contextTitleDark: {
    color: colors.foreground,
  },
  clearBtn: {
    padding: 4,
  },
  contentBox: {
    marginTop: 2,
  },
  formulaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: 18,
  },
  formulaTextDark: {
    color: colors.lime,
    fontWeight: '800',
  },
  hindiText: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 2,
  },
  hindiTextDark: {
    color: colors.textMuted2,
  },
});
