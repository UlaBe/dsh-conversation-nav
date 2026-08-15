/**
 * @ulabe/dsh-conversation-nav — conversation position navigator.
 *
 * A right-edge vertical tick rail (one tick per user message) with hover
 * preview panel, DeepSeek-web outline style:
 * - Resting: a column of thin grey ticks; the tick of the currently visible
 *   user message is brand-blue and slightly longer.
 * - Hover: a rounded grey panel slides in listing up to 9 preview rows
 *   (tick + first chars of the message); more rows scroll with the wheel.
 * - Click a tick/row: the chat smooth-scrolls to that message.
 * - Scroll spy keeps the active tick in sync with the visible conversation.
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

		// ── styles (dark tick rail + hover panel; theme-aware via --dsw-*) ─────
		const css = [
			// Interaction zone pinned at the conversation's right edge.
			".convnav-zone{position:fixed;right:8px;top:50%;transform:translateY(-50%);z-index:2147483000;display:flex;align-items:center}",
			// Tick rail (resting state): thin grey ticks, active one blue & longer.
			".convnav-ticks{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px;border-radius:10px;max-height:70vh;overflow:hidden}",
			".convnav-tick{width:12px;height:2px;border-radius:2px;border:none;background:var(--dsw-alias-label-secondary,#4b4d52);opacity:.55;cursor:pointer;padding:0;transition:width .2s ease,background-color .2s ease,opacity .2s ease}",
			".convnav-tick:hover{opacity:.9}",
			".convnav-tick.convnav-active{width:20px;background:var(--dsw-alias-brand-primary,#4f6ef2);opacity:1}",
			// Hover panel: rounded grey card, max 9 rows, wheel-scrollable.
			".convnav-panel{position:fixed;right:40px;top:50%;transform:translateY(-50%);width:204px;background:var(--dsw-alias-bg-raised,var(--dsw-alias-bg-base,#232428));border:1px solid var(--dsw-alias-border-l1,#2e2f33);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.40);padding:6px;max-height:264px;overflow-y:auto;animation:convnav-pop .18s cubic-bezier(.4,0,.2,1)}",
			".convnav-panel::-webkit-scrollbar{width:4px}",
			".convnav-panel::-webkit-scrollbar-track{background:transparent}",
			".convnav-panel::-webkit-scrollbar-thumb{background:#3a3b3f;border-radius:10px}",
			"@keyframes convnav-pop{from{opacity:0;transform:translateY(-50%) translateX(6px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}",
			".convnav-row{display:flex;align-items:center;gap:8px;width:100%;padding:5px 8px;border-radius:8px;border:none;background:none;color:var(--dsw-alias-label-secondary,#b9bcc2);cursor:pointer;text-align:left;font:inherit;font-size:12px;line-height:1.3;transition:color .2s ease,background-color .2s ease}",
			".convnav-row:hover{background:rgba(255,255,255,.06);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-row.convnav-active{color:var(--dsw-alias-brand-primary,#4f6ef2)}",
			".convnav-row-tick{flex:none;width:10px;height:2px;border-radius:2px;background:currentColor;opacity:.7}",
			".convnav-row-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".convnav-empty{padding:10px 12px;font-size:12px;color:var(--dsw-alias-label-secondary,#6b6e74)}"
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

		/** Short preview: first chars, single line. */
		function preview(text) {
			const t = text.replace(/\s+/g, " ").trim();
			return t.length > 10 ? t.slice(0, 10) + "…" : (t || "(无文本)");
		}

		/** Smooth-scroll the chat to the i-th rendered user message row. */
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

		// ── indicator component (registered into shell.overlay, root scope) ─────
		/**
		 * @param ctx - client root context (captured from apply).
		 * @returns the shell.overlay occupant component.
		 */
		function makeNavIndicator(ctx) {
			return function NavIndicator(props) {
				const useSessions = props.useSessions;
				const [hovered, setHovered] = react.useState(false);
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

				// Auto-load the whole history while the rail is hovered.
				const session = sessionId != null ? ctx.sessions.binding(sessionId)?.session : undefined;
				const hasMore = snapshot ? snapshot.hasMore === true : false;
				const loadingOlder = snapshot ? snapshot.loadingOlder === true : false;
				const loadOlder = () => {
					if (!session || loadingOlder) return;
					session.loadOlder().catch(() => {});
				};
				const lastNodeCount = react.useRef(0);
				react.useEffect(() => {
					if (!hovered || !hasMore || loadingOlder || !session) return;
					const count = snapshot && Array.isArray(snapshot.nodes) ? snapshot.nodes.length : 0;
					if (count > 0 && count === lastNodeCount.current) return; // no progress, stop
					lastNodeCount.current = count;
					loadOlder();
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [hovered, hasMore, loadingOlder, session, snapshot]);

				// ── scroll spy: keep the active tick in sync with the chat ───────
				react.useEffect(() => {
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
				}, [userMessages.length]);

				const jump = (index) => {
					jumpToUserMessage(index);
				};

				return react.createElement(
					"div",
					{
						className: "convnav-zone",
						onMouseEnter: () => setHovered(true),
						onMouseLeave: () => setHovered(false)
					},
					hovered
						? react.createElement(
								"div",
								{ className: "convnav-panel" },
								userMessages.length === 0
									? react.createElement(
											"div",
											{ className: "convnav-empty" },
											sessionId ? "暂无对话内容" : "尚未打开会话"
									  )
									: userMessages.map((m, i) => {
											const text = textOf(m);
											return react.createElement(
												"button",
												{
													key: m.seq,
													className: "convnav-row" + (i === activeIndex ? " convnav-active" : ""),
													onClick: () => jump(i),
													title: text || "(无文本)"
												},
												react.createElement("span", { className: "convnav-row-tick" }),
												react.createElement("span", { className: "convnav-row-text" }, preview(text))
											);
									  })
							)
						: null,
					react.createElement(
						"div",
						{ className: "convnav-ticks" },
						userMessages.map((m, i) =>
							react.createElement("button", {
								key: m.seq,
								className: "convnav-tick" + (i === activeIndex ? " convnav-active" : ""),
								onClick: () => jump(i),
								title: textOf(m) || "(无文本)",
								"aria-label": "跳转到第 " + (i + 1) + " 条发言"
							})
						)
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
						makeNavIndicator(ctx)
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
