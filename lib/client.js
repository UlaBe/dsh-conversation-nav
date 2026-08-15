/**
 * @ulabe/dsh-conversation-nav — conversation position navigator.
 *
 * Right-edge floating button opening a drawer that lists every user message
 * in the current session; clicking an entry scrolls the chat to that message.
 * History loads automatically (window pagination) until the whole log is in.
 *
 * Browser bundle format: window.__ModuleLoader__.load({id, factory}).
 * External modules (react, runtime/client) are resolved from the module table.
 */
window.__ModuleLoader__.load({
	id: "@ulabe/dsh-conversation-nav",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let runtime = require("@deepseek-ai/dsh-client-runtime/client");

		// ── styles (DeepSeek-web-style drawer; module-table CSS injection) ──────
		const css = [
			".convnav-fab{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:2147483000;width:38px;height:38px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1,#e5e5e5);background:var(--dsw-alias-bg-raised,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-brand-primary,#4f6ef2);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.10);opacity:.92;transition:opacity .15s ease,transform .15s ease;padding:0}",
			".convnav-fab:hover{opacity:1;transform:translateY(-50%) scale(1.06)}",
			".convnav-drawer{position:fixed;top:0;right:0;bottom:0;width:300px;max-width:85vw;z-index:2147483001;background:var(--dsw-alias-bg-base,#fff);border-left:1px solid var(--dsw-alias-border-l1,#e5e5e5);box-shadow:-8px 0 24px rgba(0,0,0,.12);display:flex;flex-direction:column;font-size:14px;line-height:1.4;color:var(--dsw-alias-label-primary,#1a1a1a);animation:convnav-slide-in .28s cubic-bezier(.4,0,.2,1)}",
			"@keyframes convnav-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}",
			".convnav-header{display:flex;align-items:center;gap:8px;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l1,#f0f0f0);font-weight:600;flex:none;font-size:15px}",
			".convnav-header-icon{color:var(--dsw-alias-brand-primary,#4f6ef2);display:flex}",
			".convnav-close{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;color:var(--dsw-alias-label-secondary,#8e8ea0);padding:2px 7px;border-radius:6px}",
			".convnav-close:hover{background:rgba(128,128,128,.14);color:var(--dsw-alias-label-primary,#1a1a1a)}",
			".convnav-list{flex:1;overflow-y:auto;padding:12px 12px 20px;scroll-behavior:smooth}",
			".convnav-list::-webkit-scrollbar{width:4px}",
			".convnav-list::-webkit-scrollbar-track{background:transparent}",
			".convnav-list::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:10px}",
			".convnav-list::-webkit-scrollbar-thumb:hover{background:#b0b5bd}",
			".convnav-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:10px 14px;border-radius:10px;color:inherit;font:inherit;margin-bottom:2px;user-select:none}",
			".convnav-item:hover{background:rgba(128,128,128,.10)}",
			".convnav-icon{flex-shrink:0;width:18px;height:18px;color:var(--dsw-alias-label-secondary,#8e8ea0);display:flex;align-items:center;justify-content:center}",
			".convnav-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".convnav-time{flex-shrink:0;font-size:11px;color:var(--dsw-alias-label-secondary,#8e8ea0)}",
			".convnav-more{display:block;width:calc(100% - 20px);margin:4px 10px 8px;padding:6px 0;border:1px dashed var(--dsw-alias-border-l1,#e5e5e5);background:none;color:var(--dsw-alias-label-secondary,#8e8ea0);cursor:pointer;border-radius:8px;font-size:12px}",
			".convnav-more:hover{background:rgba(128,128,128,.08);color:var(--dsw-alias-label-primary,#1a1a1a)}",
			".convnav-more:disabled{opacity:.6;cursor:default}",
			".convnav-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:44px 20px;text-align:center;color:var(--dsw-alias-label-secondary,#8e8ea0);font-size:14px}",
			".convnav-empty-icon{opacity:.5}",
			".convnav-flash{animation:convnav-flash 1.3s ease-out}",
			"@keyframes convnav-flash{0%{background:rgba(79,110,242,.30)}100%{background:transparent}}"
		].join("\n");
		const tagId = "@ulabe/dsh-conversation-nav/styles";
		if (typeof document !== "undefined") {
			// Reuse the existing style tag if present (HMR leftovers) but ALWAYS
			// refresh its content so a stale stylesheet can never survive.
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@ulabe/dsh-conversation-nav";
				tag.dataset.pluginCss = tagId;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}

		// ── helpers ─────────────────────────────────────────────────────────────
		/** Collect finalized user messages from the conversation snapshot. */
		function userMessagesOf(snapshot) {
			if (!snapshot || !Array.isArray(snapshot.nodes)) return [];
			return snapshot.nodes.filter((n) => n && n.kind === "user");
		}

		/** Plain text of a user message node (text blocks only). */
		function textOf(node) {
			const blocks = Array.isArray(node.content) ? node.content : [];
			return blocks
				.filter((b) => b && b.type === "text" && typeof b.text === "string")
				.map((b) => b.text)
				.join("");
		}

		/** Single-line preview, capped at 60 chars. */
		function summarize(text) {
			const t = text.replace(/\s+/g, " ").trim();
			return t.length > 60 ? t.slice(0, 60) + "…" : t;
		}

		/** Relative time, DeepSeek-web style (刚刚 / N分钟前 / N小时前 / N天前). */
		function formatTime(timestamp) {
			if (!timestamp) return "";
			const diff = Date.now() - timestamp;
			if (diff < 60000) return "刚刚";
			const minutes = Math.floor(diff / 60000);
			if (minutes < 60) return minutes + "分钟前";
			const hours = Math.floor(diff / 3600000);
			if (hours < 24) return hours + "小时前";
			const days = Math.floor(diff / 86400000);
			if (days < 7) return days + "天前";
			return new Date(timestamp).toLocaleDateString("zh-CN");
		}

		/** Smooth-scroll the chat to the i-th rendered user message row. */
		function jumpToUserMessage(index) {
			const rows = document.querySelectorAll('[data-chat-flow-kind="user"]');
			const row = rows[index];
			if (!(row instanceof HTMLElement)) return false;
			row.scrollIntoView({ behavior: "smooth", block: "start" });
			row.classList.add("convnav-flash");
			setTimeout(() => row.classList.remove("convnav-flash"), 1400);
			return true;
		}

		// ── icons ───────────────────────────────────────────────────────────────
		/** List / index icon (fab button + drawer header). */
		function ListIcon({ size }) {
			const s = size || 18;
			return react.createElement(
				"svg",
				{ width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
				react.createElement("line", { x1: 9, y1: 6, x2: 21, y2: 6 }),
				react.createElement("line", { x1: 9, y1: 12, x2: 21, y2: 12 }),
				react.createElement("line", { x1: 9, y1: 18, x2: 21, y2: 18 }),
				react.createElement("line", { x1: 3, y1: 6, x2: 3.01, y2: 6 }),
				react.createElement("line", { x1: 3, y1: 12, x2: 3.01, y2: 12 }),
				react.createElement("line", { x1: 3, y1: 18, x2: 3.01, y2: 18 })
			);
		}

		/** Message-bubble icon (list rows + empty state), DeepSeek-web style. */
		function MessageIcon({ size }) {
			const s = size || 18;
			return react.createElement(
				"svg",
				{ width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
				react.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
			);
		}

		// ── panel component (registered into shell.overlay, root scope) ─────────
		/**
		 * @param ctx - client root context (captured from apply).
		 * @returns the shell.overlay occupant component.
		 */
		function makeNavPanel(ctx) {
			return function NavPanel(props) {
				const useSessions = props.useSessions;
				const [open, setOpen] = react.useState(false);

				// Current session id, reactive (root-scope standard feed).
				const sessionId = useSessions((s) => (s ? s.current : undefined));

				// Subscribe to the current session's conversation snapshot.
				const snapshot = react.useSyncExternalStore(
					react.useCallback(
						(cb) => {
							const b = sessionId != null ? ctx.sessions.binding(sessionId) : undefined;
							return b ? b.session.subscribe(cb) : () => {};
						},
						[ctx, sessionId]
					),
					react.useCallback(() => {
						const b = sessionId != null ? ctx.sessions.binding(sessionId) : undefined;
						return b ? b.session.getSnapshot() : null;
					}, [ctx, sessionId])
				);

				const userMessages = react.useMemo(() => userMessagesOf(snapshot), [snapshot]);

				// History pagination: the snapshot only holds the loaded event
				// window; loadOlder() extends it backwards. Auto-load the whole log
				// while the drawer is open (manual button stays as a fallback).
				const session = sessionId != null ? ctx.sessions.binding(sessionId)?.session : undefined;
				const hasMore = snapshot ? snapshot.hasMore === true : false;
				const loadingOlder = snapshot ? snapshot.loadingOlder === true : false;
				const loadOlder = () => {
					if (!session || loadingOlder) return;
					session.loadOlder().catch(() => {});
				};
				const lastNodeCount = react.useRef(0);
				react.useEffect(() => {
					if (!open || !hasMore || loadingOlder || !session) return;
					const count = snapshot && Array.isArray(snapshot.nodes) ? snapshot.nodes.length : 0;
					if (count > 0 && count === lastNodeCount.current) return; // no progress, stop
					lastNodeCount.current = count;
					loadOlder();
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [open, hasMore, loadingOlder, session, snapshot]);

				const jump = (index) => {
					if (jumpToUserMessage(index)) setOpen(false);
				};

				return react.createElement(
					react.Fragment,
					null,
					open
						? react.createElement(
								"div",
								{ className: "convnav-drawer" },
								react.createElement(
									"div",
									{ className: "convnav-header" },
									react.createElement("span", { className: "convnav-header-icon" }, react.createElement(ListIcon, { size: 16 })),
									react.createElement("span", null, "对话位置"),
									react.createElement(
										"button",
										{ className: "convnav-close", onClick: () => setOpen(false), "aria-label": "关闭导航" },
										"✕"
									)
								),
								userMessages.length === 0
									? react.createElement(
											"div",
											{ className: "convnav-empty" },
											react.createElement("span", { className: "convnav-empty-icon" }, react.createElement(MessageIcon, { size: 30 })),
											react.createElement("span", null, sessionId ? "暂无对话内容" : "尚未打开会话")
									  )
									: react.createElement(
											"div",
											{ className: "convnav-list" },
											hasMore || loadingOlder
												? react.createElement(
														"button",
														{ className: "convnav-more", onClick: loadOlder, disabled: loadingOlder },
														loadingOlder ? "加载更早消息中…" : "加载更早消息 ↑"
												  )
												: null,
											userMessages.map((m, i) => {
												const text = textOf(m);
												return react.createElement(
													"button",
													{
														key: m.seq,
														className: "convnav-item",
														onClick: () => jump(i),
														title: text || "(无文本)"
													},
													react.createElement("span", { className: "convnav-icon" }, react.createElement(MessageIcon, null)),
													react.createElement("span", { className: "convnav-text" }, summarize(text) || "(无文本)"),
													react.createElement("span", { className: "convnav-time" }, formatTime(m.time))
												);
											})
									  )
							)
						: null,
					react.createElement(
						"button",
						{ className: "convnav-fab", onClick: () => setOpen(!open), title: "对话位置导航", "aria-label": "对话位置导航" },
						react.createElement(ListIcon, null)
					)
				);
			};
		}

		// ── plugin body ──────────────────────────────────────────────────────────
		/** Required services (cordis fiber inject). */
		const inject = ["slots", "sessions"];

		/**
		 * Client plugin body: register one additive entry into shell.overlay.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => {
				const dispose = ctx.slots.inject("shell.overlay", () =>
					ctx.slots.register(
						{ name: "shell.overlay", id: "conversation-nav", order: 100, label: "对话位置导航" },
						makeNavPanel(ctx)
					)
				);
				return dispose;
			}, "conversation-nav: shell.overlay entry");
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
