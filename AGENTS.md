# PLC-AIStudio — Agent Context & Memory Bank

> **Purpose**: This file is the single source of truth for AI agents working on this project.
> **Rule**: Every agent session MUST read this file first. Every completed task MUST update this file.

---

## 1. Project Overview

**PLC-AIStudio** is a web app helping Panasonic PLC developers use AI (Kimi) to write IEC 61131-3 ST programs.

- **Stack**: React SPA (Vite + React 19 + TypeScript + Tailwind + Monaco) + Node.js API (Express + TypeScript + Prisma + SQLite)
- **Paths**: Aliases `@components`, `@stores`, `@services`, `@types`, `@styles` configured in `vite.config.ts`
- **Tests**: vitest in `web/`, 12 tests across `stParser.test.ts` (9) and `stValidator.test.ts` (3)
- **Deploy**: Railway for API (`api/`) with SQLite volume at `/data`; frontend on Vercel (Git-connected)
- **Design**: Dark/Light dual theme, brand orange `#f97316`, three-panel layout
- **Monorepo**: Frontend code lives in `web/` subdir; `vercel.json` at repo root sets `"rootDirectory": "web"`

---

## 2. Architecture Map

```
App.tsx
├── Left: ChatPanel (AI generation)
│   ├── GuidedMode (4-step form)
│   ├── ChatMode (placeholder)
│   ├── HistoryMode (placeholder)
│   └── ValidationPanel (post-generation validation)
├── Center: Resizable split
│   ├── STEditor (Monaco, top)
│   └── LadderView (SVG LD, bottom)
└── Right: Resizable split
    ├── ProjectTree (POU list)
    └── VarTable (variable list)
```

**Key Services**:
- `stParser.ts`: ST → LD rungs (contacts, coils, timers, counters, parallel branches)
- `stValidator.ts`: Validates ST code, exports logs (JSON/CSV)
- `fileParser.ts`: CSV/Excel/TXT import for I/O lists
- `ai.ts`: SSE streaming to Kimi API

---

## 3. Current Status (Last Updated)

### Recently Completed
1. **Validation log export** — `downloadValidationLog()` supports JSON/CSV with metadata
2. **LD vertical stacking fix** — SVG `<g transform="translate(...)">` per rung
3. **LD layout improvements** — contact spacing 60px, timer/counter positioning, parallel branches
4. **SSE streaming fix** — `indexOf('\n\n')` loop instead of `split('\n\n')`
5. **AI variable naming** — exact I/O addresses forced, English aliases forbidden
6. **Auth persistence** — `isAuthenticated` + `user` persisted in Zustand

### Active Optimizations (P0 → P3)
See `OPTIMIZATION_TODO.md` for full list. **P0, P1, and P2 are complete.** Currently ready for P3 items (Web Worker parsing, LD simulation mode).

### Known Issues
- ChatMode / HistoryMode are placeholder stubs
- No global search / command palette
- LD ↔ ST bidirectional linkage not implemented

---

## 2.5 Deploy & Version Management

### Fixed URLs
| Branch | Environment | URL |
|--------|------------|-----|
| `main` | Production | `https://plc-aistudio-web.vercel.app` |
| `develop` | Preview (test) | `https://plc-aistudio-web-git-develop-andyc212-3496s-projects.vercel.app` |

### Development Workflow
```bash
# 开发新功能 → 自动部署到 Preview
git checkout develop
git add .
git commit -m "feat: xxx"
git push origin develop   # Vercel auto-deploys to fixed Preview URL

# 上线 → 自动部署到 Production
git checkout main
git merge develop
git push origin main      # Vercel auto-deploys to Production URL
```

### Version Number
- Defined in `web/src/config/version.ts` as `APP_VERSION`
- Displayed in Toolbar (`BETA vX.Y.Z`) and Settings "About" section
- Build time injected by Vite via `import.meta.env.VITE_BUILD_DATE`
- Bump version before each significant release

### Theme System
- `tailwind.config.js`: `darkMode: 'class'`
- CSS variables in `index.css`: `:root` = light, `.dark` = dark
- `uiStore.ts`: `theme: 'dark' | 'light'`, persisted to `localStorage` (`panicstudio-theme`)
- `main.tsx`: syncs `localStorage` theme to `document.documentElement.classList` on boot
- Toolbar has ☀️/🌙 quick-toggle; Settings has Dark/Light selector

---

## 4. Design Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04 | Dark theme + orange accent | PLC dev tools are traditionally dark; orange = Panasonic brand warmth |
| 2026-04 | SVG for LadderView (not Canvas) | Easier to add interactivity (click/hover) later; text rendering quality |
| 2026-04 | Zustand over Redux | Simpler for small state; `persist` middleware for auth |
| 2026-04 | SSE over WebSocket | One-way streaming from Kimi API; simpler infra |
| 2026-04 | SQLite on Railway | Single-tenant MVP; mounted at `/data` for persistence |

---

## 5. Testing Checklist

After EVERY code change:
```bash
cd panicstudio/web && npm run test     # 12 tests must pass
cd panicstudio/web && npx tsc --noEmit # 0 type errors
```

---

## 6. How to Avoid Context Loss

**When context is compacted**, the compaction summary is provided at session start.
**This file (`AGENTS.md`) is the anchor** — it contains the project map, current status, and design decisions.

**Before starting work, always**:
1. Read `AGENTS.md` (this file)
2. Read `OPTIMIZATION_TODO.md` for current tasks
3. Run tests to confirm baseline

**After completing work, always**:
1. Update `AGENTS.md` "Current Status" section
2. Update `OPTIMIZATION_TODO.md` with completion notes
3. Append to `CHANGELOG.md` (or create if missing)
4. Run tests and commit
