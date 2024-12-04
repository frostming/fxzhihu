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
import { status } from './status';
import { TransformUrl } from './lib';

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

    for (const { urlPattern, pageFunction } of [
      { urlPattern: new URLPattern({ pathname: "/question/:_id(\\d+)/answer/:id(\\d+)" }), pageFunction: answer },
      { urlPattern: new URLPattern({ pathname: "/answer/:id(\\d+)" }), pageFunction: answer },
      { urlPattern: new URLPattern({ pathname: "/p/:id(\\d+)" }), pageFunction: article },
      { urlPattern: new URLPattern({ pathname: "/question/:id(\\d+)" }), pageFunction: question },
      { urlPattern: new URLPattern({ pathname: "/pin/:id(\\d+)" }), pageFunction: status },
    ]) {
      let match = urlPattern.test(url);
      if (match) {
        const id = urlPattern.exec(url)?.pathname.groups?.id!;
        try {
          return new Response(await TransformUrl((await pageFunction(id, redirect, env)), env), {
            headers: {
              'Content-Type': 'text/html',
            },
          });
        } catch (e: any) {
          // add traceback
          console.error(e);
          if (e.response && (e.code as number) === 4041) {
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
