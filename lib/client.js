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
			// Tick rail: window (162px = 9 ticks) with a full-length track
			// translated by the rAF loop so the active tick sits in the middle.
			".convnav-tick-rail{position:relative;width:40px;height:162px;overflow:hidden}",
			".convnav-tick-track{position:absolute;top:0;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:15px;will-change:transform}",
			".convnav-tick{width:18px;height:3px;border-radius:3px;border:none;background:#56585f;opacity:.65;cursor:pointer;padding:0;transition:width .2s ease,background-color .2s ease,opacity .2s ease}",
			".convnav-tick:hover{opacity:1}",
			".convnav-tick.convnav-active{width:28px;background:#4f6ef2;opacity:1;box-shadow:0 0 6px rgba(79,110,242,.5)}",
			// Hover panel: rounded grey card replacing the rail (ticks kept in
			// place, preview text on the left of each tick). Max 9 rows visible,
			// wheel-scrolls for more; top/bottom edges fade out. Background one
			// step lighter than the app surface so the card reads as a layer.
			".convnav-panel{position:fixed;right:8px;width:240px;background:#2b2d33;border:1px solid #3d3f47;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.45);padding:8px;max-height:390px;overflow-y:auto;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 14px,#000 calc(100% - 14px),transparent);mask-image:linear-gradient(to bottom,transparent,#000 14px,#000 calc(100% - 14px),transparent);animation:convnav-pop .18s cubic-bezier(.4,0,.2,1)}",
			".convnav-panel::-webkit-scrollbar{width:4px}",
			".convnav-panel::-webkit-scrollbar-track{background:transparent}",
			".convnav-panel::-webkit-scrollbar-thumb{background:#4a4c54;border-radius:10px}",
			"@keyframes convnav-pop{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}",
			// Panel row: preview text on the left, tick on the right (kept at the
			// rail's column), so ticks line up with the resting rail.
			".convnav-row{display:flex;align-items:center;gap:24px;width:100%;padding:8px 4px 8px 12px;border-radius:9px;border:none;background:none;color:var(--dsw-alias-label-secondary,#b9bcc2);cursor:pointer;text-align:left;font:inherit;font-size:14px;line-height:1.35;transition:color .2s ease,background-color .2s ease}",
			".convnav-row:hover{background:rgba(255,255,255,.06);color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-row.convnav-active{color:#4f6ef2}",
			".convnav-row-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".convnav-row-tick{flex:none;width:18px;height:3px;border-radius:3px;background:currentColor;opacity:.85}",
			".convnav-empty{padding:12px 14px;font-size:13px;color:var(--dsw-alias-label-secondary,#6b6e74)}",
			// Topic-tree controls: caret is absolutely positioned (does not
			// participate in the flex row, so the 24px text-tick gap stays);
			// all root rows align their text (with or without a caret); child
			// rows live in an indented container with a "|" guide line that
			// runs through the whole subtree.
			".convnav-row{position:relative}",
			".convnav-caret{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary,#8a8d93);cursor:pointer;border:none;background:none;border-radius:5px;font-size:16px;font-weight:600;padding:0;transition:color .15s ease,transform .2s ease}",
			".convnav-caret:hover{color:var(--dsw-alias-label-primary,#e6e7ea)}",
			".convnav-caret.convnav-caret-open{transform:translateY(-50%) rotate(90deg)}",
			".convnav-row.convnav-root .convnav-row-text{margin-left:20px}",
			".convnav-children{margin-left:19px;border-left:2px solid #4a4d55;padding-left:20px}",
			".convnav-promote{position:absolute;right:34px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--dsw-alias-label-secondary,#8a8d93);border:none;background:none;cursor:pointer;padding:3px 6px;border-radius:5px;opacity:0;transition:opacity .15s ease,color .15s ease,background-color .15s ease}",
			".convnav-row:hover .convnav-promote{opacity:1}",
			".convnav-promote:hover{color:#4f6ef2;background:rgba(79,110,242,.14)}",
			// Full-message tooltip: matching card, shown on the LEFT of the panel
			// and vertically aligned with the hovered row. Only long messages
			// trigger it; the text is excerpted by a fixed max-height with
			// overflow hidden (no scrollbar, no fade).
			".convnav-tip{position:fixed;right:262px;max-width:280px;max-height:132px;overflow:hidden;background:#2b2d33;border:1px solid #3d3f47;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.45);padding:8px 12px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#e6e7ea);white-space:pre-wrap;word-break:break-word;transform:translateY(-50%);pointer-events:none;z-index:2147483002;animation:convnav-tip-in .15s cubic-bezier(.4,0,.2,1)}",
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
			if (!node) return "";
			const blocks = Array.isArray(node.content) ? node.content : [];
			return blocks
				.filter((b) => b && b.type === "text" && typeof b.text === "string")
				.map((b) => b.text)
				.join("");
		}

		/** Collapse whitespace for a clean one-line display. */
		function flatten(text) {
			return text.replace(/\s+/g, " ").trim() || "(无文本)";
		}

		/**
		 * Heuristic: is this user message a new topic root?
		 * Deliberately conservative — only a long idle gap starts a new
		 * topic; everything else stays under the current one. Message length
		 * or markdown structure are NOT triggers (users often write long or
		 * structured messages about the SAME topic, which split the tree
		 * into noise). Manual "promote" corrects the rare mis-groupings.
		 */
		function isNewTopicRoot(msg, prev, timeThreshold) {
			if (!prev) return true;
			return msg.time - prev.time > timeThreshold;
		}

		/**
		 * Build the single-level topic tree over user messages.
		 * @returns {{roots: number[], children: Map<number, number[]>}} where
		 *   the keys/values are indexes into `userMessages`.
		 */
		function buildTopicTree(userMessages, manualRoots, timeThreshold) {
			const roots = [];
			const children = new Map();
			let currentRoot = null;
			for (let i = 0; i < userMessages.length; i++) {
				const msg = userMessages[i];
				const prev = i > 0 ? userMessages[i - 1] : null;
				const isRoot = manualRoots.has(i) || isNewTopicRoot(msg, prev, timeThreshold);
				if (isRoot) {
					currentRoot = i;
					roots.push(i);
					children.set(i, []);
				} else if (currentRoot !== null) {
					children.get(currentRoot).push(i);
				} else {
					currentRoot = i;
					roots.push(i);
					children.set(i, []);
				}
			}
			return { roots, children };
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

		/** Obtuse (wide-angle, rounded) chevron-right for the topic caret. */
		function CaretIcon() {
			return react.createElement(
				"svg",
				{ width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" },
				react.createElement("polyline", { points: "9 6 15 12 9 18" })
			);
		}

		// ── indicator component (registered into shell.overlay, root scope) ─────
		/** @param ctx - client root context (captured from apply). */
		function makeNavIndicator(ctx) {
			return function NavIndicator(props) {
				const useSessions = props.useSessions;
				const [hovered, setHovered] = react.useState(false);
				const [activeIndex, setActiveIndex] = react.useState(-1);
				const [tooltip, setTooltip] = react.useState(null); // {text, top}
				const hideTimer = react.useRef(null);
				const tipTimer = react.useRef(null);
				const lockedRef = react.useRef(false); // spy highlight lock after jump
				const unlockTimer = react.useRef(null);
				react.useEffect(
					() => () => {
						if (hideTimer.current) clearTimeout(hideTimer.current);
						if (tipTimer.current) clearTimeout(tipTimer.current);
						if (unlockTimer.current) clearTimeout(unlockTimer.current);
					},
					[]
				);

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
					// The tooltip belongs to the panel: dismiss it with the zone.
					if (tipTimer.current) clearTimeout(tipTimer.current);
					setTooltip(null);
				};

				// Tooltip trigger: only for messages whose rendered text is really
				// truncated (scrollWidth > clientWidth, i.e. too long for the row)
				// and only after the pointer has settled for 400ms.
				const tipEnter = (e, text) => {
					if (tipTimer.current) clearTimeout(tipTimer.current);
					const textEl = e.currentTarget.querySelector(".convnav-row-text");
					const truncated = textEl !== null && textEl.scrollWidth > textEl.clientWidth + 1;
					if (!truncated) {
						setTooltip(null);
						return;
					}
					const top = e.currentTarget.getBoundingClientRect().top;
					tipTimer.current = setTimeout(() => setTooltip({ text, top }), 400);
				};
				const tipLeave = () => {
					if (tipTimer.current) clearTimeout(tipTimer.current);
					setTooltip(null);
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
						// Active = the row currently crossing the 40% line. Using
						// the row's BOTTOM (fully past the line) instead of its
						// top makes the switch deterministic: a row toggles
						// active only when it has fully crossed, so mid-line
						// jitter (top hovering on the line) can never flicker
						// between neighbours. Reaching the end naturally lands
						// on the last row (no separate bottom patch needed).
						const vp = scroller.getBoundingClientRect();
						const mid = vp.top + vp.height * 0.4;
						let active = 0;
						for (let i = 0; i < rows.length; i++) {
							if (rows[i].getBoundingClientRect().bottom <= mid) active = i + 1;
							else break;
						}
						if (active >= rows.length) active = rows.length - 1;
						// Never overwrite a jump-locked highlight.
						if (!lockedRef.current) setActiveIndex(active);
					};
					const onScroll = () => {
						if (lockedRef.current) {
							// Release the lock shortly after the scroll stops.
							if (unlockTimer.current) clearTimeout(unlockTimer.current);
							unlockTimer.current = setTimeout(() => {
								lockedRef.current = false;
							}, 150);
						}
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
					// Set the highlight immediately and LOCK it: while the
					// smooth scroll is running, the spy must not overwrite the
					// jump target with a DOM-inferred index (which can briefly
					// be wrong during re-render/pagination). The lock releases
					// ~150ms after the last scroll event (or 2s as a fallback).
					setActiveIndex(index);
					lockedRef.current = true;
					if (unlockTimer.current) clearTimeout(unlockTimer.current);
					unlockTimer.current = setTimeout(() => {
						lockedRef.current = false;
					}, 2000);
					jumpToUserMessage(index);
				};

				// ── topic tree (single level: root topics + children) ───────────
				const TIME_THRESHOLD = 30 * 60 * 1000; // 30 min idle => new topic
				const [collapsed, setCollapsed] = react.useState(() => new Set());
				const [manualRoots, setManualRoots] = react.useState(() => new Set());
				const panelRef = react.useRef(null);
				const prevHovered = react.useRef(false);
				// When the panel opens, scroll it to the current message so it
				// does not always start at the very first message.
				react.useEffect(() => {
					if (hovered && !prevHovered.current && panelRef.current && activeIndex >= 0) {
						const row = panelRef.current.querySelector('[data-index="' + activeIndex + '"]');
						if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
					}
					prevHovered.current = hovered;
				}, [hovered, activeIndex]);
				const tree = react.useMemo(
					() => buildTopicTree(userMessages, manualRoots, TIME_THRESHOLD),
					[userMessages, manualRoots]
				);
				const toggleCollapse = (rootIndex) => {
					setCollapsed((prev) => {
						const next = new Set(prev);
						if (next.has(rootIndex)) next.delete(rootIndex);
						else next.add(rootIndex);
						return next;
					});
				};
				const promote = (index) => {
					setManualRoots((prev) => {
						const next = new Set(prev);
						next.add(index);
						return next;
					});
				};

				// Flatten the tree for rendering: root rows, then a children
				// container (guide line) per expanded root.
				const renderBlocks = [];
				for (const r of tree.roots) {
					renderBlocks.push({ kind: "root", index: r });
					if (!collapsed.has(r)) {
						const kids = tree.children.get(r);
						if (kids.length > 0) renderBlocks.push({ kind: "children", indexes: kids });
					}
				}

				// Tick rail: a full-length track (all ticks) inside a 9-tick-high
				// window, translated so the ACTIVE tick sits in the middle.
				// The transform is driven by an ALWAYS-ON rAF loop reading a
				// target ref (synced every render) and writing the transform
				// every frame — independent of React renders and CSS animations,
				// so it can never go stale. Large jumps snap (no long drag);
				// small steps ease smoothly.
				const trackRef = react.useRef(null);
				const railTargetRef = react.useRef(0);
				const railCurRef = react.useRef(0);
				const railRafRef = react.useRef(null);
				const [tickSpacing, setTickSpacing] = react.useState(18);
				react.useEffect(() => {
					const track = trackRef.current;
					if (!track) return;
					const ticks = track.querySelectorAll(".convnav-tick");
					if (ticks.length >= 2) {
						const h = ticks[1].getBoundingClientRect().top - ticks[0].getBoundingClientRect().top;
						if (h > 1) setTickSpacing(h);
					}
				}, [userMessages.length]);
				// Always-on rAF loop: eases the track toward the target ref and
				// writes the transform every frame, so the track position can
				// never go stale regardless of React renders. Jump-locked
				// (clicked navigation) or very large offsets snap instantly —
				// easing a jump would drag the target tick (deep in the track)
				// through the window, hiding the highlight mid-flight. Manual
				// scrolling (unlocked, small steps) eases smoothly.
				react.useEffect(() => {
					const loop = () => {
						const track = trackRef.current;
						if (track) {
							const diff = railTargetRef.current - railCurRef.current;
							if (lockedRef.current || Math.abs(diff) > 120) {
								railCurRef.current = railTargetRef.current; // snap
							} else if (Math.abs(diff) < 0.3) {
								railCurRef.current = railTargetRef.current;
							} else {
								railCurRef.current += diff * 0.2; // ease
							}
							track.style.transform = "translateY(" + -railCurRef.current + "px)";
						}
						railRafRef.current = requestAnimationFrame(loop);
					};
					railRafRef.current = requestAnimationFrame(loop);
					return () => {
						if (railRafRef.current) cancelAnimationFrame(railRafRef.current);
					};
				}, []);
				const RAIL_H = 162; // 9 ticks visible
				const maxOffset = Math.max(0, userMessages.length * tickSpacing - RAIL_H);
				const targetOffset = activeIndex * tickSpacing - (RAIL_H - tickSpacing) / 2;
				railTargetRef.current = Math.max(0, Math.min(targetOffset, maxOffset));

				return react.createElement(
					"div",
					{ className: "convnav-zone", onMouseEnter: enter, onMouseLeave: leave },
					hovered
						? react.createElement(
								"div",
								{ ref: panelRef, className: "convnav-panel" },
								userMessages.length === 0
									? react.createElement(
											"div",
											{ className: "convnav-empty" },
											sessionId ? "暂无对话内容" : "尚未打开会话"
									  )
									: renderBlocks.map((block) => {
											if (block.kind === "root") {
												const m = userMessages[block.index];
												const text = textOf(m);
												const active = block.index === activeIndex;
												const children = tree.children.get(block.index);
												return react.createElement(
													"button",
													{
														key: m.seq,
														"data-index": block.index,
														className: "convnav-row convnav-root" + (active ? " convnav-active" : ""),
														onClick: () => jump(block.index),
														onMouseEnter: (e) => tipEnter(e, text || ""),
														onMouseLeave: tipLeave
													},
													children.length > 0
														? react.createElement(
																"span",
																{
																	className: "convnav-caret" + (collapsed.has(block.index) ? "" : " convnav-caret-open"),
																	onClick: (e) => {
																		e.stopPropagation();
																		toggleCollapse(block.index);
																	},
																	"aria-label": collapsed.has(block.index) ? "展开子话题" : "折叠子话题"
																},
																react.createElement(CaretIcon, null)
														  )
														: react.createElement("span", { className: "convnav-caret" }, ""),
													react.createElement("span", { className: "convnav-row-text" }, flatten(text)),
													react.createElement("span", { className: "convnav-row-tick" })
												);
											}
											// children block: container with "|" guide line
											return react.createElement(
												"div",
												{ key: "children-" + block.indexes.join("_"), className: "convnav-children" },
												block.indexes.map((ci) => {
													const cm = userMessages[ci];
													const ctext = textOf(cm);
													const cactive = ci === activeIndex;
													return react.createElement(
														"button",
														{
															key: cm.seq,
															"data-index": ci,
															className: "convnav-row" + (cactive ? " convnav-active" : ""),
															onClick: () => jump(ci),
															onMouseEnter: (e) => tipEnter(e, ctext || ""),
															onMouseLeave: tipLeave
														},
														react.createElement("span", { className: "convnav-row-text" }, flatten(ctext)),
														react.createElement(
															"span",
															{
																className: "convnav-promote",
																onClick: (e) => {
																	e.stopPropagation();
																	promote(ci);
																},
																title: "升级为话题",
																"aria-label": "升级为话题"
															},
															"↑"
														),
														react.createElement("span", { className: "convnav-row-tick" })
													);
												})
											);
									  })
							)
						: react.createElement(
								"div",
								{ className: "convnav-tick-rail" },
								react.createElement(
									"div",
									{ ref: trackRef, className: "convnav-tick-track" },
									userMessages.map((m, i) =>
										react.createElement("button", {
											key: m.seq,
											className: "convnav-tick" + (i === activeIndex ? " convnav-active" : ""),
											onClick: () => jump(i),
											"aria-label": "跳转到第 " + (i + 1) + " 条发言"
										})
									)
								)
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
