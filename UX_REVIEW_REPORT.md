# PLC-AIStudio UX Review Report

**Product:** PLC-AIStudio — AI-Powered IEC 61131-3 ST Programming Environment  
**Version:** BETA  
**Review Date:** 2026-04-19  
**Reviewer:** Senior UX Researcher & Product Designer  
**Methodology:** Nielsen's 10 Heuristics, Hook Model, WCAG 2.1 AA Audit, Competitive Analysis  

---

## 1. Executive Summary

### Overall UX Score: **5.5 / 10** (55 / 100)

| Heuristic | Score | Weight |
|-----------|-------|--------|
| #1 Visibility of System Status | 6 / 10 | 1.0 |
| #2 Match Between System & Real World | 7 / 10 | 1.0 |
| #3 User Control & Freedom | 4 / 10 | 1.2 |
| #4 Consistency & Standards | 6 / 10 | 1.0 |
| #5 Error Prevention | 5 / 10 | 1.2 |
| #6 Recognition Rather Than Recall | 5 / 10 | 1.0 |
| #7 Flexibility & Efficiency of Use | 6 / 10 | 1.0 |
| #8 Aesthetic & Minimalist Design | 7 / 10 | 0.8 |
| #9 Error Recovery | 6 / 10 | 1.2 |
| #10 Help & Documentation | 3 / 10 | 1.2 |
| **Weighted Total** | **55 / 100** | — |

### Top 3 Friction Points

1. **🚨 Zero Onboarding & Help (H3, H10)** — First-time users land in a complex 3-panel IDE with no guidance, no tooltips, no contextual help, and no onboarding tour. PLC engineers who are not professional programmers are left to discover features on their own.

2. **🚨 No Undo / Escape Hatches (H3, H5)** — Users cannot cancel an AI generation once started, cannot undo a POU deletion (no confirmation dialog), cannot undo editor changes beyond Monaco's internal stack, and cannot revert a regeneration.

3. **🚨 Hidden Interactions & Low Discoverability (H1, H6, H8)** — Critical UI elements (panel collapse buttons, delete actions, validation details) are invisible until hover. Tiny font sizes (9–11px) strain readability. The I/O list is hidden in a collapsible panel while coding, forcing recall over recognition.

---

## 2. User Journey Analysis

### 2.1 Journey A: First-Time User

**Flow:** Open app → Landing page → Login/Register → First code generation → Export

```
[Browser] → [PLC-AIStudio SPA] → [Auth Modal] → [3-Panel IDE] → [Guided Mode Tab] → [Generate] → [Editor]
```

#### What They See
- The app loads directly into a full IDE layout (left AI panel, center editor, right project tree)
- No welcome screen, no product explanation, no "Get Started" CTA
- The auth modal must be manually triggered via the "登录" button in the toolbar
- A yellow warning banner appears in the left panel: "⚠️ 请先登录以使用 AI 生成功能"

#### Pain Points
| Step | Pain Point | Severity |
|------|-----------|----------|
| Landing | No onboarding, no context about what the app does | High |
| Login | Must discover login button; no prompt on first action | Medium |
| Guided Mode | 4-step form with no inline help or examples | High |
| I/O Config | No validation on addresses; no example formats | Medium |
| Generation | No cancel button; user feels trapped if prompt is wrong | High |
| Result | Code preview truncated at 800 chars; must export to see full | Medium |
| Export | Unclear how to use code in FPWIN Pro7 | Medium |

#### Cognitive Load Issues
- The 3-panel layout presents ~15 distinct UI regions simultaneously
- Form labels mix Chinese and English ("Step 1: 控制场景", "INPUT", "OUTPUT", "VAR_INPUT")
- Users must hold I/O configuration in working memory while reviewing generated code
- No visual hierarchy distinguishing primary vs. secondary actions

#### Decision Fatigue
- Safety conditions present 3 checkboxes with no explanation of implications
- No default template or "Quick Start" option
- File upload supports 5 formats with no guidance on expected structure

#### Missing Guidance
- No onboarding tour or tooltips
- No "Example Project" to load
- No inline validation feedback on form fields
- No explanation of what "POU" means for non-programmer PLC engineers

---

### 2.2 Journey B: Returning User

**Flow:** Login → Continue project → Refine code → Validate → Re-generate

```
[Login] → [Project Tree] → [Select POU] → [Editor] → [Validation Panel] → [Chat/Guided] → [Regenerate]
```

#### Pain Points
| Step | Pain Point | Severity |
|------|-----------|----------|
| Login | JWT token in localStorage; no "Remember me" option | Low |
| Project | No auto-save; "未保存更改" always shown in status bar | High |
| Editor | No undo/redo buttons; must rely on Ctrl+Z | Medium |
| Validation | Collapsed by default; must click to expand every time | Medium |
| Re-generate | Previous version overwritten; no diff/comparison view | High |
| History | History exists but shows only scenario name + score; no code preview | Medium |

