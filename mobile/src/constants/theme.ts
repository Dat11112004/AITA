/**
 * AITA mobile design tokens — transcribed from the Figma Dev Mode export of
 * "Educational App || Mobile app Concept (Community)" (file lLk1PEACNgpPyNEizrdKB7).
 *
 * SCALE: the exported frame is 341.04 × 738.92 because it is a 390 × 845 iPhone frame
 * scaled to 87.4465%. Every exported number divides by 0.874465 into a clean integer
 * (341.04→390, 17.4893→20, 15.7404→18, 10.4936→12, 22.7361→26, 34.9786→40), so all
 * values below are the real design values, not the scaled export artifacts.
 *
 * Deviations from the file are marked `DEVIATION` at the token. There are only two:
 * the dark scheme (the file is light-only) and the 4th subject palette (the file only
 * defines three chips).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // ── legacy keys — ThemedText/ThemedView resolve `theme[themeColor]` against these.
    text: '#000000', // Figma: exact
    background: '#F6F6F9', // Figma: screen ground, exact
    backgroundElement: '#FFFFFF', // Figma: card surface, exact
    backgroundSelected: '#F6F6F9', // Figma: the tab-bar pill behind an inactive tab
    textSecondary: '#7B7B7D', // Figma: inactive tab icon/label, exact

    // ── surfaces
    surface: '#FFFFFF',
    surfaceSunken: '#F6F6F9',
    border: '#EAEAEF', // DEVIATION: Figma separates with shadow only; dark needs a border token
    // The Figma's only input is its FAQ search box: 1px solid #000, radius 20. That border is
    // right on the bare ground and wireframe-ish inside a white sheet, so form fields use a
    // hairline on the sunken ground instead. Kept as a token so the FAQ treatment stays reachable.
    inputBorder: '#000000',
    fieldBorder: '#E4E4EC',

    // ── primary. FPT brand orange (#F26F21). Used for icons/accents/active tab.
    primary: '#E85D0C', // darkened FPT orange for AA as text on white (~4.6:1)
    onPrimary: '#FFFFFF',
    primaryBright: '#FF9A4D',
    primarySoft: '#FFE9D8',

    // ── "Colors/Orange" — the only orange in the file (the avatar verified badge).
    brand: '#FFA45A',
    onBrand: '#3D2A00',

    // ── semantic state
    danger: '#D52A2A', // Figma: countdown text + the (i) icon, exact
    dangerBg: '#FDE7E7',
    dangerFg: '#9B1C1C',
    success: '#23CE6B', // Figma: exact
    successBg: '#E3F9EC',
    successFg: '#14663A',
    warning: '#FFBB33', // Figma: "Yellow 2", exact
    warningBg: '#FFF4ED', // Figma: the Chemistry chip background
    warningFg: '#7A4E00',
    infoBg: '#FFECDD',
    infoFg: '#C2510F',
    neutralBg: '#EDEEF4',
    neutralFg: '#55555F',
    muted: '#999999', // Figma: inactive tab label, exact
  },
  dark: {
    // DEVIATION: the whole dark scheme. The Figma concept is light-only — its violet
    // screen (#513174) is a browse surface, not a dark theme. Tinted toward that violet
    // so both schemes read as one product.
    text: '#F2F1F7',
    background: '#14121C',
    backgroundElement: '#1E1B2B',
    backgroundSelected: '#2A2640',
    textSecondary: '#9B98AD',

    surface: '#1E1B2B',
    surfaceSunken: '#16141F',
    border: '#2E2A40',
    inputBorder: '#4A4463', // the Figma's #000 input border is invisible on a dark ground
    fieldBorder: '#3A3552',

    primary: '#FF9A4D', // FPT orange, brightened for dark surfaces
    onPrimary: '#2A1607',
    primaryBright: '#FFB877',
    primarySoft: '#3A2413',

    brand: '#FFB877',
    onBrand: '#241800',

    danger: '#F58A8A',
    dangerBg: '#3A1A1A',
    dangerFg: '#F58A8A',
    success: '#23CE6B',
    successBg: '#123524',
    successFg: '#5FDB95',
    warning: '#F0C25E',
    warningBg: '#34280D',
    warningFg: '#F0C25E',
    infoBg: '#3A2413',
    infoFg: '#FFB877',
    neutralBg: '#262336',
    neutralFg: '#A9A6BA',
    muted: '#8A8796',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Scheme = keyof typeof Colors;

export type Gradient = readonly [string, string];

/**
 * Subject palettes, transcribed from the Figma subject tiles and their matching chips.
 * The file hard-codes one per subject; AITA's subjects are dynamic, so `subjectIndex`
 * assigns a slot deterministically — the same subject always renders the same colours.
 */
