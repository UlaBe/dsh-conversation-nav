/**
 * @ulabe/dsh-conversation-nav — conversation position navigator.
 *
 * A dark-outline conversation outline (DeepSeek-web style): right-edge
 * floating button opens a drawer listing every user message of the current
 * session (history auto-loads). Clicking an entry smooth-scrolls the chat to
 * that message; a scroll-spy keeps the outline highlight in sync with what is
 * visible in the conversation.
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

		// ── styles (dark outline; theme-aware via --dsw-* variables) ───────────
		const css = [
			// Floating trigger button (dark, brand-colored icon).
			".convnav-fab{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:2147483000;width:36px;height:36px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1,#2e2f33);background:var(--dsw-alias-bg-raised,var(--dsw-alias-bg-base,#1a1b1e));color:var(--dsw-alias-brand-primary,#4f6ef2);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.35);opacity:.9;transition:opacity .15s ease,transform .15s ease;padding:0}",
			".convnav-fab:hover{opacity:1;transform:translateY(-50%) scale(1.05)}",
			// Drawer: dark panel, narrow scrollbar.
			".convnav-drawer{position:fixed;top:0;right:0;bottom:0;width:280px;max-width:85vw;z-index:2147483001;background:var(--dsw-alias-bg-base,#17181a);border-left:1px solid var(--dsw-alias-border-l1,#2e2f33);box-shadow:-8px 0 24px rgba(0,0,0,.35);display:flex;flex-direction:column;font-size:13px;line-height:1.35;color:var(--dsw-alias-label-primary,#e6e7ea);animation:convnav-slide-in .28s cubic-bezier(.4,0,.2,1)}",
			"@keyframes convnav-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}",
			".convnav-header{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#232428);font-weight:600;flex:none;font-size:14px;letter-spacing:.2px}",
			".convnav-header-icon{color:var(--dsw-alias-brand-primary,#4f6ef2);display:flex}",
			".convnav-close{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;color:var(--dsw-alias-label-secondary,#8a8d93);padding:2px 7px;border-radius:6px}",
			".convnav-close:hover{background:rgba(255,255,255,.08);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-list{flex:1;overflow-y:auto;padding:6px 0 16px;scroll-behavior:smooth}",
			".convnav-list::-webkit-scrollbar{width:4px}",
			".convnav-list::-webkit-scrollbar-track{background:transparent}",
			".convnav-list::-webkit-scrollbar-thumb{background:#3a3b3f;border-radius:10px}",
			".convnav-list::-webkit-scrollbar-thumb:hover{background:#4b4d52}",
			// Outline row: compact, single-line ellipsis, right tick.
			".convnav-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:6px 22px 6px 16px;border-radius:6px;color:var(--dsw-alias-label-secondary,#b9bcc2);font:inherit;position:relative;transition:color .2s ease,background-color .2s ease}",
			".convnav-item:hover{background:rgba(255,255,255,.05);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-tick{flex-shrink:0;width:14px;height:1px;background:var(--dsw-alias-label-secondary,#4b4d52);transition:background-color .2s ease,opacity .2s ease;margin-left:auto}",
			".convnav-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit}",
			".convnav-time{flex-shrink:0;font-size:11px;color:var(--dsw-alias-label-secondary,#6b6e74);transition:color .2s ease}",
			// Active (scroll-spy) state: brand blue text + blue tick + breathing.
			".convnav-item.convnav-active{color:var(--dsw-alias-brand-primary,#4f6ef2);background:rgba(79,110,242,.09)}",
			".convnav-item.convnav-active .convnav-tick{background:var(--dsw-alias-brand-primary,#4f6ef2);animation:convnav-breathe 1.6s ease-in-out infinite}",
			".convnav-item.convnav-active .convnav-time{color:var(--dsw-alias-brand-primary,#4f6ef2)}",
			"@keyframes convnav-breathe{0%,100%{opacity:.45}50%{opacity:1}}",
			".convnav-more{display:block;width:calc(100% - 24px);margin:4px 12px 8px;padding:5px 0;border:1px dashed var(--dsw-alias-border-l1,#2e2f33);background:none;color:var(--dsw-alias-label-secondary,#8a8d93);cursor:pointer;border-radius:6px;font-size:12px}",
			".convnav-more:hover{background:rgba(255,255,255,.05);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-more:disabled{opacity:.6;cursor:default}",
			".convnav-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:44px 20px;text-align:center;color:var(--dsw-alias-label-secondary,#6b6e74);font-size:13px}",
			".convnav-empty-icon{opacity:.45}",
			".convnav-flash{animation:convnav-flash 1.3s ease-out}",
			"@keyframes convnav-flash{0%{background:rgba(79,110,242,.28)}100%{background:transparent}}"
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

		/** Relative time (刚刚 / N分钟前 / N小时前 / N天前). */
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

		/** Smooth-scroll the chat to the i-th rendered user message row (ease-out). */
		function jumpToUserMessage(index) {
			const scroller = document.querySelector("[data-conversation-scroll]");
			const rows = (scroller ?? document).querySelectorAll('[data-chat-flow-kind="user"]');
			const row = rows[index];
			if (!(row instanceof HTMLElement)) return false;
			row.scrollIntoView({ behavior: "smooth", block: "start" });
			row.classList.add("convnav-flash");
			setTimeout(() => row.classList.remove("convnav-flash"), 1400);
			return true;
		}

		// ── icons ───────────────────────────────────────────────────────────────
		/** List / index icon (fab + header). */
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

		/** Message-bubble icon (empty state). */
		function MessageIcon({ size }) {
			const s = size || 30;
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
				const [activeIndex, setActiveIndex] = react.useState(-1);

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

				// History pagination: auto-load the whole log while the drawer is open.
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

				// ── scroll spy: keep the outline highlight in sync with the chat ──
				react.useEffect(() => {
					if (!open) return;
					const scroller = document.querySelector("[data-conversation-scroll]");
					if (!scroller) return;
					let raf = null;
					const update = () => {
						raf = null;
						const rows = scroller.querySelectorAll('[data-chat-flow-kind="user"]');
						if (rows.length === 0) {
							setActiveIndex(-1);
							return;
						}
						const head = scroller.getBoundingClientRect().top + 72; // headroom
						let active = 0;
						for (let i = 0; i < rows.length; i++) {
							if (rows[i].getBoundingClientRect().top <= head) active = i;
							else break;
						}
						setActiveIndex(active);
					};
					const onScroll = () => {
						if (raf === null) raf = requestAnimationFrame(update);
					};
					scroller.addEventListener("scroll", onScroll, { passive: true });
					const ro = new ResizeObserver(() => {
						if (raf === null) raf = requestAnimationFrame(update);
					});
					ro.observe(scroller);
					update();
					return () => {
						scroller.removeEventListener("scroll", onScroll);
						ro.disconnect();
						if (raf !== null) cancelAnimationFrame(raf);
					};
				}, [open, userMessages.length]);

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
									react.createElement("span", { className: "convnav-header-icon" }, react.createElement(ListIcon, { size: 15 })),
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
											react.createElement("span", { className: "convnav-empty-icon" }, react.createElement(MessageIcon, null)),
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
												const active = i === activeIndex;
												return react.createElement(
													"button",
													{
														key: m.seq,
														className: "convnav-item" + (active ? " convnav-active" : ""),
														onClick: () => jump(i),
														title: text || "(无文本)"
													},
													react.createElement("span", { className: "convnav-text" }, summarize(text) || "(无文本)"),
													react.createElement("span", { className: "convnav-time" }, formatTime(m.time)),
													react.createElement("span", { className: "convnav-tick" })
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
