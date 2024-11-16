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
import { errorPage } from "./404";

const GITHUB_REPO = 'https://github.com/frostming/fxzhihu';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		let redirect = !['false', 'no'].includes(url.searchParams.get('redirect') || '');
		// Redirect unless the request is coming from Telegram
		const referer = request.headers.get('Referer') || '';
		if (!referer.toLowerCase().includes('https://t.me')) {
			redirect = false;
		}

		if (path === '/') {
			return Response.redirect(GITHUB_REPO, 302);
		}

		if (path === '/robots.txt') {
			return new Response(`User-agent: *
Disallow: /
Allow: /question/*
Allow: /p/*
Allow: /answer/*
`);
		}

		for (const { regex, pageFunction } of [
			{ regex: /^(?:\/question\/\d+)?\/answer\/(\d+)\/?$/, pageFunction: answer },
			{ regex: /^\/p\/(\d+)\/?$/, pageFunction: article },
			{ regex: /^\/question\/(\d+)\/?$/, pageFunction: question },
		]) {
			let match = path.match(regex);
			if (match) {
				const id = match[1];
				try {
					return new Response(await pageFunction(id, redirect, env), {
						headers: {
							'Content-Type': 'text/html',
						},
					});
				} catch (e: any) {
					if (e.response && (e.message satisfies string).includes("你似乎来到了没有知识存在的荒原")) {
						return new Response(errorPage(e), {
							headers: {
								'Content-Type': 'text/html',
							},
						});
					}
					return e.response || new Response(e.message, { status: 500 });
				}
			}
		}

		// Redirect to the same URL under zhihu.com
		const zhihuUrl = new URL(path, `https://www.zhihu.com`).href;
		return Response.redirect(zhihuUrl, 302);
	},
} satisfies ExportedHandler<Env>;