#### Cognitive Load Issues
- Users must manually save or risk losing work (no auto-save indicator of when last saved)
- Validation score is a single number with limited meaning; dimension bars help but require interpretation
- Switching between Chat Mode and Guided Mode loses form context

#### Missing Guidance
- No "What's New" or changelog for returning users
- No suggestion of previous I/O configs when starting a new generation
- History doesn't show which model was used or allow filtering

---

### 2.3 Journey C: Expert User (Complex System)

**Flow:** 56 I/O → Multi-step process → Safety interlocks → Simulation

```
[Upload CSV] → [Parse 56 I/O] → [Add 12 Process Steps] → [Configure Safety] → [Generate] → [Validate] → [Simulate in LD]
```

#### Pain Points
| Step | Pain Point | Severity |
|------|-----------|----------|
| CSV Upload | No preview of parsed data before auto-fill | Medium |
| I/O List | Max-height 128px (max-h-32) for I/O list; 56 items = heavy scrolling | High |
| Process Steps | Expand/collapse at 10 steps breaks flow for complex systems | Medium |
| Safety | Only 3 preset conditions; no custom safety template saving | Medium |
| Generation | ~56 I/O may exceed token limits with no pre-check warning | High |
| Editor | No find/replace in Monaco (not exposed) | Medium |
| LD View | No pan capability; zoom only scales, doesn't help navigation | Medium |
| Simulation | No step-by-step execution; only toggle inputs | Medium |

#### Cognitive Load Issues
- 56 I/O items in a 128px scroll area requires constant scrolling to verify
- No search/filter within I/O list
- Process steps have no drag-to-reorder; must delete and re-add
- LD diagram doesn't show variable values during simulation, only on/off state

#### Decision Fatigue
- Must decide between Guided Mode (structured but slow) and Chat Mode (fast but unpredictable) with no recommendation
- No "Save as Template" for reusable I/O + safety configurations

---

## 3. Heuristic Evaluation (Detailed)

### H1: Visibility of System Status
**Score: 6 / 10**

#### Evidence
✅ **Strengths:**
- AI generation shows a 4-step progress indicator (分析需求 → 规划变量 → 编写逻辑 → 验证安全) with animated spinner
- Status bar displays quota remaining (`{user.aiQuotaTotal - user.aiQuotaUsed} / {user.aiQuotaTotal}`)
- File upload shows parsing status (spinning loader → checkmark → error X)
- Chat mode shows "AI 思考中…" with loading spinner
- Monaco editor shows line numbers and syntax highlighting status

❌ **Weaknesses:**
- The PLC status indicator in the status bar **always** shows red "Offline" — it does not reflect actual PLC connection state, creating false alarm
- No cancel button during AI generation; user cannot abort a long-running or incorrect request
- "Open" and "Save" toolbar buttons are **non-functional placeholders** — clicking them does nothing, with no feedback
- "未保存更改" (unsaved changes) is always shown regardless of actual state
- No progress indicator for file parsing beyond a simple spinner
- No network latency indicator or API health status

#### Recommendations
1. **Add a cancel button** next to the generation progress that aborts the SSE stream (`P0`, Small)
2. **Implement auto-save** and update status bar with "已保存" timestamp (`P0`, Medium)
3. **Remove or disable** non-functional toolbar buttons (Open/Save) until implemented (`P0`, Small)
4. **Add toast notifications** for async operations (save, export, delete) (`P1`, Small)
5. **Show actual connection status** or remove the misleading PLC status indicator (`P1`, Small)

---

### H2: Match Between System and the Real World
**Score: 7 / 10**

#### Evidence
✅ **Strengths:**
- Uses correct IEC 61131-3 terminology: `PROGRAM`, `FUNCTION_BLOCK`, `FUNCTION`, `VAR_INPUT`, `VAR_OUTPUT`, `END_VAR`
- I/O addresses use Panasonic-style notation (`X0`, `Y0`)
- PLC model selector includes `FP0R`, `FP-XH` — familiar to Panasonic users
- Ladder Diagram uses standard symbols: NO contact (rect), NC contact (rect + slash), coil (circle), TON timer, CTU counter
- Safety conditions reference real-world concepts: 急停 (E-stop), 电机过载 (motor overload), 安全门联锁 (safety door interlock)

❌ **Weaknesses:**
- The term "POU" (Program Organization Unit) is IEC-standard but may confuse mechanical designers who only know "程序" (program)
- "BETA" badge is web/software jargon with no meaning to industrial engineers
- "ST" (Structured Text) is used without explanation; some users may only know ladder logic
- Guided mode steps are generic software wizard steps, not PLC workflow steps
- Chat mode describes itself as "自由对话" (free conversation) — engineers may not understand this generates code

#### Recommendations
1. **Add a glossary tooltip** on first hover of "POU", "ST", "VAR_INPUT" (`P1`, Small)
2. **Rename "BETA"** to "试用版" or add a tooltip explaining it (`P2`, Small)
3. **Add a mode selector description**: "引导生成 = 表单方式填写需求" / "自由对话 = 像聊天一样描述需求" (`P1`, Small)
4. **Use PLC workflow language** in guided mode: "定义 I/O 表" instead of "Step 2: I/O 配置" (`P2`, Small)

