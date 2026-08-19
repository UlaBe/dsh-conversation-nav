# @ulabe/dsh-conversation-nav

DeepSeek Harness (DSH) 插件：**对话位置导航**。

右侧悬浮按钮打开一个**暗黑大纲式**导航抽屉，列出当前会话的**全部用户消息**（打开时自动加载完整历史）。点击任意条目平滑滚动（ease-out）定位到对应消息；**Scroll Spy** 随对话滚动实时高亮当前可视位置对应的导航项（品牌蓝 + 呼吸动效）。实时更新：AI 生成新内容时底部自动追加条目。
<img width="2124" height="1277" alt="image" src="https://github.com/user-attachments/assets/1901e9b7-636c-4569-a8ba-b5112e662028" />

<img width="2099" height="1312" alt="image" src="https://github.com/user-attachments/assets/b5e39b44-4243-4f47-a1ab-5fe844990636" />




## 安装

```bash
# 从 npm 安装（正式发布）
dsh plugin --profile web add @ulabe/dsh-conversation-nav
```

`dsh plugin add` 会把包加进 profile 的 `dsh.profile.bundles`（自动 reconcile），随后加载本包的 `cordis.patch.yml` 层激活插件条目，并通过 `dsh.client` 声明向浏览器服务 UI bundle。**装完重启 dsh 生效**。

卸载：

```bash
dsh plugin --profile web remove @ulabe/dsh-conversation-nav
```

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
| 需要 `dsh` CLI | `npm install -g @deepseek-ai/dsh` 或源码版 `pnpm dsh`；桌面打包版不内置 CLI |
| DSH 升级后按钮消失 | 检查控制台错误；确认 `dsh-client-runtime` API 未变，必要时适配 `lib/client.js` |
| 想要不跟随当前会话/调整样式 | 编辑 `lib/client.js`（样式在文件顶部 css 数组，逻辑在 `makeNavPanel`），重装后重启 |
