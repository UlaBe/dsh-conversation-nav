/**
 * @ulabe/dsh-conversation-nav — host half.
 *
 * Injects a small system-prompt section asking the model to append a
 * `<!--new_topic-->` token when the user's latest message starts a new topic.
 * The browser half reads that token out of the assistant messages to build the
 * topic tree. No host↔client RPC and no separate LLM call are needed — the
 * session's own model judges as it replies.
 */
const MARK = "<!--new_topic-->";

export function apply(ctx) {
	// Declare the dependency through cordis `inject` so the section is only
	// installed once `systemPrompt` is actually available (a plain synchronous
	// `ctx.get("systemPrompt")` can fire too early during boot and silently
	// skip the registration).
	ctx.inject(["systemPrompt"], (spCtx) => {
		spCtx.effect(() => {
			return spCtx.systemPrompt.section({
				name: "conversation-nav:topic-boundary",
				order: 200,
				text: [
					"Topic-boundary marker (internal):",
					"After finishing your reply, judge whether the user's latest message starts a clearly NEW topic — a subject or goal distinct from what the conversation had been about.",
					`- If it starts a new topic: append the exact token ${MARK} on its own line at the very end of your reply.`,
					"- If it continues the current topic: do not output the token.",
					"Never mention or explain this token to the user."
				].join("\n")
			});
		}, "conversation-nav: topic-boundary prompt section");
	});
}
