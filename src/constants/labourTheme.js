/**
 * labourTheme.js — single source of truth for the Labour feature's design
 * tokens (colors, spacing, radii, status states, skill icons).
 *
 * Every Labour screen (LabourScreen, LabourDetailScreen, PostLabourProfileScreen,
 * HireRequestsScreen) should import from here instead of redeclaring its own
 * ORANGE / LABOUR_COLOR / STATUS_META constants. That's the whole point —
 * one place to tweak a color or spacing value and have it apply everywhere.
 *
 * Place at: src/constants/labourTheme.js
 */

// ── Color system ─────────────────────────────────────────────────────────────
// PRIMARY is CityPlus's brand orange, used for the main "Hire" CTA and any
// primary action across all four screens.
// WORKER is the warmer amber used specifically for worker-identity elements
// (avatars, chowk check-in, contact-unlock) — it's a deliberate secondary
// accent, not a stray color, so it's kept here rather than dropped.
export const LABOUR_COLORS = {
  primary:      '#f97316',
  primaryDark:  '#c2410c',
  worker:       '#b45309',
  team:         '#7c3aed',
  success:      '#16a34a',
  successBg:    '#f0fdf4',
  successBorder:'#bbf7d0',
  warning:      '#d97706',
  warningBg:    '#fef3c7',
  danger:       '#dc2626',
  dangerBg:     '#fee2e2',
  info:         '#2563eb',
  infoBg:       '#eff6ff',
  text:         '#111111',
  textMuted:    '#8e8ea0',
  textFaint:    '#999999',
  border:       '#ebebeb',
  surface:      '#ffffff',
  bg:           '#f7f7f7',
  bgWeb:        '#f3f4f6',
};

// ── Spacing scale ────────────────────────────────────────────────────────────
// Use these instead of ad-hoc numbers so every card/section lines up the
// same way across screens.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 100,
};

// ── Hire request status states ──────────────────────────────────────────────
// Used by HireRequestsScreen (list badges) and referenced by the hire-flow
// step indicator on LabourDetailScreen, so both screens describe the same
// journey the same way.
export const STATUS_META = {
  pending:   { label: 'Pending',   bg: '#fef3c7', fg: '#b45309', icon: 'time-outline' },
  accepted:  { label: 'Accepted',  bg: '#dbeafe', fg: '#1d4ed8', icon: 'checkmark-circle-outline' },
  declined:  { label: 'Declined',  bg: '#fee2e2', fg: '#b91c1c', icon: 'close-circle-outline' },
  completed: { label: 'Completed', bg: '#dcfce7', fg: '#15803d', icon: 'ribbon-outline' },
  cancelled: { label: 'Cancelled', bg: '#f1f1f4', fg: '#71717a', icon: 'ban-outline' },
};

// ── The hire journey, spelled out once ──────────────────────────────────────
// Every screen that touches the hire flow (detail page, hire-requests list)
// should describe it in these same three stages so the system reads as one
// coherent flow instead of four screens doing their own thing.
export const HIRE_FLOW_STEPS = [
  { key: 'unlock',  label: 'Unlock contact', icon: 'lock-open-outline' },
  { key: 'request', label: 'Send request',   icon: 'paper-plane-outline' },
  { key: 'track',   label: 'Track status',   icon: 'checkmark-done-outline' },
];

export const SKILL_ICONS = {
  All: 'apps-outline',
  Mason: 'construct-outline',
  Electrician: 'flash-outline',
  Plumber: 'water-outline',
  Painter: 'color-palette-outline',
  Carpenter: 'hammer-outline',
  Welder: 'flame-outline',
  Helper: 'people-outline',
  Other: 'briefcase-outline',
};
