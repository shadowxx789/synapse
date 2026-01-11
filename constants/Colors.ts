// Design System Constants for Synapse App
// Following PRD UI/UX Guidelines: 活力橙、治愈蓝、高对比度

export const Colors = {
  // Primary Colors - 活力调性
  primary: '#FF6B35',      // 活力橙 - Main action color
  secondary: '#4ECDC4',    // 治愈蓝 - Calm/support color
  primaryGlow: 'rgba(255, 107, 53, 0.2)',   // Primary with transparency
  secondaryGlow: 'rgba(78, 205, 196, 0.2)', // Secondary with transparency

  // Timer Colors - Visual Sandbox
  timerSafe: '#2ECC71',    // 绿色 - 时间充足
  timerWarning: '#F1C40F', // 黄色 - 时间过半
  timerUrgent: '#E74C3C',  // 红色 - 紧急

  // Background
  background: '#0D1117',   // Dark mode background
  surface: '#161B22',      // Card/Surface background
  surfaceElevated: '#21262D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8B949E',
  textMuted: '#484F58',

  // Status
  success: '#2ECC71',
  warning: '#F1C40F',
  error: '#E74C3C',

  // Energy Bank
  energyGlow: '#FFD700',   // Gold for energy points

  // Executor/Supporter themes
  executor: {
    primary: '#FF6B35',
    accent: '#FF8C61',
    glow: 'rgba(255, 107, 53, 0.3)',
  },
  supporter: {
    primary: '#4ECDC4',
    accent: '#7EDDD6',
    glow: 'rgba(78, 205, 196, 0.3)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Haptic patterns for different actions
export const HapticPatterns = {
  taskComplete: 'heavy',
  subtaskComplete: 'medium',
  timerWarning: 'light',
  buttonPress: 'light',
} as const;

// Animation durations
export const Animations = {
  fast: 150,
  medium: 300,
  slow: 500,
  timer: 1000,
};

// Legacy compatibility for existing components
const LegacyColors = {
  light: {
    text: '#000',
    background: '#fff',
    tint: Colors.primary,
    tabIconDefault: '#ccc',
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.primary,
  },
};

export default LegacyColors;
