# @ulabe/dsh-conversation-nav

DeepSeek Harness (DSH) 客户端插件：**对话位置导航**。

在对话界面右侧添加一个悬浮按钮，点击打开抽屉，列出当前会话的**全部用户消息**（自动分页加载完整历史），点击任意条目平滑滚动到对话中的对应位置并高亮。显示效果参考 DeepSeek 网页版对话导航：圆角列表项、聊天气泡图标、单行摘要、相对时间、滑入动画。

## 目录结构

```
dsh-conversation-nav/
├── install.ps1        # 兜底安装脚本（仅无 dsh CLI 的桌面打包版使用）
├── uninstall.ps1      # 兜底卸载脚本
├── README.md
├── package.json       # 插件元数据：dsh.bundle（bundle 层）+ dsh.client（浏览器半）
├── cordis.patch.yml   # bundle 层（被 dsh plugin add 识别并应用）
└── lib/
    ├── index.js       # Node 侧入口（no-op apply）
    └── client.js      # 浏览器侧 bundle（唯一实现，手写无构建）
```

## 安装（推荐：`dsh plugin add`）

插件包是标准的 DSH **bundle**（`package.json` 声明 `dsh.bundle.patch`），可通过官方 CLI 安装。需要 `dsh` CLI（源码版 `pnpm dsh` 或 `npx @deepseek-ai/dsh`；桌面打包版不内置 CLI）。

```bash
# 本地 checkout 安装（进入插件目录）
dsh plugin --profile web add ./@ulabe/dsh-conversation-nav

# 或发布到 npm 后按包名安装
dsh plugin --profile web add @ulabe/dsh-conversation-nav
```

`dsh plugin add` 会把包加进 profile 的 `dsh.profile.bundles`（自动 reconcile），随后加载本包的 `cordis.patch.yml` 层激活插件条目，并通过 `dsh.client` 声明向浏览器服务 UI bundle。**装完重启 dsh 生效**。

卸载：

```bash
dsh plugin --profile web remove @ulabe/dsh-conversation-nav
```

## 兜底安装（无 dsh CLI 的桌面打包版）

```powershell
cd D:\Plugins\dsh-conversation-nav
.\install.ps1        # 复制插件包到 ~/.dsh/profiles/node_modules + 写 cordis.patch.yml 条目
.\uninstall.ps1      # 卸载
# 完全退出并重启 DeepSeek Harness
```

## 发布到 npm（可选）

```bash
npm login
npm publish --access public
```

发布后任意机器可直接 `dsh plugin --profile web add @ulabe/dsh-conversation-nav`。包已带 `keywords: ["dsh-plugin"]`，会被 dsh-store / dsh-market 等社区商店收录。

## 兼容性与已知限制

- **API 版本耦合**：使用 DSH 客户端 API `ctx.slots`（`shell.overlay` 注入）、`ctx.sessions.binding()`、`Session.loadOlder()`、`ConversationSnapshot.nodes`。DSH 大版本升级后若这些 API 变化，插件可能失效，需按新版本适配。
- **事件窗口**：快照只包含已加载的事件窗口，插件会在抽屉打开时自动 `loadOlder()` 直到加载完整历史。
- **跟随当前会话**：导航仅反映当前打开的会话；切换会话自动跟随。
- **无需构建**：`lib/client.js` 是手写的 bundle（`window.__ModuleLoader__.load` 格式），改完直接生效（重启）。

## 常见问题

| 问题 | 处理 |
|---|---|
| 改了代码/样式但重启后没变化 | 完全退出 Harness（含托盘）再启动；或 Ctrl+Shift+R 强刷 |
| `dsh plugin add` 后按钮没出现 | 确认包声明 `dsh.bundle` 且已进入 profile bundles；`dsh --profile web --dump-config` 应看到插件层；重启 |
| 桌面打包版没有 `dsh` 命令 | 用兜底 `install.ps1`，或改用源码版/`npx @deepseek-ai/dsh` |
| DSH 升级后按钮消失 | 检查控制台错误；确认 `dsh-client-runtime` API 未变，必要时适配 `lib/client.js` |
| 想要不跟随当前会话/调整样式 | 编辑 `lib/client.js`（样式在文件顶部 css 数组，逻辑在 `makeNavPanel`），重装后重启 |
