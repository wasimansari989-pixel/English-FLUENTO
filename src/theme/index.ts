import { Platform } from 'react-native';

/**
 * LinguaVerse PRO Design System (2026 Tokens)
 * Ultra-Premium Dark Glassmorphic + High-Contrast Neon Accents
 * Inspired by Apple Liquid Glass + Stripe 3D Cards + Duolingo Path Gamification
 */

export const colors = {
  // Reference-Style-Ultra-Premium Core Tokens
  canvas: '#000000',            // Full black canvas (#000000)
  canvasDark: '#000000',
  background: '#000000',        // Full pure pitch black background
  surfaceDark: '#1A1A1D',       // Light black card surface (#1A1A1D)
  surface: '#1A1A1D',           // Light black card surface (#1A1A1D)
  surfaceElevated: '#242428',   // Elevated controls & pills (#242428)
  surfaceElevatedHover: '#2E2E34',
  surfaceCard: '#1A1A1D',
  surfaceAlt: '#202024',
  surfaceRecessed: '#141416',

  // High-Contrast Light Panels
  surfaceLight: '#FFFFFF',      // Primary pure white card (#FFFFFF)
  surfaceLightSecondary: '#F0F0F0', // Secondary light surface / divider (#F0F0F0)
  whiteCard: '#FFFFFF',
  whiteCardDivider: '#F0F0F0',

  // Signature Accent Tokens
  lime: '#D4FF00',              // Reference neon-lime (#D4FF00)
  limeHover: '#C4EC00',
  limeDark: '#101400',
  limeText: '#0A0A0A',          // Contrast black text on lime
  limeSoft: 'rgba(212, 255, 0, 0.12)',
  limeBorder: 'rgba(212, 255, 0, 0.25)',
  limeGlow: 'rgba(212, 255, 0, 0.45)',

  lavender: '#C9A6D8',          // Reference lavender (#C9A6D8)
  lavenderLight: '#E8E0F0',     // Pale lavender (#E8E0F0)
  lavenderDark: '#A882B8',
  lavenderSoft: 'rgba(201, 166, 216, 0.15)',
  lavenderBorder: 'rgba(201, 166, 216, 0.30)',

  purpleAccent: '#8B7CF8',      // Reference purple glow/accent (#8B7CF8)
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleDark: '#6D28D9',
  purpleSoft: 'rgba(139, 124, 248, 0.16)',
  purpleBorder: 'rgba(139, 124, 248, 0.30)',

  // Matched-Language Highlighting (Target phrase matching across Hindi/English)
  matchedHighlight: '#FF3B30',  // Reference phrase-matching accent (#FF3B30)
  highlightRed: '#FF3B30',
  highlightRedBg: 'rgba(255, 59, 48, 0.16)',
  highlightRedUnderline: '#FF3B30',

  // Alert & Secondary Accents
  pink: '#FF5A8A',
  pinkSoft: 'rgba(255, 90, 138, 0.15)',
  orange: '#FF7A00',
  orangeSoft: 'rgba(255, 122, 0, 0.15)',
  green: '#22C55E',
  greenSoft: 'rgba(34, 197, 94, 0.15)',
  greenBorder: 'rgba(34, 197, 94, 0.40)',
  red: '#FF3B30',
  redSoft: 'rgba(255, 59, 48, 0.15)',
  redBorder: 'rgba(255, 59, 48, 0.40)',

  // Typography & Content Colors
  foreground: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8B9B',     // Reference subtext (#8B8B9B)
  textMuted: '#6B6B7A',        // Reference muted (#6B6B7A)
  textMuted2: '#6B6B7A',       // Reference secondary muted
  textDark: '#0A0A0A',
  textDarkSecondary: 'rgba(0, 0, 0, 0.60)',
  textDarkMuted: 'rgba(0, 0, 0, 0.40)',

  // Borders & Lines
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  innerBorder: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.08)',

  // Glassmorphic & Noise Layer Tokens
  glassWhite: 'rgba(255, 255, 255, 0.08)',
  glassWhiteSubtle: 'rgba(255, 255, 255, 0.04)',
  glassWhiteHover: 'rgba(255, 255, 255, 0.12)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
  glassBorderProminent: 'rgba(255, 255, 255, 0.16)',

  // Floating Dock & Capsule Navigation Tokens
  dockBg: '#0A0A0A',
  dockBorder: 'rgba(255, 255, 255, 0.12)',
  dockItemInactive: 'rgba(255, 255, 255, 0.40)',
  dockItemActive: '#FFFFFF',
  dockCenterBtn: '#D4FF00',
  dockCenterText: '#0A0A0A',

  // Backward Compatible Aliases
  cardLilac: '#C9A6D8',
  cardLilacText: '#0A0A0A',
  cardYellow: '#D4FF00',
  cardYellowText: '#0A0A0A',
  cardMint: '#22C55E',
  cardMintText: '#FFFFFF',
  cardOrange: '#FF7A00',
  cardOrangeText: '#FFFFFF',
  cardViolet: '#8B7CF8',
  cardVioletText: '#FFFFFF',
  cardDarkPill: '#0A0A0A',
  cardDarkPillText: '#D4FF00',
  bentoCanvas: '#0A0A0A',
  bentoCard: '#121212',
  bentoCardElevated: '#1E1E1E',
  cardBackground: '#121212',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  secondaryText: '#8B8B9B',
  tertiaryText: '#6B6B7A',
  darkSurface: '#0A0A0A',
  darkElevated: '#121212',
  darkCard: '#181818',
  darkBorder: 'rgba(255, 255, 255, 0.08)',
  darkText: '#FFFFFF',
  darkSecondaryText: '#8B8B9B',
  accentYellow: '#D4FF00',
  accentYellowSoft: 'rgba(212, 255, 0, 0.12)',
  accentPink: '#FF5A8A',
  accentPinkSoft: 'rgba(255, 90, 138, 0.15)',
  accentPeach: '#FF7A00',
  accentPeachSoft: 'rgba(255, 122, 0, 0.15)',
  accentLilac: '#C9A6D8',
  accentLilacSoft: 'rgba(201, 166, 216, 0.15)',
  accentMint: '#22C55E',
  accentMintSoft: 'rgba(34, 197, 94, 0.15)',
  trackDark: '#1E1E1E',
  orangeDark: '#2E150D',
  orangeText: '#FFFFFF',
  orangeHover: '#FF8A00',
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  error: '#FF3B30',
  errorBg: 'rgba(255, 59, 48, 0.15)',
  info: '#38BDF8',
  infoBg: 'rgba(56, 189, 248, 0.15)',
};