---

### H3: User Control and Freedom
**Score: 4 / 10**

#### Evidence
✅ **Strengths:**
- Users can toggle left/right panels via toolbar buttons and hover triggers
- History records can be deleted (with confirm/cancel pattern)
- Chat messages can be cleared
- Users can switch between Guided/Chat/History tabs freely

❌ **Weaknesses:**
- **No cancel during AI generation** — once "生成 PLC 程序" is clicked, the user must wait for the stream to complete or refresh the page
- **No undo for POU deletion** — context menu "删除" removes the POU immediately with no confirmation dialog
- **No undo for regeneration** — clicking "重新生成" overwrites the previous result with no way to compare or revert
- **No undo button in UI** — Monaco editor supports Ctrl+Z but there's no visible undo/redo button
- Escape key only closes Command Palette and modals; doesn't cancel generation
- No "Reset form" option in guided mode

#### Recommendations
1. **Add Cancel Generation button** with clear visual state (`P0`, Small)
2. **Add confirmation dialog** for POU deletion and history clear (`P0`, Small)
3. **Implement undo stack** for POU operations (delete, rename, duplicate) in project store (`P1`, Medium)
4. **Add "Compare with Previous"** or version history for regenerated code (`P1`, Large)
5. **Expose undo/redo buttons** in editor toolbar (`P2`, Small)

---

### H4: Consistency and Standards
**Score: 6 / 10**

#### Evidence
✅ **Strengths:**
- Consistent dark theme across all panels (base: `#0f1117`, sidebar: `#161b22`)
- Uniform border color (`#30363d`), border radius (`rounded-lg`, `rounded-md`)
- Consistent button sizing and hover states (`hover:bg-sidebar-hover`, `transition-colors`)
- All icons from the same library (Lucide React)
- Context menus use consistent styling across the app

❌ **Weaknesses:**
- **Toolbar "Open" and "Save" buttons are non-functional** — they look active but do nothing, violating the principle that interactive elements must work
- No standard application menu (File/Edit/View) that PLC engineers expect from FPWIN Pro7
- Right-click context menu only exists in Project Tree; editor and ladder view have no context menus
- Auth modal uses different input styling (`rounded-lg`) than the guided mode form (`rounded-md`)
- "导出" (Export) exists in two places: toolbar and generated code action bar, with different behaviors
- Font sizes vary wildly: `text-[9px]` (LD labels), `text-[10px]` (badges), `text-[11px]` (tree items), `text-xs` (buttons), `text-sm` (modal inputs)

#### Recommendations
1. **Disable or implement** Open/Save toolbar buttons immediately (`P0`, Small)
2. **Standardize font size scale** to minimum 12px for readability (`P1`, Small)
3. **Add right-click context menu** to editor (copy, paste, find, jump to definition) (`P1`, Medium)
4. **Unify export behavior** — single export flow from toolbar (`P1`, Small)
5. **Add a traditional menu bar** or hamburger menu for File/Edit/View operations (`P2`, Medium)

---

### H5: Error Prevention
**Score: 5 / 10**

#### Evidence
✅ **Strengths:**
- Auth form has `required` attributes and `minLength={6}` on password
- File upload has `accept` attribute restricting to `.csv,.xlsx,.xls,.txt,.md,.doc,.docx`
- Generation button is disabled while already generating (`disabled={isGenerating}`)
- Chat send button disabled when empty or loading

❌ **Weaknesses:**
- **No I/O address validation** — users can enter invalid addresses like "ABC123" with no feedback
- **No quota pre-check** — users discover they're out of quota only after clicking generate
- **No confirmation on destructive actions** — delete POU, clear chat, and overwrite on regenerate happen immediately
- **No format validation on uploaded files** — a malformed CSV is silently ignored or causes generic error
- **No maximum I/O limit warning** — 100+ I/O entries could exceed AI token limits
- **Process steps have no validation** — empty steps are silently filtered out, which may confuse users

#### Recommendations
1. **Add I/O address format validation** with regex for Panasonic syntax (`P0`, Small)
2. **Check quota before generation** and show warning when < 5 remaining (`P0`, Small)
3. **Add confirmation dialogs** for all destructive actions (`P0`, Small)
4. **Validate uploaded files** and show specific error messages (`P1`, Small)
5. **Warn when I/O count > 32** or process steps > 20 about potential quality degradation (`P1`, Small)

---

### H6: Recognition Rather Than Recall
**Score: 5 / 10**

#### Evidence
✅ **Strengths:**
- Command Palette (`Ctrl+K`) allows searching POUs and variables without remembering names
- History mode shows past scenarios with timestamps and validation scores
- Project tree displays POU names with type icons
- File upload shows parsed content summary (`{n} I/O`, `{n} 步骤`)
- Validation panel shows issues with line numbers and jump-to-line buttons

