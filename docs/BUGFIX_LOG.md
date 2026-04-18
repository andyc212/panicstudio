# PLC-AIStudio Bug Fix Log

> 记录部署和优化过程中发现的所有问题、根因分析和修复方案。

---

## 一、部署阶段

### 1. Git 提交超时 — node_modules 被纳入版本控制

**现象**：`git add .` 产生数千条 CRLF 警告，命令超时。

**根因**：项目根目录缺少 `.gitignore`，`node_modules/` 和 `dist/` 被错误提交。

**修复**：添加 `.gitignore`：
```gitignore
web/node_modules/
api/node_modules/
web/dist/
api/dist/
**/.env
*.db
```

---

### 2. Railway 部署失败 — Railpack 找不到构建入口

**现象**：
```
Railpack could not determine how to build the app.
Script start.sh not found
```

**根因**：Railway 在根目录找不到 `package.json`（它在 `api/` 子目录中）。

**修复**：使用 Railway CLI 在 `api/` 目录下部署：
```bash
cd panicstudio/api
railway login
railway link
railway up
```

---

### 3. `npm ci` 失败 — lock file 不同步

**现象**：
```
npm error `npm ci` can only install packages when your package.json
and package-lock.json are in sync.
```

**根因**：手动修改 `package.json` 后未重新运行 `npm install`，`package-lock.json` 中的 `openai` 版本与实际不符。

**修复**：
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### 4. 数据库表不存在 — `The table main.users does not exist`

**现象**：注册/登录报 `Internal server error`，后端日志显示表不存在。

**根因**：SQLite 文件在 Railway 容器中是新创建的，但表结构没有初始化。

**修复**：在 `api/package.json` 中添加 `prestart` 钩子：
```json
{
  "prestart": "prisma migrate deploy",
  "start": "node dist/index.js"
}
```

---

### 5. Kimi API 401 Invalid Authentication

**现象**：AI 生成无输出，后端日志报 `401 Invalid Authentication`。

**根因**：使用了 **Kimi Code**（code.moonshot.cn）的 API Key（格式 `sk-kimi-...`），但后端调用的是 **Moonshot 开放平台**（platform.moonshot.cn）的端点。两者 Key 不通用。

**修复**：前往 https://platform.moonshot.cn 获取开放平台 Key（格式 `sk-...`，不含 `kimi-`）。

---

### 6. AI 生成前端无反应 — SSE 消息丢失

**现象**：Network 显示请求 200 且传输了 30+KB，但页面没有任何输出。

**根因**：前端 SSE 解析使用 `buffer.split('\n\n')`，当 `\n\n` 分隔符被 TCP chunk 截断到两个不同数据块时，消息永远留在 buffer 中无法被解析。

**修复**：改用 `indexOf('\n\n')` 循环查找完整消息边界：
```typescript
let boundary = buffer.indexOf('\n\n');
while (boundary !== -1) {
  const message = buffer.slice(0, boundary).trim();
  buffer = buffer.slice(boundary + 2);
  // 解析 message...
  boundary = buffer.indexOf('\n\n');
}
```

---

### 7. 数据库重置导致 Token 失效

**现象**：重新部署后，已注册用户无法登录，报 401。

**根因**：Railway 容器文件系统不持久，每次部署 SQLite 文件丢失。

**修复**：创建 Railway Volume 并挂载：
```bash
railway volume add --mount-path /data
railway variables set DATABASE_URL="file:/data/dev.db"
```

---

## 二、优化阶段

### 8. AI 使用英文别名代替 I/O 地址

**现象**：AI 生成 `StopButton`、`EmergencyStop` 而不是用户指定的 `X0`、`X1`。

**根因**：System Prompt 没有强制约束变量命名规则。

**修复**：
- System Prompt 新增强制规则：
  > **变量命名强制要求**：在 VAR 声明和代码逻辑中，必须直接使用用户提供的 I/O 地址作为变量名（如 X0, Y0），不得使用英文别名或自定义变量名
- `buildPromptFromForm` 追加约束：
  > **重要**：代码中所有变量必须使用上述 I/O 地址（如 X0, Y0），不要使用 StopButton、Motor 等英文别名。

---

### 9. 梯形图不显示

**现象**：AI 生成代码后，Ladder Diagram 区域始终显示占位图。

**根因**：`addPou()` 创建新 POU 后没有设置 `selectedPouId`，当前没有选中的 POU，解析器无从渲染。

**修复**：
```typescript
addPou: (pou) => set((state) => {
  if (!state.currentProject) return state;
  return {
    currentProject: {
      ...state.currentProject,
      poUs: [...state.currentProject.poUs, pou],
    },
    selectedPouId: pou.id,  // ← 新增
    hasUnsavedChanges: true,
  };
}),
```

---

### 10. 验证器误报 I/O 地址

**现象**：代码中明明声明了 `X0`，验证器报"使用了未声明的地址 X0"；还报"使用了未声明的地址 THEN"。

**根因**：地址提取正则太宽泛：
```typescript
const addressRegex = /\b([XYRDT][\w]+)\b/gi;
```
`THEN`、`TRUE`、`FALSE`、`RUNFLAG` 都被匹配为 I/O 地址。

**修复**：要求地址中 `[XYRDT]` 后面必须跟数字：
```typescript
const addressRegex = /\b([XYRDT]\d+\w*)\b/gi;
```

---

### 11. stParser 解析错误

**现象**：定时器/计数器行导致正则报错；自锁电路没有并联分支。

**根因**：
1. 直接赋值判断 `line.includes(':=')` 太宽泛，把 `Timer1(IN := X0, PT := T#5s)` 也当成赋值解析
2. `outputVar` 含特殊字符（如括号）时，`new RegExp(\`\\b${outputVar}\\b\`)` 报 "Unterminated group"
3. 自锁电路 `Y0 := X0 OR Y0` 排除了 `Y0` 后只剩 `X0`，无法生成并联触点

**修复**：
1. 直接赋值判断前排除定时器/计数器模式：
   ```typescript
   if (/\w+\s*\(\s*(IN|CU)\s*:=\s*.+\)/i.test(line)) { /* 跳过 */ }
   ```
2. 添加 `escapeRegex()` 转义特殊字符：
   ```typescript
   function escapeRegex(str: string): string {
     return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   ```
3. 自锁检测后保留自身作为并联分支：
   ```typescript
   if (isSelfLatch && conditions.length > 0) {
     conditions = [...conditions, [{ name: outputVar, negated: false }]];
   }
   ```

---

### 12. 页面刷新后登录状态丢失

**现象**：刷新页面后，`isAuthenticated` 变为 false，按钮被禁用。

**根因**：`authStore` 的 `persist` 只持久化了 `token`，`isAuthenticated` 恢复为默认值 `false`。

**修复**：
```typescript
partialize: (state) => ({
  token: state.token,
  isAuthenticated: state.isAuthenticated,
  user: state.user,
}),
```

---

## 三、测试覆盖

| 模块 | 测试文件 | 用例数 | 状态 |
|------|---------|-------|------|
| stParser | `web/src/services/parser/stParser.test.ts` | 9 | ✅ 通过 |
| stValidator | `web/src/services/parser/stValidator.test.ts` | 3 | ✅ 通过 |
| buildPromptFromForm | `api/src/services/kimiService.test.ts` | 2 | ✅ 通过 |
| **总计** | | **14** | **✅ 全部通过** |

---

## 四、运行测试

```bash
# 前端测试
cd panicstudio/web
npm test

# 后端测试
cd panicstudio/api
npm test
```