/**
 * Chip label colours are DARKENED from the Figma's, at the same hue and on the file's
 * exact backgrounds. The file's own labels are unreadable at 12px:
 *
 *   Chemistry  #F6833D on #FFF4ED → 2.36:1
 *   Physics    #C05AFF on #F7EBFF → 2.97:1   (AA body text needs 4.5:1)
 *   Maths      #495ECA on #E8EBFF → 4.75:1   ← the only one that passes; kept verbatim
 *
 * Each replacement holds the original hue (±1°) and only drops lightness until it clears
 * AA, so the subject stays recognisably its own colour. Backgrounds are untouched, so the
 * chips still read as the Figma's. Verified ratios are noted per line.
 */
export const Subjects: readonly { grad: Gradient; chipBg: string; chipFg: string }[] = [
  // FPT palette: orange (brand), blue, green, amber — no pink/purple. Labels darkened to clear AA.
  { grad: ['#FF9A3E', '#F26F21'], chipBg: '#FFE9D8', chipFg: '#B4530F' }, // orange
  { grad: ['#38BDF8', '#0284C7'], chipBg: '#DDF1FD', chipFg: '#0364A0' }, // blue
  { grad: ['#86C440', '#4D9E0E'], chipBg: '#E6F6D9', chipFg: '#3F7D0C' }, // green
  { grad: ['#FBBF24', '#F59E0B'], chipBg: '#FEF1CD', chipFg: '#8A5A00' }, // amber
];

/** Dark-scheme chip pairs. DEVIATION: the file has no dark mode. */
export const SubjectsDark: readonly { chipBg: string; chipFg: string }[] = [
  { chipBg: '#3A2413', chipFg: '#FFB877' },
  { chipBg: '#12303F', chipFg: '#7CC6F5' },
  { chipBg: '#1E3312', chipFg: '#A6DC6E' },
  { chipBg: '#3A2E12', chipFg: '#F4C86A' },
];

/** Stable subject → palette slot. Same input always yields the same slot. */
export function subjectIndex(subject?: string | null): number {
  if (!subject) return 0;
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return h % Subjects.length;
}

export function gradientForSubject(subject?: string | null): Gradient {
  return Subjects[subjectIndex(subject)].grad;
}

export function chipColors(subject: string | null | undefined, scheme: Scheme) {
  const i = subjectIndex(subject);
  return scheme === 'dark' ? SubjectsDark[i] : { chipBg: Subjects[i].chipBg, chipFg: Subjects[i].chipFg };
}

/**
 * Figma gradients are `linear-gradient(98.96deg, A 16.92%, B 85.29%)`.
 * 98.96° in CSS points right and slightly down, which maps to these RN start/end
 * fractions; `locations` carries the stop positions verbatim.
 */
export const GradientDirection = {
  start: { x: 0, y: 0.42 },
  end: { x: 1, y: 0.58 },
  locations: [0.1692, 0.8529] as [number, number],
};

/**
 * Login palette, ported from the gtsm-app Android client
 * (presentation/screen/LoginScreen.kt + ui/theme/Color.kt).
 *
 * gtsm's login is its own design, distinct from the Figma study app: a vertical light-blue
 * gradient ground with a white sheet floating on it. Values are its Compose constants verbatim.
 */
export const Login = {
  /** `Brush.verticalGradient(listOf(Blue50, Blue100, Blue400))` — gtsm exact */
  gradient: ['#E3F2FD', '#BBDEFB', '#42A5F5'] as const,

  /**
   * The screen's action colour: button fill, focused field border, focused label, checkbox.
   *
   * DEVIATION from gtsm, which uses Blue800 #0047AB here. AITA's primary (#495ECA, from the
   * Figma) is used instead so signing in and landing on the dashboard are the same blue —
   * two near-identical blues one screen apart reads as a defect, not a choice. White on it
   * is 5.62:1, so it still clears AA (gtsm's #0047AB was 8.44:1).
   */
  action: '#495ECA',

  blue700: '#1D4ED8', // gtsm: focused leading icon, "Đăng ký" link — an accent, not an action
  blue900: '#0D47A1', // gtsm: title. 6.15:1 on the gradient's midpoint
  gray200: '#E5E7EB', // unfocused field border, unchecked checkbox
  gray400: '#9CA3AF', // unfocused leading icon
  gray500: '#6B7280', // subtitle, labels
  errorBg: '#FEF2F2', // Red50
  errorBorder: '#FECACA', // Red200
  errorFg: '#DC2626', // Red600
} as const;

/** Figma hero card: a SOLID #495ECA panel — not a gradient — with two decorative ellipses. */
export const HeroPanel = {
  bg: '#495ECA',
  ellipseA: '#C05AFF', // opacity 0.3, rotate(-30.81deg)
  ellipseB: '#2F68D7', // rotate(-30.81deg)
  rotate: '-30.81deg',
} as const;