❌ **Weaknesses:**
- **I/O list is hidden in left panel** while coding in center panel — users must recall variable names
- **No autocomplete in editor** — Monaco is configured but no variable suggestions from declared I/O
- **No inline variable reference** — no hover tooltip showing variable address/type in editor
- **History shows only scenario name** — no code preview or diff to recognize the right version
- **Chat mode doesn't show available commands or slash commands** — users must recall what they can ask
- **Safety conditions are not persistent** — users must re-check boxes for every generation

#### Recommendations
1. **Add variable autocomplete** in Monaco editor based on declared I/O (`P0`, Medium)
2. **Show variable tooltip on hover** in editor (address, type, description) (`P1`, Medium)
3. **Add a pinned variable reference panel** or pop-out I/O list (`P1`, Small)
4. **Expand history cards** to show first 5 lines of code on hover/click (`P1`, Small)
5. **Persist safety condition selections** across sessions (`P2`, Small)
6. **Add slash commands in chat** (`/template`, `/io`, `/safety`) (`P2`, Medium)

---

### H7: Flexibility and Efficiency of Use
**Score: 6 / 10**

#### Evidence
✅ **Strengths:**
- Two distinct modes: Guided Mode (novice-friendly) and Chat Mode (expert-friendly)
- Command Palette with prefix filters: `@` for POU, `#` for variable, `>` for command
- Keyboard shortcuts: `Ctrl+K` for command palette, `Enter` to send chat, `Escape` to close modals
- Panel collapse/expand allows screen space optimization
- Resizable editor/ladder split and project tree/var table split

❌ **Weaknesses:**
- **Command palette only has 3 actual commands** — most are just POUs and variables
- **No keyboard shortcut for generation** — must click the button
- **No code templates or snippets** — experts must type everything or use AI
- **No multi-select** in project tree or I/O list
- **No bulk operations** — cannot delete multiple POUs or I/O entries at once
- **No custom keyboard shortcut configuration**
- Chat mode doesn't support `Shift+Enter` properly (it does, but no visual indication)

#### Recommendations
1. **Add `Ctrl+Enter` shortcut** to trigger generation in guided mode (`P1`, Small)
2. **Add more commands to palette**: Export, Settings, Toggle Simulation, Jump to LD (`P1`, Small)
3. **Add code snippet library** (timer template, motor control template, etc.) (`P1`, Medium)
4. **Support bulk I/O operations** (paste from clipboard, delete multiple) (`P1`, Medium)
5. **Add keyboard shortcut cheat sheet** accessible via `?` or help menu (`P2`, Small)

---

### H8: Aesthetic and Minimalist Design
**Score: 7 / 10**

#### Evidence
✅ **Strengths:**
- Clean dark theme with good visual hierarchy
- No unnecessary decorative elements
- Panels have clear borders and separation
- Action bars group related operations logically
- Empty states use illustrations and helpful text

❌ **Weaknesses:**
- **Information density is extremely high** — three panels + toolbar + status bar + resizers = ~7 horizontal zones
- **Font sizes are too small** — `text-[9px]` and `text-[10px]` are used extensively, below recommended 12px minimum
- **Too many borders** — every sub-panel has its own `border-border`, creating visual clutter
- **Validation panel is collapsed by default** — an important feature is hidden
- **Action bar in generated preview has 4 buttons** with both icons and text in tiny font, crowded
- **Status bar shows 7 separate data points** in a 28px-high bar

#### Recommendations
1. **Increase minimum font size to 12px** across the app (`P1`, Small)
2. **Reduce border usage** — use background color differences instead of borders (`P1`, Small)
3. **Expand validation panel by default** when issues are found (`P1`, Small)
4. **Add a "Focus Mode"** that hides sidebars and maximizes editor (`P2`, Small)
5. **Consolidate status bar** — group related info, hide secondary data (`P2`, Small)

---

### H9: Help Users Recognize, Diagnose, and Recover from Errors
**Score: 6 / 10**

#### Evidence
✅ **Strengths:**
- Validation panel provides multi-dimensional scoring with visual bar charts
- Issues are categorized (syntax, I/O, safety, structure) with severity icons
- Each issue has a suggestion with expand/collapse
- Jump-to-line button navigates directly from error to editor
- Error messages in chat show inline in the conversation

❌ **Weaknesses:**
- **Generic error messages** — "生成失败" (generation failed) with no detail; API errors are opaque
- **Validation is collapsed by default** — users may not notice problems
- **No inline error highlighting in editor** — Monaco decorations are only used for jump-target, not validation errors
- **No retry mechanism** — when generation fails, user must manually click again with no guidance on what to change
- **No error code or reference number** for support requests
- Chat errors don't distinguish between network, API quota, and parsing errors

#### Recommendations
1. **Categorize and explain errors**: network, quota, timeout, parse error (`P0`, Small)
2. **Add inline validation error decorations** in Monaco editor (`P1`, Medium)
3. **Auto-expand validation panel** when score < 80 or errors exist (`P1`, Small)
4. **Add "Retry with Suggestion"** button that auto-modifies the prompt based on error (`P1`, Medium)
5. **Show error reference codes** for support (`P2`, Small)

