# PanicStudio 项目进度记录

> 本文档用于在上下文压缩后恢复项目状态。每次重要决策和里程碑完成后必须更新。

## 项目概述

- **名称**: PanicStudio
- **定位**: 帮助 Panasonic PLC 开发人员利用 AI（Kimi）快速编写 IEC 61131-3 标准 PLC 程序的 Web 应用
- **架构**: React SPA（前端）+ Node.js API（后端），前后端分离
- **收费模式**: 会员订阅制
- **AI 引擎**: Kimi API（Moonshot）

## 已完成的决策

| 日期 | 决策 | 说明 |
|------|------|------|
| 2026-04-18 | 架构从桌面应用改为 Web 应用 | 更简单，会员验证更自然，跨平台 |
| 2026-04-18 | 技术栈选型 | 前端: Vite+React+TS+Tailwind+Monaco；后端: Node.js+Express+TS+Prisma |
| 2026-04-18 | UI 设计方案 | 深色主题+三栏布局+引导式 AI 表单+品牌橙 #f97316 |

## 当前阶段

**Phase 1: 项目骨架 + UI 设计系统 ✅ 已完成**

### 已完成清单
- [x] 初始化前端 web/ 项目（Vite + React + TS）
- [x] 初始化后端 api/ 项目目录结构（Node.js + Express + TS）
- [x] 配置前端 Tailwind CSS v3 + 设计令牌（theme.css）
- [x] 搭建三栏布局骨架（AppLayout + Toolbar + StatusBar）
- [x] 创建共享类型定义（plc.ts, ai.ts, auth.ts）
- [x] 创建 Zustand 状态管理（uiStore, projectStore, authStore）
- [x] 创建面板占位组件（ChatPanel, Editor, LadderView, ProjectTree, VarTable）
- [x] 验证前端可编译运行（Dev 服务器: http://localhost:5173/）

### Phase 1 交付物
| 文件 | 说明 |
|------|------|
| `web/src/index.css` | Tailwind 导入 + 设计令牌 |
| `web/tailwind.config.js` | 自定义颜色、间距、动画 |
| `web/src/types/*.ts` | 共享类型定义（核心接口契约） |
| `web/src/stores/*.ts` | Zustand 状态管理 |
| `web/src/components/Layout/*.tsx` | 布局组件（Toolbar, StatusBar, AppLayout） |
| `web/src/components/*` | 面板占位组件 |
| `api/src/index.ts` | Express 服务入口 |
| `api/src/routes/*.ts` | 路由骨架（auth, ai） |
| `api/prisma/schema.prisma` | 数据库 Schema（待完善） |

## 已完成阶段

### Phase 1: 前端骨架 + UI 设计系统 ✅
### Phase 2: 后端 API 骨架 + 数据库 ✅
### Phase 3: AI 功能 + Kimi 接入 ✅（MVP 版本）
### Phase 4: ST 编辑器 + LD 可视化 ✅（MVP 版本）

## 当前阶段

**MVP 功能验证 + 完善**

### 已交付功能
| 功能 | 状态 | 说明 |
|------|------|------|
| 深色主题三栏布局 | ✅ | AI面板 + 编辑器 + 项目树 |
| Monaco ST 编辑器 | ✅ | IEC 61131-3 语法高亮 + 自定义主题 |
| LD 梯形图 SVG 渲染 | ✅ | 从 ST 代码自动解析生成 |
| 引导式 AI 表单 | ✅ | 场景/I/O/流程/安全条件 |
| AI 流式生成（SSE）| ✅ | 连接 Kimi API |
| JWT 会员认证 | ✅ | 注册/登录/验证 |
| 用量配额管理 | ✅ | 后端限流控制 |
| 项目/POU 管理 | ✅ | Zustand 状态管理 |

### 已完成完善项
- [x] 前端登录/注册 UI（AuthModal）
- [x] .st 文件导出
- [x] 更完善的 LD 解析器（定时器、计数器、Set/Reset、并联分支）
- [x] SKILL 模板库（电机/传送带/气动/安全互锁）
- [x] 用户指南（如何描述需求）

### 待完善（后续迭代）
- [ ] 代码验证面板（🟢/🟡/🔴）
- [ ] 部署上线（Vercel + Railway）

## 项目目录结构

```
panicstudio/
├── PROGRESS.md          # 本文件
├── web/                 # 前端 React SPA
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── api/                 # 后端 Node.js API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
└── docs/                # 用户文档与 SKILL（后续创建）
```

## 接口契约（前后端共享）

### AI 生成接口
- **Endpoint**: `POST /api/ai/generate`
- **Auth**: Bearer JWT
- **Request**: `{ plcModel, ioList, processFlow, safetyConditions, controlMode }`
- **Response**: SSE 流式返回 `{ type: "chunk" | "done", content: string }`

### 认证接口
- **注册**: `POST /api/auth/register` → `{ email, password }`
- **登录**: `POST /api/auth/login` → `{ email, password }`
- **验证**: `GET /api/auth/me` → Bearer JWT

## 设计令牌（前端）

```css
--bg-base: #0f1117;
--bg-sidebar: #161b22;
--bg-editor: #1e1e2e;
--bg-ld: #181825;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--text-accent: #f97316;
--border: #30363d;
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
```

## 下一步计划

1. 完成 Phase 1 项目骨架
2. Phase 2: 后端 API 骨架 + 数据库
3. Phase 3: AI 功能 + Kimi 接入
4. Phase 4: ST 编辑器 + LD 可视化
5. Phase 5: 会员系统
6. Phase 6: 项目管理 + 导出
7. Phase 7: 部署上线

## 注意事项

- Kimi API Key 只存储在服务端，永不暴露给前端
- 开发期后端数据库可用 SQLite 替代 PostgreSQL
- 前端状态管理使用 Zustand
- 会员系统采用 JWT + localStorage