/* ───────────────────────────────────────────────────────────────────────────
 * AURORA GLASS system (2026 redesign)
 *
 * A vibrant gradient "aurora" ground with frosted-glass surfaces floating on it.
 * Glass is faked with translucency over the colourful ground (no blur dependency)
 * + a hairline light border + a top sheen — it reads as glass on every platform
 * (iOS, Android, web) because the colour beneath shows through. Additive: every
 * Figma token above is untouched, so anything still on the old system keeps working.
 * ─────────────────────────────────────────────────────────────────────────── */
export type Gradient3 = readonly [string, string, string];

export const Aurora = {
  light: {
    base: '#F3F5F8',
    ground: ['#FBF8F4', '#F4F6F9', '#F0F3F7'] as Gradient3, // clean warm→cool neutral (basic)
    washA: '#F79A4D', // faint FPT-orange wash, top-left
    washC: '#5BB4E6', // faint blue wash, bottom-right
    glass: 'rgba(255,255,255,0.74)', // more solid so content reads clearly
    glassStrong: 'rgba(255,255,255,0.92)',
    glassBorder: 'rgba(255,255,255,0.92)',
    sheen: 'rgba(255,255,255,0.6)',
    onGlass: '#1C2430',
    onGlassSoft: '#5A6472',
    shadow: '#2A3340',
    shadowOpacity: 0.14,
  },
  dark: {
    base: '#0E0F13',
    ground: ['#15171C', '#121319', '#0E0F14'] as Gradient3, // neutral charcoal
    washA: '#F26F21', // faint orange
    washC: '#1E6E9E', // faint blue
    glass: 'rgba(28,30,36,0.62)',
    glassStrong: 'rgba(32,34,40,0.82)',
    glassBorder: 'rgba(255,255,255,0.12)',
    sheen: 'rgba(255,255,255,0.06)',
    onGlass: '#EEF1F5',
    onGlassSoft: '#9AA3B0',
    shadow: '#000000',
    shadowOpacity: 0.5,
  },
} as const;

/** FPT-orange diagonal gradient for the dashboard hero. */
export const HeroAurora = {
  light: ['#FF9A3E', '#F26F21', '#E24E1B'] as Gradient3, // orange → deep orange
  dark: ['#FB923C', '#F26F21', '#C2410C'] as Gradient3,
} as const;

/** FPT-orange glow — used sparingly on the hero and primary buttons. */
export const Glow = {
  primary: {
    shadowColor: '#F26F21',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  pink: {
    shadowColor: '#0284C7',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Layout metrics, unscaled from the export (÷ 0.874465). */
export const Layout = {
  screenPad: 18, // 15.74
  cardPad: 20, // 17.4893
  gridGap: 10, // 8.74465
  sectionGap: 28, // 24.485
  stackGap: 10, // 8.74465
  tabBarHeight: 75, // 65.58
  tabBarRadius: 70, // 61.2126
  heroHeight: 122, // 106.68
  tileHeight: 62, // 54.22
  pendingHeight: 88, // 76.95
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  chip: 5, // 4.37233
  cta: 8, // 6.99572
  md: 12,
  field: 16, // gtsm login: RoundedCornerShape(16.dp) — fields + button
  card: 20, // 17.4893 — the Figma's one card radius
  sheet: 24, // gtsm login: RoundedCornerShape(24.dp) — the form sheet
  pill: 999, // 90.0699 / 61.2126
} as const;

/** Type scale, unscaled from the export (÷ 0.874465). */
export const Type = {
  chip: { fontSize: 12, lineHeight: 14 }, // 10.4936 / 12
  body: { fontSize: 14, lineHeight: 16 }, // 12.2425 / 14
  bodyLg: { fontSize: 16, lineHeight: 18 }, // 13.9914 / 16
  title: { fontSize: 18, lineHeight: 22 }, // 15.7404 / 19
  greeting: { fontSize: 26, lineHeight: 31 }, // 22.7361 / 27
  subject: { fontSize: 30, lineHeight: 35 }, // 26.234 / 31
  hero: { fontSize: 40, lineHeight: 34 }, // 34.9786 / 30 — yes, lineHeight < fontSize
} as const;

/**
 * Figma shadows. The pending/subject cards carry NO shadow — they are plain white on
 * #F6F6F9. Only the floating tab bar has one.
 */
export const Elevation = {
  tabBar: {
    light: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 34, // 29.7318
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    dark: {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Adds an alpha channel to a `#RRGGBB` literal. React Native accepts `#RRGGBBAA`. */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

// ── Legacy FPT palette. Mirrors FE/src/styles/index.css @theme brand-*. No longer used by
// any mobile screen — the Figma port replaced it. Kept so the web contract stays discoverable.
export const Brand = {
  50: '#fffbf5',
  100: '#fff3e0',
  200: '#ffe0b2',
  300: '#ffcc80',
  400: '#ffb74d',
  500: '#ffa726',
  600: '#fb8c00',
  700: '#f57c00',
  800: '#e65100',
  900: '#bf360c',
  950: '#7c2a00',
} as const;
export const BrandTint = Brand[600];