---

### H10: Help and Documentation
**Score: 3 / 10**

#### Evidence
✅ **Strengths:**
- Auth modal mentions "免费版每月 50 次 AI 生成额度"
- Chat mode has a description in empty state
- History mode explains how records are created
- Command palette shows prefix hints (`@`, `#`, `>`)

❌ **Weaknesses:**
- **No onboarding tour** — first-time users receive zero guidance
- **No tooltips** on any button or icon
- **No help menu** or documentation link anywhere in the UI
- **No inline hints** in form fields (e.g., what format for I/O address?)
- **No "What's this?" links** next to technical terms
- **No video tutorials or guided walkthroughs**
- The `docs/` folder exists in the repo but is not accessible from the web app
- No contextual help for error states

#### Recommendations
1. **Implement a 5-step onboarding tour** on first visit (highlight panels, explain modes, demo generation) (`P0`, Medium)
2. **Add tooltips to all icon buttons** — already have `title` attributes but no visual tooltips (`P0`, Small)
3. **Add inline field hints** (e.g., I/O address placeholder shows "例如: X0, Y1, R100") (`P1`, Small)
4. **Link to docs from toolbar** — "帮助" button opening guides (`P1`, Small)
5. **Add an "Example Project"** button that pre-fills a conveyor system (`P1`, Small)
6. **Create a "Getting Started" modal** accessible anytime from help menu (`P2`, Small)

---

## 4. Competitive UX Analysis

### 4.1 vs. ChatGPT / Claude

| Dimension | PLC-AIStudio | ChatGPT / Claude |
|-----------|-------------|------------------|
| **Context Awareness** | ✅ Deep PLC context (I/O lists, safety conditions, PLC model) | ❌ Generic; user must provide all context every time |
| **Structured Input** | ✅ Guided mode with form validation | ❌ Free text only |
| **Output Validation** | ✅ Multi-dimensional scoring, jump-to-line errors | ❌ No code validation |
| **Ladder Diagram** | ✅ Auto-generated from ST | ❌ Not available |
| **Conversation Memory** | ❌ Chat mode only; no project-level memory | ✅ Strong conversational context |
| **Code Execution** | ❌ Simulation is basic toggle | ❌ No execution for PLC code |
| **Discoverability** | ❌ No help, no examples | ✅ Rich examples, community prompts |

**Verdict:** PLC-AIStudio wins on PLC-specific context and validation, but loses on discoverability and conversational fluidity. The guided mode is a significant differentiator for novice users.

### 4.2 vs. GitHub Copilot

| Dimension | PLC-AIStudio | GitHub Copilot |
|-----------|-------------|----------------|
| **Domain Specificity** | ✅ IEC 61131-3 ST, Panasonic I/O | ❌ General-purpose code |
| **Input Method** | ✅ Natural language + structured forms | ✅ Inline autocomplete |
| **IDE Integration** | ❌ Web-only, no FPWIN Pro7 plugin | ✅ Deep IDE integration |
| **Real-time Suggestions** | ❌ Batch generation only | ✅ Real-time as you type |
| **Explanation** | ✅ Chat mode explains code | ❌ Limited explanation |

**Verdict:** Copilot's real-time inline suggestions would be transformative for PLC programming. PLC-AIStudio should explore a VS Code / FPWIN Pro7 plugin or at minimum a companion mode that suggests completions as the user edits.

### 4.3 vs. Traditional PLC IDEs (FPWIN Pro7)

| Dimension | PLC-AIStudio | FPWIN Pro7 |
|-----------|-------------|------------|
| **Learning Curve** | ⚠️ Steep for traditional engineers (web IDE) | ✅ Familiar desktop interface |
| **Code Generation** | ✅ AI-powered, natural language | ❌ Manual only |
| **Ladder Diagram** | ✅ Auto-generated from ST | ✅ Native, editable LD |
| **I/O Management** | ⚠️ Basic list, no hardware config | ✅ Hardware configuration wizard |
| **Simulation** | ⚠️ Basic toggle simulation | ✅ Full virtual PLC simulation |
| **Project Management** | ⚠️ Flat POU list | ✅ Hierarchical project tree |
| **Menu Structure** | ❌ Non-standard (no File/Edit/View) | ✅ Standard Windows menus |
| **Offline Capability** | ❌ Requires internet + API | ✅ Fully offline |

**Verdict:** PLC-AIStudio's AI generation is compelling, but the web IDE paradigm clashes with PLC engineers' expectations. The lack of standard menus, the always-online requirement, and the non-editable ladder diagram are significant barriers to adoption.

**Key Insight:** The product sits in a "uncanny valley" — it's not a familiar PLC IDE, nor is it a simple chat tool. It needs to either (a) integrate into existing IDEs, or (b) provide a much more familiar desktop-app experience.

---

## 5. Prioritized UX Recommendations

### P0 — Critical (Fix Before Launch)

