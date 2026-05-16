# NandedRozgar – Animation Changelog

All animations use **React Native's built-in `Animated` API** — zero new dependencies required.

---

## New File: `src/utils/animations.js`
Shared animation building blocks importable everywhere:

| Export | What it does |
|---|---|
| `FadeSlide` | Wraps any view with a fade-in + slide-up entrance (configurable delay & offset) |
| `ScaleIn` | Pops a view in from 0.7 scale with a spring |
| `PressScale` | Wraps a pressable to shrink on tap and spring back |
| `PulseDot` | A live pulsing status dot (e.g. "Posted today") |
| `useCountUp` | Counts a number up from 0 on mount |
| `useShimmer` | 0→1 oscillation for border/colour shimmer effects |
| `useFloat` | Smooth up-down float loop (for icons/illustrations) |
| `usePulse` | Scale pulse loop (for CTA buttons) |
| `useSlideModal` | Slide-up translateY value for bottom sheets |

---

## `HomeScreen.js`
| Animation | Detail |
|---|---|
| **Hero banner** | Fades in & slides down from above on mount |
| **Animated stat counters** | 842, 324, 156, 580 — all count up from 0 with staggered delays |
| **AI card shimmer border** | Border colour oscillates orange↔amber on a loop |
| **Service cards** | Entire grid fades + slides up together |
| **Job cards** | Each card enters staggered (100ms apart) with fade+slide |
| **Pulsing dot** | Jobs posted "today" show a live pulsing green dot |
| **Press feedback** | Every tappable card shrinks to 0.95 on press and springs back |
| **Language modal** | Slides up from bottom with a cubic ease |

---

## `OnboardingScreen.js`
| Animation | Detail |
|---|---|
| **Slide icon entrance** | Each slide's icon springs in from 0.5 scale when active |
| **Text entrance** | Subtitle fades + slides up 150ms after icon |
| **Floating icon** | Active slide icon continuously floats up-down |
| **Animated dots** | Active dot smoothly widens from 8→24px using spring |
| **CTA pulse** | "Get Started" button pulses on the last slide |

---

## `LoginScreen.js`
| Animation | Detail |
|---|---|
| **Logo entrance** | Scales in from 0.6 and slides down from above |
| **Logo icon float** | Icon floats up-down on a loop |
| **Form box slide up** | Box slides up from 40px below with fade |
| **Animated tab slider** | The Sign In/Register indicator slides smoothly with a spring |
| **Error shake** | Form box shakes horizontally on login failure |
| **Benefits fade** | Bottom benefit chips fade in last |

---

## `PostScreen.js`
| Animation | Detail |
|---|---|
| **Header fade** | Header slides down from above on mount |
| **Card stagger** | Each option card slides in from the left, 90ms apart |
| **Press feedback** | Card shrinks + springs back before navigating |

---

## `JobDetailScreen.js`
| Animation | Detail |
|---|---|
| **Card staggered entrance** | Header, Details, Stats, Description, Contact, Actions — each card enters 80ms apart |
| **Job icon spring** | The job icon circle springs in from scale 0 |
| **Stat count-up** | Views and Applied counters animate from 0 |
| **Apply/WhatsApp buttons** | Spring press effect on tap |
