/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NaturalThemeId = 'highlands' | 'midnight' | 'sunrise' | 'rainforest' | 'cloudmist';

export interface NaturalThemeConfig {
  id: NaturalThemeId;
  name: string;
  subtitle: string;
  tagline: string;
  badge: string;
  emoji: string;
  primaryColor: string;
  accentColor: string;
  previewBg: string;
  swatches: [string, string, string, string];
  lightRayColor: string;
  dotPatternColor: string;
  bgGradient: string;
  cssVariables: Record<string, string>;
}

export const NATURAL_THEMES: Record<NaturalThemeId, NaturalThemeConfig> = {
  highlands: {
    id: 'highlands',
    name: 'Misty Highlands',
    subtitle: 'Hatton Tea Estate & Pine Mountains',
    tagline: 'Lush emerald green tea hills enveloped in soft mountain mist and Ceylon gold.',
    badge: 'Hatton Signature',
    emoji: '🏔️',
    primaryColor: '#10b981',
    accentColor: '#d4af37',
    previewBg: 'from-emerald-950 via-teal-950 to-slate-950',
    swatches: ['#04140b', '#0a1f14', '#10b981', '#d4af37'],
    lightRayColor: 'rgba(16, 185, 129, 0.28)',
    dotPatternColor: 'rgba(212, 175, 55, 0.24)',
    bgGradient: `
      radial-gradient(90% 60% at 10% 0%, rgba(14, 83, 45, 0.50) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(8, 40, 24, 0.40) 0%, transparent 50%),
      linear-gradient(165deg, #04140b 0%, #0a1f14 42%, #041009 100%)
    `,
    cssVariables: {
      '--ink': '#04140b',
      '--ink-soft': '#0d281a',
      '--navy': '#0c3823',
      '--forest': '#10b981',
      '--linen': '#f0fdf4',
      '--linen-soft': '#dcfce7',
      '--ivory': '#f4fbf7',
      '--champagne': '#d4af37',
      '--champagne-soft': 'rgba(212, 175, 55, 0.20)',
      '--champagne-line': 'rgba(212, 175, 55, 0.50)',
      '--text': '#f0fdf4',
      '--text-muted': 'rgba(240, 253, 244, 0.68)',
      '--text-faint': 'rgba(240, 253, 244, 0.45)',
      '--card': 'rgba(240, 253, 244, 0.06)',
      '--card-border': 'rgba(16, 185, 129, 0.18)',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Starlight',
    subtitle: 'Royal Ceylon Night Sky',
    tagline: 'Deep midnight obsidian constellation sky with warm celestial champagne gold.',
    badge: 'Classic Luxury',
    emoji: '🌌',
    primaryColor: '#6366f1',
    accentColor: '#c4a35a',
    previewBg: 'from-slate-950 via-indigo-950 to-slate-900',
    swatches: ['#05070d', '#0a0e18', '#1e2460', '#c4a35a'],
    lightRayColor: 'rgba(196, 163, 90, 0.26)',
    dotPatternColor: 'rgba(196, 163, 90, 0.22)',
    bgGradient: `
      radial-gradient(90% 60% at 10% 0%, rgba(18, 22, 48, 0.55) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(30, 36, 96, 0.35) 0%, transparent 50%),
      linear-gradient(165deg, #05070d 0%, #0a0e18 42%, #070c0a 100%)
    `,
    cssVariables: {
      '--ink': '#0e1524',
      '--ink-soft': '#182338',
      '--navy': '#1E2460',
      '--forest': '#0E8345',
      '--linen': '#f3efe6',
      '--linen-soft': '#e8e2d6',
      '--ivory': '#faf7f1',
      '--champagne': '#c4a35a',
      '--champagne-soft': 'rgba(196, 163, 90, 0.18)',
      '--champagne-line': 'rgba(196, 163, 90, 0.45)',
      '--text': '#f3efe6',
      '--text-muted': 'rgba(243, 239, 230, 0.62)',
      '--text-faint': 'rgba(243, 239, 230, 0.42)',
      '--card': 'rgba(250, 247, 241, 0.055)',
      '--card-border': 'rgba(243, 239, 230, 0.1)',
    },
  },

  sunrise: {
    id: 'sunrise',
    name: 'Golden Sunrise',
    subtitle: "Adam's Peak Dawn Radiance",
    tagline: 'Warm amber sunrise over mountain horizons with rich cinnamon wood accents.',
    badge: 'Warm & Inviting',
    emoji: '🌅',
    primaryColor: '#f59e0b',
    accentColor: '#fbbf24',
    previewBg: 'from-amber-950 via-orange-950 to-stone-950',
    swatches: ['#140b05', '#1f1208', '#d97706', '#fbbf24'],
    lightRayColor: 'rgba(245, 158, 11, 0.32)',
    dotPatternColor: 'rgba(251, 191, 36, 0.25)',
    bgGradient: `
      radial-gradient(90% 60% at 10% 0%, rgba(180, 83, 9, 0.45) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(217, 119, 6, 0.30) 0%, transparent 50%),
      linear-gradient(165deg, #140b05 0%, #221408 42%, #0e0703 100%)
    `,
    cssVariables: {
      '--ink': '#140b05',
      '--ink-soft': '#28170c',
      '--navy': '#451a03',
      '--forest': '#b45309',
      '--linen': '#fffbeb',
      '--linen-soft': '#fef3c7',
      '--ivory': '#fffdf5',
      '--champagne': '#f59e0b',
      '--champagne-soft': 'rgba(245, 158, 11, 0.22)',
      '--champagne-line': 'rgba(251, 191, 36, 0.50)',
      '--text': '#fffbeb',
      '--text-muted': 'rgba(254, 243, 199, 0.70)',
      '--text-faint': 'rgba(254, 243, 199, 0.45)',
      '--card': 'rgba(255, 251, 235, 0.06)',
      '--card-border': 'rgba(245, 158, 11, 0.18)',
    },
  },

  rainforest: {
    id: 'rainforest',
    name: 'Tropical Rainforest',
    subtitle: 'Sinharaja Jade Canopy',
    tagline: 'Deep botanical jade & crystal waterfall teal inspired by virgin rainforests.',
    badge: 'Botanical Harmony',
    emoji: '🍃',
    primaryColor: '#14b8a6',
    accentColor: '#34d399',
    previewBg: 'from-teal-950 via-emerald-950 to-slate-950',
    swatches: ['#041414', '#062222', '#0d9488', '#34d399'],
    lightRayColor: 'rgba(20, 184, 166, 0.28)',
    dotPatternColor: 'rgba(52, 211, 153, 0.22)',
    bgGradient: `
      radial-gradient(90% 60% at 10% 0%, rgba(13, 148, 136, 0.50) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(6, 78, 59, 0.40) 0%, transparent 50%),
      linear-gradient(165deg, #041414 0%, #082626 42%, #031212 100%)
    `,
    cssVariables: {
      '--ink': '#041414',
      '--ink-soft': '#0b2b2b',
      '--navy': '#042f2e',
      '--forest': '#0d9488',
      '--linen': '#f0fdfa',
      '--linen-soft': '#ccfbf1',
      '--ivory': '#f5fdfc',
      '--champagne': '#14b8a6',
      '--champagne-soft': 'rgba(20, 184, 166, 0.20)',
      '--champagne-line': 'rgba(52, 211, 153, 0.50)',
      '--text': '#f0fdfa',
      '--text-muted': 'rgba(240, 253, 250, 0.68)',
      '--text-faint': 'rgba(240, 253, 250, 0.45)',
      '--card': 'rgba(240, 253, 250, 0.06)',
      '--card-border': 'rgba(20, 184, 166, 0.18)',
    },
  },

  cloudmist: {
    id: 'cloudmist',
    name: 'Cloud Mist & Slate',
    subtitle: 'Highland Peak Cloud Mist',
    tagline: 'Serene mountain cloud cover with silver-sage slate and sapphire frost glow.',
    badge: 'Pure Serenity',
    emoji: '🌫️',
    primaryColor: '#60a5fa',
    accentColor: '#e2e8f0',
    previewBg: 'from-slate-950 via-slate-900 to-sky-950',
    swatches: ['#0b0f17', '#131b28', '#334155', '#60a5fa'],
    lightRayColor: 'rgba(226, 232, 240, 0.24)',
    dotPatternColor: 'rgba(96, 165, 250, 0.22)',
    bgGradient: `
      radial-gradient(90% 60% at 10% 0%, rgba(71, 85, 105, 0.45) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(30, 58, 138, 0.30) 0%, transparent 50%),
      linear-gradient(165deg, #0b0f17 0%, #131b28 42%, #0e141f 100%)
    `,
    cssVariables: {
      '--ink': '#0b0f17',
      '--ink-soft': '#192233',
      '--navy': '#1e293b',
      '--forest': '#0284c7',
      '--linen': '#f8fafc',
      '--linen-soft': '#e2e8f0',
      '--ivory': '#fcfdff',
      '--champagne': '#60a5fa',
      '--champagne-soft': 'rgba(96, 165, 250, 0.20)',
      '--champagne-line': 'rgba(226, 232, 240, 0.50)',
      '--text': '#f8fafc',
      '--text-muted': 'rgba(248, 250, 252, 0.70)',
      '--text-faint': 'rgba(248, 250, 252, 0.45)',
      '--card': 'rgba(248, 250, 252, 0.06)',
      '--card-border': 'rgba(96, 165, 250, 0.18)',
    },
  },
};

export const DEFAULT_THEME_ID: NaturalThemeId = 'highlands';

export function getThemeConfig(themeId?: string): NaturalThemeConfig {
  if (themeId && themeId in NATURAL_THEMES) {
    return NATURAL_THEMES[themeId as NaturalThemeId];
  }
  return NATURAL_THEMES[DEFAULT_THEME_ID];
}