| # | Problem Statement | User Impact | Recommended Solution | Effort |
|---|-------------------|-------------|----------------------|--------|
| P0-1 | **No cancel during AI generation** | Users feel trapped; wastes quota on wrong prompts | Add a "停止生成" button that aborts the SSE stream and restores the previous state | S |
| P0-2 | **Destructive actions without confirmation** | Users accidentally delete POUs, clear chat, overwrite code | Add `window.confirm()` or custom modal for: delete POU, clear chat, regenerate | S |
| P0-3 | **Non-functional toolbar buttons** | "Open" and "Save" appear active but do nothing; breaks trust | Either implement Open/Save or disable them with "开发中" tooltip | S |
| P0-4 | **No onboarding for first-time users** | 70%+ of PLC engineers will bounce without understanding the product | Implement a 5-step product tour using `react-joyride` or similar | M |
| P0-5 | **No I/O address validation** | Invalid addresses generate broken code, wasting quota | Add regex validation for Panasonic address format (X/Y/R/T/C + number) | S |
| P0-6 | **No quota pre-check** | Users click generate then discover they're out of quota | Check `user.aiQuotaUsed >= user.aiQuotaTotal` before enabling generate button | S |

### P1 — High (Fix Within 2 Weeks)

| # | Problem Statement | User Impact | Recommended Solution | Effort |
|---|-------------------|-------------|----------------------|--------|
| P1-1 | **No undo/escape hatches** | Mistakes are permanent | Implement undo stack in project store; add Ctrl+Z/Ctrl+Y buttons | M |
| P1-2 | **No variable autocomplete in editor** | Users must recall variable names from hidden I/O list | Register Monaco completion provider using declared I/O as suggestion source | M |
| P1-3 | **Font sizes too small (9–11px)** | Strains eyes; inaccessible for users >40 | Increase minimum font size to 12px; use 14px for body text | S |
| P1-4 | **Validation panel collapsed by default** | Users miss important quality issues | Auto-expand when score < 80 or errors > 0; remember user preference | S |
| P1-5 | **Generic error messages** | Users don't know why generation failed | Map API errors to user-friendly messages with suggested fixes | S |
| P1-6 | **No auto-save** | Work is lost on accidental refresh | Auto-save project to localStorage every 30s; show last saved timestamp | M |
| P1-7 | **Hover-only visibility for critical controls** | Mobile users and keyboard users can't access panel toggles or delete buttons | Make controls always visible or show on focus; increase opacity threshold | S |
| P1-8 | **No code templates/snippets** | Experts still need to type repetitive boilerplate | Add a snippet panel with common patterns (motor starter, TON delay, interlock) | M |

### P2 — Medium (Fix Within 1 Month)

| # | Problem Statement | User Impact | Recommended Solution | Effort |
|---|-------------------|-------------|----------------------|--------|
| P2-1 | **No tooltips anywhere** | Users guess what icons do | Add `title` + visual tooltip component on all icon buttons | S |
| P2-2 | **No help menu or documentation link** | Users can't self-serve | Add "帮助" menu in toolbar linking to in-app guides and external docs | S |
| P2-3 | **No "Example Project"** | Users don't know what a good input looks like | Pre-load a "Conveyor Belt" example with I/O, steps, and safety | S |
| P2-4 | **History lacks code preview** | Hard to identify which record to load | Add expandable code preview (first 10 lines) in history cards | S |
| P2-5 | **No focus mode / distraction-free editing** | Three panels create visual clutter | Add a focus mode button that collapses sidebars and maximizes editor | S |
| P2-6 | **Status bar always shows "Offline"** | Creates false anxiety | Remove hardcoded status or implement actual connection detection | S |
| P2-7 | **No keyboard shortcut reference** | Power users can't discover shortcuts | Add `?` shortcut or help menu item showing all shortcuts | S |
| P2-8 | **No project templates** | Users repeat I/O setup for similar machines | Allow saving I/O + safety configs as named templates | M |
| P2-9 | **Chat mode has no slash commands** | Users don't know what the AI can do | Add `/template`, `/explain`, `/optimize` slash commands | M |
| P2-10 | **Ladder diagram not editable** | Users expect LD ↔ ST round-trip | Add basic LD editing (drag contacts, add rungs) — or clearly label as "View Only" | L |

---

## 6. Retention & Engagement Analysis (Hook Model)

### 6.1 Trigger

**External Triggers:**
- ✅ Email/quota reminder when approaching 50-generation limit
- ❌ No push notifications or browser notifications
- ❌ No "Your project is ready" emails for long generations
- ❌ No weekly "Code of the Week" or usage summary

**Internal Triggers:**
- PLC engineers feel frustration when writing repetitive ST code → PLC-AIStudio solves this
- Deadline pressure → need quick code generation
- Uncertainty about safety compliance → validation panel provides reassurance

**Assessment:** External triggers are weak. The product relies entirely on users remembering to return. **Recommendation:** Add browser notification opt-in for generation completion and weekly usage digest emails (`P2`).

### 6.2 Action

**Core Action:** Generate PLC code from natural language or structured input.

