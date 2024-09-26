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
import { article } from './article';
import { question } from './question';

const GITHUB_REPO = 'https://github.com/frostming/fxzhihu';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const redirect = !['false', 'no'].includes(url.searchParams.get('redirect') || '')
		if (path === '/') {
			return Response.redirect(GITHUB_REPO, 302);
		}
		let match = path.match(/^\/question\/\d+\/answer\/(\d+)\/?$/);
		if (match) {
			const answerId = match[1];
			return new Response(await answer(answerId, redirect, env), {
				headers: {
					'Content-Type': 'text/html',
				},
			});
		}
		match = path.match(/^\/p\/(\d+)\/?$/);
		if (match) {
			const articleId = match[1];
			return new Response(await article(articleId, redirect, env), {
				headers: {
					'Content-Type': 'text/html',
				},
			});
		}
		match = path.match(/^\/question\/(\d+)\/?$/);
		if (match) {
			const questionId = match[1];
			return new Response(await question(questionId, redirect, env), {
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
