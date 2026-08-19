import { ThemeMode } from '@/lib/types';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  subtitle: string;
  tagline: string;
  emoji: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    accent: string;
    glow: string;
    border: string;
  };
  shell: {
    bgGradient: string;
    sidebarBg: string;
    sidebarBorder: string;
    headerBg: string;
    headerBorder: string;
    activeNavBg: string;
    activeNavText: string;
    activeNavBorder: string;
    cardBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  };
  ambient: {
    rayColor: string;
    dotColor: string;
    mistEffect: string;
    rayCount: number;
    rayBlur: number;
    raySpeed: number;
  };
  preview: {
    gradient: string;
    accentColor: string;
    swatches: string[];
  };
}

export const NATURE_THEMES: Record<ThemeMode, ThemeConfig> = {
  ceylon_emerald: {
    id: 'ceylon_emerald',
    name: 'Ceylon Emerald',
    subtitle: 'Tea Estate & Misty Forest',
    tagline: 'Lush mountain tea hills, botanical rainforest greens & golden leaf warmth',
    emoji: '🌲',
    colors: {
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: 'rgba(16, 185, 129, 0.15)',
      accent: '#34d399',
      glow: 'rgba(16, 185, 129, 0.35)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    shell: {
      bgGradient: 'bg-gradient-to-br from-[#06140e] via-[#0b2118] to-[#040d09]',
      sidebarBg: 'bg-[#040e0a]',
      sidebarBorder: 'border-emerald-900/40',
      headerBg: 'bg-[#081a13]/90 backdrop-blur-md',
      headerBorder: 'border-emerald-900/30',
      activeNavBg: 'bg-emerald-950/70',
      activeNavText: 'text-emerald-400',
      activeNavBorder: 'border-emerald-500',
      cardBg: 'bg-[#0b1f17]/80',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-800/50',
    },
    ambient: {
      rayColor: 'rgba(16, 185, 129, 0.22)',
      dotColor: 'rgba(52, 211, 153, 0.18)',
      mistEffect: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15), transparent 70%)',
      rayCount: 6,
      rayBlur: 45,
      raySpeed: 14,
    },
    preview: {
      gradient: 'from-emerald-950 via-emerald-900 to-slate-950',
      accentColor: '#10b981',
      swatches: ['#06140e', '#0b2118', '#10b981', '#34d399', '#fcd34d'],
    },
  },

  ella_mist: {
    id: 'ella_mist',
    name: 'Ella Mountain Mist',
    subtitle: 'Cloud Peaks & Granite Stone',
    tagline: 'High-altitude mountain fog, alpine slate peaks & silver stone serenity',
    emoji: '⛰️',
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryLight: 'rgba(14, 165, 233, 0.15)',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.35)',
      border: 'rgba(56, 189, 248, 0.25)',
    },
    shell: {
      bgGradient: 'bg-gradient-to-br from-[#0a121c] via-[#101c2c] to-[#060b12]',
      sidebarBg: 'bg-[#070d14]',
      sidebarBorder: 'border-sky-950/60',
      headerBg: 'bg-[#0c1624]/90 backdrop-blur-md',
      headerBorder: 'border-sky-950/50',
      activeNavBg: 'bg-sky-950/70',
      activeNavText: 'text-sky-400',
      activeNavBorder: 'border-sky-400',
      cardBg: 'bg-[#0f1b2b]/80',
      badgeBg: 'bg-sky-950/80',
      badgeText: 'text-sky-300',
      badgeBorder: 'border-sky-800/50',
    },
    ambient: {
      rayColor: 'rgba(56, 189, 248, 0.20)',
      dotColor: 'rgba(125, 211, 252, 0.16)',
      mistEffect: 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.14), transparent 75%)',
      rayCount: 7,
      rayBlur: 50,
      raySpeed: 18,
    },
    preview: {
      gradient: 'from-slate-950 via-sky-950 to-slate-900',
      accentColor: '#38bdf8',
      swatches: ['#0a121c', '#101c2c', '#0ea5e9', '#38bdf8', '#e2e8f0'],
    },
  },

  golden_sunset: {
    id: 'golden_sunset',
    name: 'Golden Sunset',
    subtitle: 'Highland Sunrise & Teak Wood',
    tagline: 'Warm golden amber hour, rich Ceylon teak timber & sunburst radiance',
    emoji: '🌅',
    colors: {
      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryLight: 'rgba(245, 158, 11, 0.15)',
      accent: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.35)',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    shell: {
      bgGradient: 'bg-gradient-to-br from-[#160c06] via-[#241309] to-[#0d0703]',
      sidebarBg: 'bg-[#0f0703]',
      sidebarBorder: 'border-amber-950/60',
      headerBg: 'bg-[#1a0e07]/90 backdrop-blur-md',
      headerBorder: 'border-amber-950/50',
      activeNavBg: 'bg-amber-950/70',
      activeNavText: 'text-amber-400',
      activeNavBorder: 'border-amber-500',
      cardBg: 'bg-[#201007]/80',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-800/50',
    },
    ambient: {
      rayColor: 'rgba(245, 158, 11, 0.24)',
      dotColor: 'rgba(251, 191, 36, 0.20)',
      mistEffect: 'radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.18), transparent 70%)',
      rayCount: 6,
      rayBlur: 40,
      raySpeed: 12,
    },
    preview: {
      gradient: 'from-amber-950 via-amber-900 to-stone-950',
      accentColor: '#f59e0b',
      swatches: ['#160c06', '#241309', '#f59e0b', '#fbbf24', '#fef3c7'],
    },
  },

  coastal_azure: {
    id: 'coastal_azure',
    name: 'Coastal Azure',
    subtitle: 'Bentota Ocean & Marine Wave',
    tagline: 'Deep Indian Ocean turquoise, marine tide ripples & calming sea breeze',
    emoji: '🌊',
    colors: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      primaryLight: 'rgba(6, 182, 212, 0.15)',
      accent: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.35)',
      border: 'rgba(6, 182, 212, 0.25)',
    },
    shell: {
      bgGradient: 'bg-gradient-to-br from-[#041420] via-[#082236] to-[#020b12]',
      sidebarBg: 'bg-[#030e17]',
      sidebarBorder: 'border-cyan-950/60',
      headerBg: 'bg-[#071c2c]/90 backdrop-blur-md',
      headerBorder: 'border-cyan-950/50',
      activeNavBg: 'bg-cyan-950/70',
      activeNavText: 'text-cyan-400',
      activeNavBorder: 'border-cyan-400',
      cardBg: 'bg-[#0a273d]/80',
      badgeBg: 'bg-cyan-950/80',
      badgeText: 'text-cyan-300',
      badgeBorder: 'border-cyan-800/50',
    },
    ambient: {
      rayColor: 'rgba(6, 182, 212, 0.22)',
      dotColor: 'rgba(34, 211, 238, 0.18)',
      mistEffect: 'radial-gradient(circle at 50% 25%, rgba(6, 182, 212, 0.16), transparent 72%)',
      rayCount: 7,
      rayBlur: 48,
      raySpeed: 15,
    },
    preview: {
      gradient: 'from-cyan-950 via-cyan-900 to-slate-950',
      accentColor: '#06b6d4',
      swatches: ['#041420', '#082236', '#06b6d4', '#22d3ee', '#cffafe'],
    },
  },

  midnight_obsidian: {
    id: 'midnight_obsidian',
    name: 'Midnight Obsidian',
    subtitle: 'Starry Sky & Royal Gold Crest',
    tagline: 'Velvet celestial obsidian, starry constellation dust & royal gold luxury',
    emoji: '🌌',
    colors: {
      primary: '#c4a35a',
      primaryHover: '#b59346',
      primaryLight: 'rgba(196, 163, 90, 0.15)',
      accent: '#dfc682',
      glow: 'rgba(196, 163, 90, 0.35)',
      border: 'rgba(196, 163, 90, 0.25)',
    },
    shell: {
      bgGradient: 'bg-gradient-to-br from-[#080c14] via-[#0f1726] to-[#04060a]',
      sidebarBg: 'bg-[#060910]',
      sidebarBorder: 'border-slate-800/60',
      headerBg: 'bg-[#0c1320]/90 backdrop-blur-md',
      headerBorder: 'border-slate-800/50',
      activeNavBg: 'bg-slate-850',
      activeNavText: 'text-amber-300',
      activeNavBorder: 'border-amber-400',
      cardBg: 'bg-[#121c2e]/80',
      badgeBg: 'bg-amber-950/60',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-800/40',
    },
    ambient: {
      rayColor: 'rgba(196, 163, 90, 0.24)',
      dotColor: 'rgba(223, 198, 130, 0.20)',
      mistEffect: 'radial-gradient(circle at 50% 25%, rgba(196, 163, 90, 0.16), transparent 75%)',
      rayCount: 6,
      rayBlur: 42,
      raySpeed: 16,
    },
    preview: {
      gradient: 'from-slate-950 via-slate-900 to-black',
      accentColor: '#c4a35a',
      swatches: ['#080c14', '#0f1726', '#c4a35a', '#dfc682', '#fef9c3'],
    },
  },
};

export const DEFAULT_THEME_ID: ThemeMode = 'ceylon_emerald';

export function getThemeConfig(themeId?: string | null): ThemeConfig {
  if (themeId && themeId in NATURE_THEMES) {
    return NATURE_THEMES[themeId as ThemeMode];
  }
  return NATURE_THEMES[DEFAULT_THEME_ID];
}
