# PanicStudio UX Optimization Roadmap

> **Rule**: Every completed item must have a `CHANGELOG.md` entry and passing tests.

---

## P0 — Critical (Do First)

### P0.1 Remove/fix placeholder tabs (ChatMode / HistoryMode)
**Status**: 🔄 In Progress  
**Files**: `web/src/components/ChatPanel/ChatMode.tsx`, `HistoryMode.tsx`, `index.tsx`  
**Problem**: Non-functional placeholder tabs confuse users.  
**Solution**: Add `ComingSoon` empty-state component with illustration + description.  
**Tests**: Visual regression (manual).  

### P0.2 Improve generated code result area
**Status**: ⏳ Pending  
**Files**: `web/src/components/ChatPanel/index.tsx`  
**Problem**: Code preview only shows 800 chars; no quick actions; validation panel defaults expanded.  
**Solution**:
- Increase preview height (`max-h-40` → `max-h-64`)
- Add action bar: [重新生成] [修改需求] [复制] [应用] [导出]
- ValidationPanel default `isExpanded=false`
- Add copy-to-clipboard feedback toast
**Tests**: Component render tests.  

### P0.3 Issue click-to-jump to editor line
**Status**: ⏳ Pending  
**Files**: `web/src/components/ValidationPanel/index.tsx`, `STEditor/index.tsx`  
**Problem**: Users must manually find error lines.  
**Solution**:
- `ValidationPanel`: wrap line numbers in clickable `<button>`
- `STEditor`: expose `jumpToLine(lineNumber)` via ref or store
- Click issue → Monaco `editor.revealLineInCenter(line)` + add highlight decoration
**Tests**: Unit test for line number extraction and jump logic.  

---

## P1 — High Priority

### P1.1 Collapsible left/right sidebars
**Status**: ⏳ Pending  
**Files**: `web/src/App.tsx`  
**Problem**: Middle editor squeezed on laptop screens.  
**Solution**:
- Add pin/collapse toggle on each panel header
- Collapsed state: icon-only bar (~40px), hover to expand
- Persist collapse state in localStorage
**Tests**: Layout math tests (ensure min width).  

### P1.2 Generation progress indicator
**Status**: ⏳ Pending  
**Files**: `web/src/components/ChatPanel/index.tsx`, `@services/api/ai.ts`  
**Problem**: 10-30s generation with only a spinner.  
**Solution**:
- Simulate 4-step progress in UI (analyzing → planning → writing → validating)
- Update progress text based on SSE chunk content heuristics
**Tests**: Mock SSE stream test.  

### P1.3 ProjectTree grouping + context menu
**Status**: ⏳ Pending  
**Files**: `web/src/components/ProjectTree/index.tsx`  
**Problem**: Flat list, no organization.  
**Solution**:
- Group by POU type (PROGRAM / FUNCTION_BLOCK / FUNCTION)
- Right-click context menu: rename, duplicate, delete, export
- Show last-modified + line count badges
**Tests**: Interaction tests.  

### P1.4 Global search / command palette (Ctrl+K)
**Status**: ⏳ Pending  
**Files**: New `CommandPalette.tsx`, `App.tsx`, `TopBar/index.tsx`  
**Problem**: No quick navigation.  
**Solution**:
- `>` commands (export project, create POU)
- `@` search POUs
- `#` search variables
- `?` search I/O addresses
**Tests**: Search filtering tests.  

---

## P2 — Medium Priority

### P2.1 LD ↔ ST bidirectional linkage
**Status**: ⏳ Pending  
**Files**: `LadderView/index.tsx`, `STEditor/index.tsx`, `stParser.ts`  
**Problem**: One-way ST→LD only.  
**Solution**:
- Parser: store source line number on each LD element
- LadderView: click element → emit `jumpToLine`
- STEditor: hover line → highlight corresponding LD element
**Tests**: Parser line-mapping tests.  

### P2.2 Multi-dimensional validation radar chart
**Status**: ⏳ Pending  
**Files**: `ValidationPanel/index.tsx`, `stValidator.ts`  
**Problem**: Single 0-100 score is reductive.  
**Solution**:
- 5 dimensions: syntax / IO coverage / safety / complexity / naming
- SVG radar chart (lightweight, no chart lib)
- Dimension tooltips with improvement tips
**Tests**: Score calculation tests.  

### P2.3 Full a11y audit & fixes
**Status**: ⏳ Pending  
**Files**: All components  
**Problem**: No aria-labels, poor contrast, no keyboard nav.  
**Solution**:
- Add `aria-label` to all icon-only buttons
- Run axe-core, fix contrast issues
- Tab order audit
- `F6` panel focus switching
**Tests**: a11y automated scan.  

---

## P3 — Future / Low Priority

### P3.1 Web Worker parsing for large files
**Status**: ⏳ Pending  
**Files**: `stParser.ts`, `stValidator.ts`  
**Problem**: Synchronous parsing blocks main thread on >1000 lines.  
**Solution**: Wrap parser/validator in Web Worker.  

### P3.2 Simulation mode for LD
**Status**: ⏳ Pending  
**Files**: `LadderView/index.tsx`  
**Problem**: Users can't test logic without hardware.  
**Solution**: Toggle input states → highlight active LD paths.  

### P3.3 Export `.st` / `.png` / `.svg` per POU
**Status**: ⏳ Pending  
**Files**: `ProjectTree/index.tsx`, `LadderView/index.tsx`  
**Problem**: Can only export validation logs.  
**Solution**: Add export menu with multiple formats.  

---

## Changelog

### 2026-04-19
- **Added**: Validation log export (JSON/CSV) — `stValidator.ts`, `ValidationPanel/index.tsx`
- **Fixed**: LD vertical stacking bug — `LadderView/index.tsx`
- **Improved**: Parser layout spacing — `stParser.ts`
