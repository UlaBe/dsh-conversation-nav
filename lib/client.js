/**
 * @ulabe/dsh-conversation-nav — conversation position navigator.
 *
 * A right-edge tick rail with hover preview panel (DeepSeek-web style):
 * - Resting: a vertical rail of thin grey ticks (max 9, window follows the
 *   currently visible user message); the active tick is brand-blue and
 *   slightly longer.
 * - Hover: the rail expands into a rounded grey panel — the ticks stay in
 *   place, each with the message preview on its left. Up to 9 rows are
 *   visible; more rows scroll with the wheel.
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

		// ── styles ──────────────────────────────────────────────────────────────
		const css = [
			// Hover capture zone pinned at the conversation's right edge.
			// NOTE: no transform here — a transform would create a containing
			// block and break the fixed positioning of the child tooltip.
			".convnav-zone{position:fixed;right:8px;top:0;bottom:0;display:flex;align-items:center;z-index:2147483000}",
			// Tick rail (resting): grey ticks, active one brand-blue & longer.
			".convnav-ticks{display:flex;flex-direction:column;align-items:center;gap:15px;padding:14px 8px;border-radius:12px}",
			".convnav-tick{width:18px;height:3px;border-radius:3px;border:none;background:#56585f;opacity:.65;cursor:pointer;padding:0;transition:width .2s ease,background-color .2s ease,opacity .2s ease}",
			".convnav-tick:hover{opacity:1}",
			".convnav-tick.convnav-active{width:28px;background:#4f6ef2;opacity:1}",
			// Hover panel: rounded grey card replacing the rail (ticks kept in
			// place, preview text on the left of each tick). Max 9 rows visible,
			// wheel-scrolls for more; top/bottom edges fade out.
			".convnav-panel{position:fixed;right:8px;width:240px;background:var(--dsw-alias-bg-raised,var(--dsw-alias-bg-base,#232428));border:1px solid var(--dsw-alias-border-l1,#2e2f33);border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.40);padding:8px;max-height:390px;overflow-y:auto;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 14px,#000 calc(100% - 14px),transparent);mask-image:linear-gradient(to bottom,transparent,#000 14px,#000 calc(100% - 14px),transparent);animation:convnav-pop .18s cubic-bezier(.4,0,.2,1)}",
			".convnav-panel::-webkit-scrollbar{width:4px}",
			".convnav-panel::-webkit-scrollbar-track{background:transparent}",
			".convnav-panel::-webkit-scrollbar-thumb{background:#3a3b3f;border-radius:10px}",
			"@keyframes convnav-pop{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}",
			// Panel row: preview text on the left, tick on the right (kept at the
			// rail's column), so ticks line up with the resting rail.
			".convnav-row{display:flex;align-items:center;gap:10px;width:100%;padding:11px 6px 11px 12px;border-radius:9px;border:none;background:none;color:var(--dsw-alias-label-secondary,#b9bcc2);cursor:pointer;text-align:left;font:inherit;font-size:14px;line-height:1.35;transition:color .2s ease,background-color .2s ease}",
			".convnav-row:hover{background:rgba(255,255,255,.06);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-row.convnav-active{color:#4f6ef2}",
			".convnav-row-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".convnav-row-tick{flex:none;width:18px;height:3px;border-radius:3px;background:currentColor;opacity:.85}",
			".convnav-empty{padding:12px 14px;font-size:13px;color:var(--dsw-alias-label-secondary,#6b6e74)}",
			// Full-message tooltip: consistent dark style, shown on the LEFT of
			// the panel, vertically aligned with the hovered row. Never overlaps
			// the panel (pointer-events none so it cannot steal the hover).
			".convnav-tip{position:fixed;right:262px;max-width:280px;max-height:46vh;overflow-y:auto;background:var(--dsw-alias-bg-raised,var(--dsw-alias-bg-base,#232428));border:1px solid var(--dsw-alias-border-l1,#2e2f33);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.42);padding:8px 12px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#e6e7ea);white-space:pre-wrap;word-break:break-word;transform:translateY(-50%);pointer-events:none;z-index:2147483002;animation:convnav-tip-in .15s cubic-bezier(.4,0,.2,1)}",
			".convnav-tip::-webkit-scrollbar{width:4px}",
			".convnav-tip::-webkit-scrollbar-thumb{background:#3a3b3f;border-radius:10px}",
			"@keyframes convnav-tip-in{from{opacity:0;transform:translateY(-50%) translateX(-4px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}"
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
		/** @param ctx - client root context (captured from apply). */
		function makeNavIndicator(ctx) {
			const WINDOW = 9;

			return function NavIndicator(props) {
				const useSessions = props.useSessions;
				const [hovered, setHovered] = react.useState(false);
				const [activeIndex, setActiveIndex] = react.useState(-1);
				const [tooltip, setTooltip] = react.useState(null); // {text, top}
				const hideTimer = react.useRef(null);
				react.useEffect(() => () => {
					if (hideTimer.current) clearTimeout(hideTimer.current);
				}, []);

				const enter = () => {
					if (hideTimer.current) clearTimeout(hideTimer.current);
					setHovered(true);
				};
				const leave = () => {
					// Small grace period so moving from the rail across the gap
					// onto the panel does not close it; the panel is a child of
					// the same zone, so once the pointer is over it the timer is
					// cancelled by a mouseenter.
					hideTimer.current = setTimeout(() => setHovered(false), 250);
				};

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

				// Resting rail window: max 9 ticks, centered on the active one.
				const len = userMessages.length;
				let winStart = 0;
				if (len > 0) {
					const anchor = activeIndex === -1 ? len - 1 : activeIndex;
					winStart = Math.max(0, Math.min(anchor - Math.floor(WINDOW / 2), len - WINDOW));
				}
				const windowed = userMessages.slice(winStart, Math.min(len, winStart + WINDOW));

				return react.createElement(
					"div",
					{ className: "convnav-zone", onMouseEnter: enter, onMouseLeave: leave },
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
													onMouseEnter: (e) =>
														setTooltip({
															text: text || "(无文本)",
															top: e.currentTarget.getBoundingClientRect().top
														}),
													onMouseLeave: () => setTooltip(null)
												},
												react.createElement("span", { className: "convnav-row-text" }, preview(text)),
												react.createElement("span", { className: "convnav-row-tick" })
											);
									  })
							)
						: react.createElement(
								"div",
								{ className: "convnav-ticks" },
								windowed.map((m, i) => {
									const real = winStart + i;
									return react.createElement("button", {
										key: m.seq,
										className: "convnav-tick" + (real === activeIndex ? " convnav-active" : ""),
										onClick: () => jump(real),
										"aria-label": "跳转到第 " + (real + 1) + " 条发言"
									});
								})
							),
					hovered && tooltip
						? react.createElement(
								"div",
								{ className: "convnav-tip", style: { top: tooltip.top } },
								tooltip.text
							)
						: null
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