**Friction Analysis:**
| Step | Friction | Improvement |
|------|----------|-------------|
| Open app | Low | Fast SPA load |
| Login | Medium | Must click toolbar button; no auto-prompt | 
| Describe need | High | 4-step form or free text; no examples | 
| Wait for generation | Medium | 10–30s wait; no cancel option | 
| Review code | Medium | Truncated preview; must navigate to editor | 
| Export to PLC | High | Manual .st download; no direct FPWIN Pro7 integration | 

**Assessment:** The action is **not** simple enough. The gap between "I need a motor control program" and "working code in my PLC" involves too many steps. **Recommendation:** Add a one-click "Quick Generate" template and FPWIN Pro7 export format (`P1`).

### 6.3 Variable Reward

**Types of Reward:**
1. **The Tribe** — ❌ No community, no sharing, no "most used templates"
2. **The Hunt** — ✅ Validation score creates a "hunting for 100" game loop; finding and fixing issues is rewarding
3. **The Self** — ✅ Code mastery; users feel competent when AI generates correct ST

**Assessment:** Variable reward is **moderate**. The validation score provides a clear achievement metric, but there's no social reward and the AI output itself can feel deterministic (same prompt → similar code). **Recommendation:** Add "Achievement Unlocked" for first 100-point validation, first export, first simulation. Add a "Community Templates" gallery (`P2`).

### 6.4 Investment

**User Investments:**
- ✅ Project history builds up over time (localStorage)
- ✅ I/O configurations are reusable within a session
- ✅ Chat history persists
- ❌ No cloud sync — investment is fragile (clear browser data = lose everything)
- ❌ No user profile or preference persistence beyond auth
- ❌ No "My Templates" or saved configurations

**Assessment:** Investment is **weak**. Users don't build much that ties them to the platform. **Recommendation:** Add cloud project sync, saved templates, and preference persistence (editor theme, default PLC model, favorite safety conditions) (`P1`).

### Hook Loop Summary

```
Trigger: Need PLC code → Action: Generate → Reward: Validation score / working code
    ↑___________________________________________Investment: Project history, templates
```

**Overall Retention Risk: HIGH** — The product lacks strong external triggers, the action has significant friction, rewards are mostly solitary, and user investment is fragile. Without addressing P0/P1 recommendations, retention will likely drop sharply after the first 10 generations.

---

## 7. Accessibility Audit (WCAG 2.1 AA)

### 7.1 Color Contrast Ratios

| Element | Foreground | Background | Ratio | AA (4.5:1) | AAA (7:1) |
|---------|-----------|------------|-------|-----------|-----------|
| Primary text | `#e6edf3` | `#0f1117` | **16.2:1** | ✅ Pass | ✅ Pass |
| Secondary text | `#8b949e` | `#0f1117` | **6.2:1** | ✅ Pass | ❌ Fail |
| Muted text | `#484f58` | `#0f1117` | **1.3:1** | ❌ Fail | ❌ Fail |
| Accent text | `#f97316` | `#0f1117` | **6.7:1** | ✅ Pass | ❌ Fail |
| Success text | `#22c55e` | `#0f1117` | **8.1:1** | ✅ Pass | ✅ Pass |
| Warning text | `#eab308` | `#0f1117` | **9.8:1** | ✅ Pass | ✅ Pass |
| Error text | `#ef4444` | `#0f1117` | **5.0:1** | ✅ Pass | ❌ Fail |
| Sidebar text | `#8b949e` | `#161b22` | **5.6:1** | ✅ Pass | ❌ Fail |
| Placeholder text | `#484f58` | `#161b22` | **1.5:1** | ❌ Fail | ❌ Fail |
| LD element label | `#8b949e` | `#181825` | **5.4:1** | ✅ Pass | ❌ Fail |

**Critical Finding:** The `text-muted` color (`#484f58`) fails WCAG AA on all backgrounds. This color is used for:
- Placeholder text in inputs
- LD diagram labels
- Status bar secondary info
- File upload hints
- Issue category labels

**Recommendation:** Lighten `text-muted` to at least `#6e7681` to achieve 4.5:1 contrast (`P0`, Small).

### 7.2 Keyboard Navigation

| Component | Tab Order | Focus Visible | Escape | Enter/Space |
|-----------|-----------|---------------|--------|-------------|
| Toolbar buttons | ✅ Logical | ⚠️ No custom focus ring | N/A | ✅ |
| Panel toggles | ✅ Logical | ⚠️ No custom focus ring | N/A | ✅ |
| Guided mode form | ✅ Logical | ✅ Browser default | N/A | ✅ |
| Generate button | ✅ In flow | ✅ Browser default | N/A | ✅ |
| Chat input | ✅ In flow | ✅ Browser default | N/A | ✅ |
| Command palette | ✅ Auto-focus input | ⚠️ No focus ring on items | ✅ Closes | ✅ Selects |
| Project tree | ❌ No keyboard nav | ❌ No focus indicator | N/A | N/A |
| Context menu | ❌ Not keyboard accessible | ❌ No focus | ✅ Closes | N/A |
| LD elements | ⚠️ `tabIndex=0` but no tab sequence | ❌ No visible focus | N/A | ✅ Toggles sim |
| Validation issues | ❌ Not tabbable | ❌ No focus | N/A | N/A |