export const gradients = {
  purpleCore: ['#8B7CF8', '#7C3AED', '#6D28D9'] as const,
  limeSignal: ['#D4FF00', '#C4EC00', '#A3E635'] as const,
  lavenderGlow: ['#C9A6D8', '#A882B8'] as const,
  pinkPop: ['#FF5A8A', '#FB7185', '#F43F5E'] as const,
  avatarGradient: ['#8B7CF8', '#D4FF00'] as const,
  xpProgress: ['#8B7CF8', '#D4FF00'] as const,
  darkCard: ['#141414', '#101010'] as const,
  darkElevated: ['#222222', '#181818'] as const,
  whiteCard: ['#FEFEFE', '#FAFAFA'] as const,
  cardShine: ['rgba(255, 255, 255, 0.12)', 'transparent'] as const,
  hero: ['#1E1E1E', '#0A0A0A'] as const,
  orangeCard: ['#FF7A00', '#F43F5E'] as const,
  lilacCard: ['#C9A6D8', '#8B7CF8'] as const,
  yellowCard: ['#D4FF00', '#C4EC00'] as const,
  mintCard: ['#22C55E', '#16A34A'] as const,
  limeGlow: ['#D4FF00', '#A3E635'] as const,
  softSurface: ['#1A1A1A', '#121212'] as const,
};

export const typography = {
  // Reference-Style-Ultra-Premium Anton Editorial Typography
  antonHero: {
    fontFamily: Platform.select({
      ios: 'Anton',
      android: 'Anton',
      web: "'Anton', Impact, 'Arial Black', sans-serif",
      default: 'Anton',
    }),
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -1.0,
    textTransform: 'uppercase' as const,
    color: '#FFFFFF',
  },
  antonTitle: {
    fontFamily: Platform.select({
      ios: 'Anton',
      android: 'Anton',
      web: "'Anton', Impact, 'Arial Black', sans-serif",
      default: 'Anton',
    }),
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.8,
    textTransform: 'uppercase' as const,
    color: '#FFFFFF',
  },
  editorialQuote: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  displayLarge: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    color: colors.foreground
  },
  display: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: colors.foreground
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: colors.foreground
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.foreground
  },
  h3: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: colors.foreground
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.foreground
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700' as const,
    color: colors.foreground
  },
  formulaFormula: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700' as const,
    color: colors.foreground
  },
  formulaLarge: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
    color: '#D4FF00'
  },
  hindiLarge: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700' as const,
    color: colors.matchedHighlight
  },
  hindiBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.85)'
  },
  bodyLarge: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: colors.foreground
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    color: colors.foreground
  },
  bodySecondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: colors.textSecondary
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    color: colors.textMuted
  },
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const
  },
  micro: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const
  },
  button: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700' as const,
    color: colors.foreground
  },
  buttonSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    color: colors.foreground
  },
  // Legacy aliases
  editorialHero: {
    fontSize: 52,
    lineHeight: 48,
    fontWeight: '900' as const,
    letterSpacing: -1.5,
    textTransform: 'uppercase' as const,
    color: colors.foreground
  },
  editorialTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: colors.foreground
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 40
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  card: 32,                     // Reference R32 card border radius
  cardLg: 36,
  cardSm: 20,
  dock: 9999,                   // Reference rounded-full pill dock
  pill: 9999,
  full: 9999
};

export const shadows = {
  none: {},
  phoneShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: Platform.OS === 'android' ? 0 : 12,
  },
  whiteCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  pillShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: Platform.OS === 'android' ? 0 : 10,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: Platform.OS === 'android' ? 0 : 10,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  limeGlow: {
    shadowColor: '#D4FF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  limeGlowLg: {
    shadowColor: '#D4FF00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 0 : 10,
  },
  purpleGlow: {
    shadowColor: '#8B7CF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
  pinkGlow: {
    shadowColor: '#FF5A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 0 : 7,
  },
  flameGlow: {
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
};
