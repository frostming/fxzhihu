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
const PAGE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function redirectWithoutCache(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...NO_STORE_HEADERS,
      'Location': url,
    },
  });
}

function disableCache(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
      return redirectWithoutCache(GITHUB_REPO);
    }

    if (path === '/robots.txt') {
      return new Response(`User-agent: *
Disallow: /
Allow: /question/*
Allow: /p/*
Allow: /answer/*
`, { headers: NO_STORE_HEADERS });
    }

    if (env.ENABLE_PROXY !== 'false') {
      for (const { urlPattern, pageFunction } of [
        { urlPattern: new URLPattern({ pathname: "/question/:qid(\\d+)/answer/:id(\\d+)" }), pageFunction: answer },
        { urlPattern: new URLPattern({ pathname: "/p/:id(\\d+)" }), pageFunction: article },
        { urlPattern: new URLPattern({ pathname: "/question/:id(\\d+)" }), pageFunction: question },
        { urlPattern: new URLPattern({ pathname: "/pin/:id(\\d+)" }), pageFunction: status },
      ]) {
        let match = urlPattern.test(url);
        if (match) {
          const id = urlPattern.exec(url)?.pathname.groups?.id!;
          const qid = urlPattern.exec(url)?.pathname.groups?.qid;
          try {
            let responseContent: string;
            if (qid !== undefined) {
              responseContent = await pageFunction(id, redirect, env, qid);
            } else {
              // @ts-expect-error
              responseContent = await pageFunction(id, redirect, env);
            }
            return new Response(await TransformUrl(responseContent, env), {
              headers: {
                'Cache-Control': PAGE_CACHE_CONTROL,
                'Content-Type': 'text/html; charset=utf-8',
                'Vary': 'Referer',
              },
            });
          } catch (e: any) {
            // add traceback
            console.error(e);
            if (e.response && (e.code as number) === 4041) {
              return new Response(errorPage(e), {
                headers: {
                  ...NO_STORE_HEADERS,
                  'Content-Type': 'text/html',
                },
              });
            }
            return e.response
              ? disableCache(e.response)
              : new Response(e.message, { status: 500, headers: NO_STORE_HEADERS });
          }
        }
      }
    }

    // Redirect to the same URL under zhihu.com
    const zhihuUrl = new URL(path, path.startsWith('/p/') ? `https://zhuanlan.zhihu.com` : `https://www.zhihu.com`).href;
    return redirectWithoutCache(zhihuUrl);
  },
} satisfies ExportedHandler<Env>;
