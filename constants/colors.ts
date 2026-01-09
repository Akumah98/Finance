// Modern Premium Color Palette (2025 Fintech Vibes)
export const colors = {
  // Background and surface colors
  bg: '#0F0F1A',           // Deep space navy
  surface: 'rgba(20, 20, 40, 0.7)',
  card: 'rgba(30, 30, 70, 0.6)',
  glass: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(120, 120, 255, 0.2)',

  // Brand colors
  primary: '#6D28D9',       // Rich purple
  gradient1: '#8B5CF6',     // Purple
  gradient2: '#3B82F6',     // Blue
  gradient3: '#10B981',     // Emerald
  accent: '#F59E0B',        // Amber glow
  
  // Status colors
  success: '#10B981',
  danger: '#EF4444',
  
  // Text colors
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  
  // Legacy colors (kept for backward compatibility)

} as const;

export type Colors = typeof colors;
