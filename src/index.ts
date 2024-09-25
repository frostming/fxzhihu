/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { answer } from './answer';

const GITHUB_REPO = 'https://github.com/frostming/fxzhihu';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		if (path === '/') {
			return Response.redirect(GITHUB_REPO, 302);
		}
		const answerMatch = path.match(/^\/question\/\d+\/answer\/(\d+)\/?$/);
		if (answerMatch) {
			const answerId = answerMatch[1];
			const body = await answer(answerId, !['false', 'no'].includes(url.searchParams.get('redirect') || ''), env);
			return new Response(body, {
				headers: {
					'Content-Type': 'text/html',
				},
			});
		}
		// Redirect to the same URL under zhihu.com
		const zhihuUrl = `https://www.zhihu.com${path}`;
		return Response.redirect(zhihuUrl, 302);
	},
} satisfies ExportedHandler<Env>;
