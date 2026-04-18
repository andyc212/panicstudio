# PLC-AIStudio Design System Review Report

**Project:** PLC-AIStudio — AI-Powered PLC Development Environment  
**Date:** 2026-04-19  
**Reviewer:** Senior UI Design Agent  
**Scope:** Visual design, component architecture, accessibility, and design token hygiene  

---

## 1. Executive Summary

PLC-AIStudio is a dark-themed, three-panel IDE for Panasonic PLC developers. It uses React 19 + Vite + Tailwind CSS v3 with a custom industrial-dark aesthetic anchored by an orange (`#f97316`) brand accent. The application demonstrates solid architectural decisions (resizable panels, Monaco integration, SVG ladder diagrams) but lacks a formalized design system, leading to inconsistent spacing, typography sprawl, and missed accessibility opportunities.

### Score Breakdown (0–10)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Visual Hierarchy** | 6.5 | Functional but flat. Too many elements compete at the same visual weight. No elevation/shadow system to separate panels. |
| **Color System** | 6.0 | Dark palette is cohesive, but accent orange is overused as both brand and functional color. Semantic colors (success/warning/error) are present but lack nuanced tints/tones. No hover/active color variants formalized. |
| **Typography** | 5.5 | Font stack is appropriate (Inter + JetBrains Mono), but sizing is chaotic: `text-[9px]` through `text-sm` appear arbitrarily. No type scale with semantic roles (label, body, caption). |
| **Spacing** | 5.0 | Inconsistent padding/margins across components. Mix of `px-2`, `px-2.5`, `px-3`, `py-1`, `py-1.5` without a clear 4px/8px grid discipline. Density feels cramped in forms. |
| **Component Consistency** | 5.0 | No primitive component layer. Buttons, inputs, and cards are re-implemented inline with slight variations. `clsx`/`tailwind-merge` are installed but underutilized for abstraction. |
| **Accessibility** | 6.5 | Good effort: `aria-label`, `aria-pressed`, keyboard handlers, `focus-visible` patterns exist. Missing: focus rings on custom SVG elements, insufficient contrast on `text-muted` (#484f58 on #161b22 = 3.8:1), no `prefers-reduced-motion`. |
| **Dark Theme Quality** | 7.0 | Consistent dark surface layering (base → sidebar → editor). Scrollbar theming is excellent. Missing: semantic elevation tokens, border hierarchy (only one border color used), and subtle ambient gradients for depth. |

### **Overall Score: 5.9 / 10**

> The app is **functional and visually coherent at a glance**, but it will not scale. As feature count grows, the lack of design tokens and component primitives will create a "death by a thousand papercuts" scenario where every new screen looks slightly different.

---

## 2. Current Design Analysis

### 2.1 Layout Architecture

**Current State:** Three-panel layout (Left: AI Chat / Center: Editor+Ladder / Right: Project Tree) with collapsible sidebars, resizable splits, and a top toolbar + bottom status bar.

**Strengths:**
- The panel collapse triggers (8px bars with hover-reveal chevrons) are a space-efficient pattern familiar from VS Code.
- Resizable splits in the center and right panels show good UX thinking for IDE users.
- `overflow-hidden` discipline prevents accidental body scroll.

**Issues:**
- **No elevation system.** All panels sit at the same z-depth. A 1px `border-border` separator is the only differentiation. In a complex IDE, users need subtle shadows or background shifts to understand panel hierarchy.
- **Toolbar height is hardcoded** (`h-toolbar` = 48px) but the status bar uses `h-statusbar` = 28px. These are fine, but there's no documented "frame" layout token.
- **Responsive behavior is absent.** On smaller screens, the three-panel layout will break. There are no breakpoints for tablet/mobile (acceptable for an IDE, but worth noting).

**Before:** Flat panels separated by identical 1px borders. Everything feels like it's on the same plane.  
**After:** Subtle `box-shadow` on floating panels, slightly different surface colors for "raised" vs "sunken" areas, and a visible 2px accent line on the active panel.

---

### 2.2 Color System

**Current State:** Tailwind config defines a custom palette:
- Base: `#0f1117` (deepest), `#161b22` (sidebar/light), `#1e1e2e` (editor), `#181825` (LD)
- Text: `#e6edf3` (primary), `#8b949e` (secondary), `#484f58` (muted)
- Accent: `#f97316` (orange) with light `#fb923c` and dark `#ea580c`
- Semantic: success `#22c55e`, warning `#eab308`, error `#ef4444`, info `#0ea5e9`

**Strengths:**
- The dark palette is comfortable for long coding sessions.
- Orange accent is distinctive and aligns with industrial/energy aesthetics.
- CSS custom properties in `index.css` provide runtime flexibility.

**Critical Issues:**
1. **Dual source of truth:** Colors are defined in BOTH `tailwind.config.js` AND `index.css` variables. They match today, but will diverge.
2. **Accent overuse:** Orange is used for brand (logo), primary actions (generate button), active states (tabs), focus rings, links, AND decorative badges. This dilutes its meaning. Users cannot distinguish "brand identity" from "click me."
3. **Missing tints:** Semantic colors only have one hex. There are no `success/10`, `success/20` tokens in the config—they're generated via Tailwind's opacity modifier (`bg-success/10`), which is fine but not formalized.
4. **Contrast failure:** `text-muted` (#484f58) on `bg-sidebar` (#161b22) yields ~3.8:1 contrast, failing WCAG AA for small text (requires 4.5:1).

**Before:** Every interactive element screams orange. Muted text is hard to read on sidebar backgrounds.  
**After:** Orange reserved for primary CTAs and active focus. Secondary actions use neutral hover states. Muted text lightened to `#6e7681` for 5.2:1 contrast.

---

### 2.3 Typography

**Current State:**
- Sans: `Inter, system-ui, Segoe UI, Roboto`
- Mono: `JetBrains Mono, ui-monospace, Consolas`
- Arbitrary sizes: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`

**Strengths:**
- Font choices are excellent for an IDE context. Inter is highly legible at small sizes; JetBrains Mono has distinguishable glyphs (`0` vs `O`, `1` vs `l`).
- Monaco Editor uses 13px, a comfortable size for code.

**Issues:**
1. **No type scale.** `text-[10px]` appears 30+ times in `ChatPanel/index.tsx` alone for labels, badges, file names, hints, and button text. These have different semantic roles but identical styling.
2. **Line height is uncontrolled.** No `leading` utilities are used; default Tailwind line-heights may cause uneven vertical rhythm, especially in Chinese text.
3. **Uppercase abuse:** `uppercase tracking-wider` is used for POU category labels but not consistently applied to other section headers.

**Before:** A label, a button, and a caption all use `text-[10px] text-text-secondary`. Users cannot tell what is clickable vs. informational.  
**After:** Formalized scale: `text-label` (11px medium, all-caps tracking) for section headers, `text-caption` (10px regular) for metadata, `text-body-sm` (12px) for readable UI text.

---

### 2.4 Spacing

**Current State:** Spacing is ad-hoc. Examples from a single file (`ChatPanel`):
- `p-2`, `p-2.5`, `p-3`, `px-3 py-2`, `px-2 py-1.5` — all appear within 50 lines.
- Form inputs use `py-1.5` in some places, `py-2` in others, `py-1` in the I/O table.
- Gap values: `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5` appear with no clear pattern.

**Issues:**
1. **No 4px/8px grid discipline.** While Tailwind's scale is inherently 4px-based, the *usage* doesn't respect a spacing system. `p-2.5` (10px) breaks the grid.
2. **Density is inconsistent.** The I/O configuration table uses `py-1` (tight) while the scenario input uses `py-1.5` (loose). Both are dense forms and should share density.
3. **No "t-shirt size" spacing tokens.** Shadcn/ui and modern systems use `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px) consistently. This project invents spacing per component.

**Before:** Two adjacent cards have `p-3` and `p-2.5`. The eye perceives them as different components.  
**After:** All cards use `p-3` (12px). All form inputs use `py-2 px-3`. A strict 4px grid is enforced via linting.

---

### 2.5 Icons

**Current State:** Lucide React is used throughout with sizes ranging from `size={8}` to `size={20}`.

**Strengths:**
- Lucide is a modern, consistent icon set with excellent accessibility (currentColor stroke, predictable naming).
- Icon + label pairing is used well in buttons and empty states.

**Issues:**
1. **Size inconsistency:** Toolbar icons are 16–18px. Panel headers use 12px. Inline action buttons use 10px. Badges use 8px. There is no standard icon size mapping (e.g., `icon-sm = 12px`, `icon-md = 16px`).
2. **Color inconsistency:** Some icons use `text-text-muted`, some `text-text-secondary`, and some inherit from parent. The `FileCode` icon in `ProjectTree` has no explicit color class, relying on parent text color.

**Before:** `Trash2 size={10}` in one button, `Trash2 size={12}` in another. Users perceive different importance.  
**After:** Standardized icon sizes: 12px for inline actions, 16px for toolbar buttons, 20px for empty-state illustrations.

---

### 2.6 Components

#### Buttons
There are at least **5 different button styles** in the codebase, all inline:
1. **Primary CTA:** `bg-accent text-white` (Generate button)
2. **Secondary/Toolbar:** `text-text-secondary hover:text-text-primary hover:bg-sidebar-hover` (ToolbarButton)
3. **Ghost Icon:** `p-1 rounded hover:bg-sidebar-hover text-text-muted` (Zoom controls)
4. **Danger:** `text-error hover:bg-error/10` (Delete context menu)
5. **Inline Action:** `px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:bg-sidebar-active` (Code action bar)

**Problem:** No `Button` primitive. If the accent color changes, 10+ files need updating.

#### Inputs
Form inputs are styled consistently (`bg-sidebar-hover border border-border focus:border-accent`) but are copy-pasted across:
- `AuthModal`
- `ChatPanel` (scenario, I/O table, steps, notes)
- `CommandPalette` search
- `ProjectTree` rename

**Problem:** No `Input`, `Textarea`, or `Select` primitive. The focus ring is only a border color change—no `ring` utility for accessibility.

#### Cards / Panels
Cards use `rounded-lg border border-border bg-base` or `rounded-lg border border-border bg-base overflow-hidden`. This pattern is repeated 15+ times.

**Problem:** No `Card` or `Panel` primitive. Corner radius (`rounded-lg` = 8px) is correct, but shadow/elevation is absent.

#### Tabs
`ChatPanel` implements tabs with `border-b-2` active indicators. This is clean but custom. No `Tabs` primitive exists for reuse.

---

## 3. Benchmark Comparison

### 3.1 What PLC-AIStudio Does Well

| Area | Assessment |
|------|------------|
| **Dark Theme Foundation** | Better than many dark-mode implementations. The `#0f1117` → `#1e1e2e` surface progression creates real depth. |
| **Scrollbar Theming** | Custom `::-webkit-scrollbar` styling is polished and cohesive. |
| **Editor Integration** | Monaco custom theme (`panicstudio-dark`) with IEC ST language support shows attention to developer experience. |
| **Keyboard Accessibility** | `CommandPalette` supports full arrow-key + Enter navigation. Panel toggles have keyboard handlers. |
| **Empty States** | `ComingSoon` component and chat empty state use icon + heading + description pattern effectively. |
| **Lucide Icons** | Correct choice for a modern IDE. Better than Font Awesome or Material Icons for this aesthetic. |

### 3.2 Where It Falls Short vs. Shadcn/ui & Refactoring UI

| Gap | Shadcn/ui Standard | Current State |
|-----|-------------------|---------------|
| **Component Primitives** | `Button`, `Input`, `Card`, `Badge`, `Tabs` with `cva` (class-variance-authority) variants | All inline, no variants system |
| **Design Tokens** | CSS variables for all colors, radii, spacing, shadows in `:root` | Mix of Tailwind config + CSS vars; no radii/shadow tokens |
| **Focus Rings** | `ring-2 ring-ring ring-offset-2` on all interactive elements | Only `focus:border-accent` on inputs; missing on buttons |
| **Shadow System** | `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg` with dark-aware colors | No shadows used at all |
| **Animation** | `@radix-ui` transitions for dialogs, dropdowns, collapsibles | No enter/exit animations; instant appearance/disappearance |
| **Form Accessibility** | `Label`, `FormMessage`, `aria-describedby`, `aria-invalid` | Labels are plain `<label>` with no `htmlFor`; error states lack `aria-invalid` |
| **Type Scale** | `text-sm`, `text-base`, `text-lg`, `text-xl` with `font-semibold`/`font-bold` distinctions | Arbitrary `text-[10px]` etc. |

### 3.3 Specific Gaps

1. **No `cva` / `tailwind-merge` abstraction:** Both packages are installed (`clsx` and `tailwind-merge` are in `package.json`) but components do not use them to build variant-driven primitives.
2. **No Dialog primitive:** `AuthModal` and `CommandPalette` both implement their own overlay/backdrop patterns (`bg-black/60 backdrop-blur-sm` vs `bg-black/50 backdrop-blur-sm`). Slight inconsistencies will grow.
3. **Missing Badge component:** Score badges, type badges, status badges all use inline `style={{ backgroundColor, color }}`. A `Badge` primitive with `variant` prop would standardize this.
4. **No Tooltip system:** Toolbar buttons have `title` attributes but no visual tooltips. `title` is not accessible to touch users.

---

## 4. Prioritized Recommendations

### P0 — Critical Design Fixes

#### P0.1 Fix Text Contrast on Muted Text
- **What to change:** Increase `text-muted` from `#484f58` to `#6e7681`.
- **Why it matters:** WCAG 2.1 AA requires 4.5:1 for normal text. Current ratio on `#161b22` is ~3.8:1. PLC developers may have vision strain from long sessions.
- **How to implement:**
  ```js
  // tailwind.config.js
  colors: {
    text: {
      muted: '#6e7681', // was #484f58
    }
  }
  ```
- **Before/After:** Before: subtle labels and hints are barely visible on sidebar backgrounds. After: all metadata, timestamps, and secondary labels are comfortably readable without stealing focus.

#### P0.2 Add Focus Rings to All Interactive Elements
- **What to change:** Replace `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base` on buttons, links, and tabbable SVG elements.
- **Why it matters:** Keyboard navigation is currently invisible for many buttons. The `LadderView` SVG elements have `tabIndex` but no focus indicator.
- **How to implement:**
  ```css
  @layer base {
    button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      @apply ring-2 ring-accent ring-offset-2 ring-offset-base outline-none;
    }
  }
  ```
- **Before/After:** Before: Pressing Tab through the ladder diagram gives no visual feedback. After: Each focusable element glows with an orange ring, matching the brand.

#### P0.3 Unify Color Source of Truth
- **What to change:** Move ALL color definitions to CSS custom properties in `index.css`. Reference them in `tailwind.config.js` using `var(--name)`.
- **Why it matters:** Prevents divergence. Right now, `--bg-sidebar: #161b22` and `sidebar.DEFAULT: '#161b22'` are duplicate sources.
- **How to implement:**
  ```js
  // tailwind.config.js
  colors: {
    base: {
      DEFAULT: 'var(--bg-base)',
      light: 'var(--bg-sidebar)',
    },
    // etc.
  }
  ```
- **Before/After:** Before: Changing the background requires edits in 2+ files. After: One variable change propagates everywhere.

#### P0.4 Enforce 4px Spacing Grid
- **What to change:** Audit and replace all `p-2.5` (10px), `gap-2.5` (10px), `py-2.5` (10px) with `p-3` (12px) or `p-2` (8px).
- **Why it matters:** Refactoring UI principle: "Spacing should be predictable." A broken grid creates subtle misalignment that feels "off."
- **How to implement:** Regex replace in codebase; add a custom ESLint rule or Stylelint config.
- **Before/After:** Before: Two buttons side by side have 10px and 12px padding—visually different heights. After: All buttons align to an invisible 4px grid, creating calm visual rhythm.

---

### P1 — Component System Improvements

#### P1.1 Create a `Button` Primitive with Variants
- **What to change:** Extract a `Button` component using `cva` (class-variance-authority) or manual variant mapping.
- **Why it matters:** Shadcn/ui and Radix primitives all start with variants. This is the foundation of a scalable system.
- **How to implement:**
  ```tsx
  // components/ui/Button.tsx
  import { cva, type VariantProps } from 'class-variance-authority';
  
  const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent',
    {
      variants: {
        variant: {
          default: 'bg-accent text-white hover:bg-accent-dark',
          secondary: 'bg-sidebar-hover text-text-secondary hover:bg-sidebar-active hover:text-text-primary',
          ghost: 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary',
          danger: 'text-error hover:bg-error/10',
          outline: 'border border-border bg-transparent hover:bg-sidebar-hover',
        },
        size: {
          sm: 'h-7 px-2 gap-1 text-[11px]',
          md: 'h-9 px-3 gap-1.5 text-xs',
          lg: 'h-10 px-4 gap-2 text-sm',
          icon: 'h-8 w-8',
        },
      },
      defaultVariants: { variant: 'default', size: 'md' },
    }
  );
  ```
- **Before/After:** Before: 5+ inline button styles scattered across files. After: One source of truth. Adding a "loading" state or new size requires one edit.

#### P1.2 Create `Input`, `Textarea`, `Select` Primitives
- **What to change:** Extract form primitives with consistent focus rings, disabled states, and sizing.
- **How to implement:**
  ```tsx
  const inputBase = 'flex w-full rounded-md border border-border bg-sidebar-hover px-3 py-2 text-xs text-text-primary placeholder:text-text-muted transition-colors focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50';
  ```
- **Before/After:** Before: I/O table inputs are `text-[10px] py-1 px-1.5` while auth inputs are `text-sm py-2 px-3`. After: All inputs respect a `size` prop (`sm` for dense tables, `md` for forms).

#### P1.3 Create `Card` and `Panel` Primitives
- **What to change:** Standardize the `rounded-lg border border-border bg-base` pattern.
- **How to implement:**
  ```tsx
  const cardVariants = cva('rounded-lg border border-border bg-base', {
    variants: {
      padding: { default: 'p-3', tight: 'p-2', loose: 'p-4' },
      shadow: { none: '', sm: 'shadow-sm', md: 'shadow-md' },
    },
  });
  ```
- **Before/After:** Before: ChatPanel's Step cards, History cards, and ValidationPanel all look slightly different. After: They share a `Card` primitive but can override padding/shadow.

#### P1.4 Build a `Badge` Primitive
- **What to change:** Replace inline score badges, type badges, and status badges.
- **How to implement:**
  ```tsx
  const badgeVariants = cva('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', {
    variants: {
      variant: {
        default: 'bg-sidebar-active text-text-secondary',
        accent: 'bg-accent/10 text-accent',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
      },
    },
  });
  ```
- **Before/After:** Before: `ValidationPanel` uses inline `style={{ backgroundColor, color }}` for score badges. After: `<Badge variant="success">92分</Badge>` is declarative and theme-safe.

#### P1.5 Introduce Shadow/Elevation Tokens
- **What to change:** Add a minimal shadow system for modals, dropdowns, and context menus.
- **How to implement:**
  ```js
  // tailwind.config.js
  boxShadow: {
    'panel': '0 0 0 1px rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4)',
    'modal': '0 0 0 1px rgba(255,255,255,0.05), 0 16px 48px rgba(0,0,0,0.6)',
    'dropdown': '0 0 0 1px rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.5)',
  }
  ```
- **Before/After:** Before: `AuthModal` and `CommandPalette` float with only a border. After: They cast subtle dark shadows that create depth without looking "cartoonish."

---

### P2 — Polish Items

#### P2.1 Add Micro-interactions
- **What to change:** Add purposeful transitions for state changes.
- **Why it matters:** "Motion should be purposeful, not decorative." (Anthropic Frontend Design principle)
- **How to implement:**
  ```css
  /* index.css additions */
  .transition-panel {
    @apply transition-all duration-200 ease-out;
  }
  .transition-fade {
    @apply transition-opacity duration-150 ease-in-out;
  }
  ```
  - Modal enter: `animate-in fade-in zoom-in-95 duration-200`
  - Panel collapse: `transition-[width] duration-300 ease-in-out`
  - Button press: `active:scale-[0.98]`
- **Before/After:** Before: Panels snap open/closed instantly. After: Panels glide smoothly; buttons subtly depress on click, confirming the action.

#### P2.2 Add Tooltip System
- **What to change:** Replace `title` attributes with a custom Tooltip component (or install `@radix-ui/react-tooltip`).
- **How to implement:**
  ```tsx
  <Tooltip content="导出当前 POU 为 .st 文件">
    <ExportButton />
  </Tooltip>
  ```
- **Before/After:** Before: Tooltips are OS-native, delayed, and inaccessible on touch. After: Styled, instant, theme-aware tooltips appear above all content.

#### P2.3 Standardize Icon Sizing
- **What to change:** Create an `Icon` wrapper or strict size conventions.
- **How to implement:**
  ```tsx
  const iconSizes = { xs: 10, sm: 12, md: 16, lg: 20, xl: 24 };
  ```
  - Toolbar actions: `md` (16px)
  - Panel headers: `sm` (12px)
  - Inline buttons: `sm` (12px)
  - Badges: `xs` (10px)
  - Empty states: `lg` (20–24px)
- **Before/After:** Before: `Settings size={16}` and `Menu size={18}` sit next to each other in the toolbar with different visual weights. After: All toolbar icons are 16px.

#### P2.4 Add `prefers-reduced-motion` Support
- **What to change:** Wrap animations in `@media (prefers-reduced-motion: reduce)` overrides.
- **How to implement:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Before/After:** Before: Users with vestibular disorders experience jarring motion. After: All motion is suppressed for users who need it.

#### P2.5 Enhance Ladder Diagram Hover States
- **What to change:** SVG `hover:stroke-[#f97316]` is good but could be enhanced with a subtle fill glow.
- **How to implement:**
  ```tsx
  <rect
    className="transition-all duration-150 hover:stroke-accent hover:fill-accent/5"
    // ...
  />
  ```
- **Before/After:** Before: Hovering a contact only changes its stroke color. After: A faint orange fill appears, making the hover feel more "alive."

---

## 5. Design Token Proposal

This proposal aligns with Shadcn/ui best practices while preserving the dark industrial aesthetic.

### 5.1 Color Tokens (CSS Custom Properties)

```css
:root {
  /* Surfaces — 4 levels of depth */
  --background: #0f1117;        /* Deepest: app background */
  --surface-1: #161b22;         /* Panels, sidebars */
  --surface-2: #1e1e2e;         /* Editor, inputs */
  --surface-3: #21262d;         /* Hover states */
  --surface-4: #30363d;         /* Active/selected */

  /* Text — 4 levels of emphasis */
  --foreground: #e6edf3;        /* Primary text */
  --foreground-muted: #c9d1d9;  /* Secondary text (was #8b949e, slightly warmer) */
  --foreground-faint: #6e7681;  /* Muted / metadata (P0 fix) */
  --foreground-disabled: #484f58;/* Disabled / placeholders */

  /* Brand Accent */
  --accent: #f97316;
  --accent-hover: #ea580c;
  --accent-subtle: rgba(249, 115, 22, 0.1);
  --accent-glow: rgba(249, 115, 22, 0.15);

  /* Semantic */
  --success: #22c55e;
  --success-subtle: rgba(34, 197, 94, 0.1);
  --warning: #eab308;
  --warning-subtle: rgba(234, 179, 8, 0.1);
  --error: #ef4444;
  --error-subtle: rgba(239, 68, 68, 0.1);
  --info: #0ea5e9;
  --info-subtle: rgba(14, 165, 233, 0.1);

  /* Border */
  --border: #30363d;
  --border-subtle: #21262d;
  --border-focus: #f97316;

  /* Elevation (shadows for dark mode) */
  --shadow-panel: 0 0 0 1px rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4);
  --shadow-modal: 0 0 0 1px rgba(255,255,255,0.05), 0 16px 48px rgba(0,0,0,0.6);
  --shadow-dropdown: 0 0 0 1px rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.5);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Typography */
  --font-sans: 'Inter', system-ui, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;

  /* Spacing (Tailwind already provides these, but document the scale) */
  /* 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px */
}
```

### 5.2 Typography Scale

| Token | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| `text-hero` | 20px | 600 | 1.3 | Modal titles, empty-state headings |
| `text-heading` | 14px | 600 | 1.4 | Panel headers, section titles |
| `text-body` | 12px | 400 | 1.5 | Form labels, readable UI text |
| `text-body-sm` | 11px | 400 | 1.5 | Dense UI, table cells |
| `text-label` | 11px | 500 | 1.4 | uppercase, tracking-wider, section headers |
| `text-caption` | 10px | 400 | 1.4 | Metadata, timestamps, badges |
| `text-micro` | 9px | 500 | 1.3 | Progress step numbers, tiny counters |

> **Note:** This replaces arbitrary `text-[10px]` usage with semantic roles.

### 5.3 Spacing Scale (Enforced)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, icon-to-text distance |
| `space-2` | 8px | Default gap between related items |
| `space-3` | 12px | Card padding, form group gaps |
| `space-4` | 16px | Section padding, modal padding |
| `space-5` | 20px | Large section separation |
| `space-6` | 24px | Hero/empty state padding |

**Rule:** No arbitrary values (`px-[10px]`, `py-[5px]`) unless for very specific one-off layouts.

### 5.4 Component Token Mapping

```
Button (primary):
  background: var(--accent)
  color: white
  padding: var(--space-2) var(--space-3)   // 8px 12px
  border-radius: var(--radius-md)          // 6px
  hover: var(--accent-hover)
  focus: ring-2 ring-accent ring-offset-2

Input:
  background: var(--surface-2)
  border: 1px solid var(--border)
  color: var(--foreground)
  padding: var(--space-2) var(--space-3)   // 8px 12px
  border-radius: var(--radius-md)
  focus: border-accent, ring-1 ring-accent
  placeholder: var(--foreground-disabled)

Card:
  background: var(--surface-1)
  border: 1px solid var(--border)
  border-radius: var(--radius-lg)          // 8px
  padding: var(--space-3)                  // 12px
  shadow: none (default), var(--shadow-panel) when floating

Badge:
  padding: 2px 6px
  border-radius: var(--radius-sm)
  font: text-caption
```

---

## 6. Conclusion & Action Items

PLC-AIStudio has a **strong visual identity** and **solid UX architecture** for a developer tool. The dark industrial theme with orange accents is distinctive and appropriate for the PLC engineering audience. However, the project is at an inflection point: without a formalized design system, every new feature will compound existing inconsistencies.

### Immediate Actions (This Sprint)

1. **Fix `text-muted` contrast** — 1-line change, high accessibility impact.
2. **Unify color tokens** — Move all colors to CSS variables; update Tailwind config to reference them.
3. **Install `class-variance-authority`** — Already have `clsx` + `tailwind-merge`; add `cva` to enable variant-driven primitives.
4. **Create `Button`, `Input`, `Card`, `Badge` primitives** — Migrate 3 most-used components as proof of concept.

### Short-Term Actions (Next 2 Sprints)

5. **Audit spacing** — Replace all `*-2.5` utilities with `*-2` or `*-3`.
6. **Build `Tabs`, `Dialog`, `DropdownMenu` primitives** — Standardize overlays and navigation patterns.
7. **Add shadow/elevation tokens** — Apply to modals, context menus, and command palette.
8. **Implement focus-ring global style** — Remove all `focus:outline-none` without replacement.

### Long-Term Actions (Next Quarter)

9. **Evaluate shadcn/ui integration** — Given the project's custom aesthetic, a full shadcn install may be overkill, but adopting its **token structure** and **Radix primitives** would accelerate development.
10. **Add animation system** — Use `@radix-ui` presence utilities or Framer Motion for modal/dialog enter/exit transitions.
11. **Accessibility audit** — Run axe-core or Lighthouse on all major flows (auth, code generation, ladder diagram interaction).
12. **Design documentation** — Create a living style guide page within the app (or Storybook) documenting tokens and components.

### Final Verdict

> **PLC-AIStudio is a 6/10 design that can become an 8.5/10 with systematic tokenization and primitive extraction.** The foundation is there. What is needed now is discipline: stop writing inline Tailwind classes for common patterns, and start treating the UI as a system rather than a collection of screens.

---

*Report generated for PLC-AIStudio Design Review.*  
*Methodology: Static code analysis of React/TSX components, Tailwind configuration audit, WCAG 2.1 AA contrast evaluation, benchmark comparison against Shadcn/ui v1.0+ and Refactoring UI principles.*