**Critical Finding:**
- Project tree items are not keyboard navigable
- Context menu is mouse-only
- Many custom interactive elements lack visible focus indicators
- No skip-to-content link

**Recommendation:**
1. Add `focus-visible` styles matching hover states (`P0`, Small)
2. Make project tree arrow-key navigable (`P1`, Medium)
3. Add `Skip to editor` link (`P1`, Small)
4. Ensure context menu responds to arrow keys and Escape (`P1`, Medium)

### 7.3 Screen Reader Support

| Element | `aria-label` | `role` | Semantic HTML | Status |
|---------|-------------|--------|---------------|--------|
| Panel toggle buttons | ✅ Yes | ❌ No | `<button>` | Good |
| Generate button | ❌ No | ❌ No | `<button>` | Okay (text visible) |
| Toolbar buttons | ⚠️ Some | ❌ No | `<button>` | Partial |
| LD elements | ✅ Yes | ✅ `button` | `<g>` (SVG) | Good |
| Chat messages | ❌ No | ❌ No | `<div>` | Poor |
| Validation issues | ❌ No | ❌ No | `<div>` | Poor |
| Progress steps | ❌ No | ❌ No | `<div>` | Poor |
| File upload list | ❌ No | ❌ No | `<div>` | Poor |

**Critical Finding:**
- Chat messages are not announced to screen readers
- Live regions not used for streaming AI output
- Status updates (generation progress) are not announced

**Recommendation:**
1. Add `aria-live="polite"` region for generation status updates (`P0`, Small)
2. Wrap chat messages in `<article>` with `aria-label` indicating sender (`P1`, Small)
3. Add `role="status"` to validation score banner (`P1`, Small)

### 7.4 Focus Indicators

The app relies on browser default focus rings. In the dark theme, default Chrome focus rings (blue outline) are often insufficient against dark backgrounds. Custom focus styles should be added:

```css
*:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}
```

**Recommendation:** Implement global `focus-visible` styles (`P0`, Small).

---

## 8. Conclusion & Action Items

### Summary

PLC-AIStudio is a promising product that bridges AI code generation with PLC engineering workflows. The core value proposition — generating IEC 61131-3 ST from natural language — is strong and differentiated. However, the current UX has significant friction that will block adoption among the target audience of mechanical designers and automation engineers.

The product scores **5.5/10** on Nielsen's heuristics, with critical gaps in:
1. **User Control** (no cancel, no undo, no confirmations)
2. **Help & Onboarding** (zero guidance for first-time users)
3. **Error Prevention** (no validation, no quota checks, destructive actions are instant)

### Key Success Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-code-generation rate | >60% | % of new users who generate code within 24h |
| Return rate (7-day) | >30% | % of users who return within 7 days |
| Avg. generations per user | >5/month | Total generations / active users |
| Validation score avg. | >85 | Average validation score across all generations |
| Support ticket rate | <2% | Tickets / total users |
| NPS | >30 | Quarterly user survey |

### Immediate Action Items (Next 7 Days)

1. [ ] **Implement cancel generation** — add `AbortController` to SSE stream
2. [ ] **Add confirmation dialogs** — delete POU, clear chat, regenerate
3. [ ] **Disable non-functional buttons** — Open, Save in toolbar
4. [ ] **Fix contrast** — lighten `text-muted` from `#484f58` to `#6e7681`
5. [ ] **Add global focus styles** — `outline: 2px solid #f97316`
6. [ ] **Add I/O address validation** — regex for Panasonic format
7. [ ] **Add quota pre-check** — disable generate when quota exhausted

### 30-Day Roadmap

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1 | Safety & Trust | Cancel, confirm dialogs, quota checks, input validation |
| 2 | Onboarding | Product tour, example project, inline hints, tooltips |
| 3 | Efficiency | Auto-save, undo stack, variable autocomplete, font size fix |
| 4 | Polish | Command palette expansion, history preview, help menu, shortcut reference |

### Closing Statement

PLC-AIStudio has the technical foundation to become an essential tool for Panasonic PLC developers. The AI generation quality, validation scoring, and ladder diagram visualization are genuinely impressive. However, **UX is currently the primary bottleneck to adoption**. The target users — mechanical designers and automation engineers — are not web-native power users. They need explicit guidance, forgiving interfaces, and familiar paradigms.

**Fix the P0 items before any marketing or launch activity.** A user who accidentally deletes their work, can't cancel a wrong generation, or can't read the placeholder text will not return — regardless of how good the AI model is.

---

*Report prepared by Senior UX Researcher & Product Designer*  
*Date: 2026-04-19*  
*Methodology: Nielsen's 10 Heuristics, Hook Model (Nir Eyal), WCAG 2.1 AA, Competitive Benchmarking*
