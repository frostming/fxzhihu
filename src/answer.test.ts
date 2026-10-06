import { afterEach, expect, it, vi } from 'vitest';

import { answer } from './answer';

afterEach(() => vi.unstubAllGlobals());

it('fetches and renders an answer using browser headers, cookies, and a signature', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({
    content: '<p>回答正文</p>',
    created_time: 1546300800,
    excerpt: '回答摘要',
    voteup_count: 12,
    comment_count: 3,
    url: 'https://www.zhihu.com/api/v4/answers/554938129',
    author: {
      id: 'author-id',
      name: '作者',
      headline: '作者简介',
      url: 'https://www.zhihu.com/api/v4/people/author-id',
      avatar_url: 'https://pic1.zhimg.com/avatar.jpg',
    },
    question: { id: '305729156', title: '问题标题', detail: '<p>问题详情</p>' },
  }));
  vi.stubGlobal('fetch', fetchMock);

  const html = await answer('554938129', false, {
    Z_C0: 'z_c0=login-value',
    D_C0: 'device-value',
    ZSE_CK: 'check-value',
  } as Env, '305729156');

  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    'https://www.zhihu.com/api/v4/answers/554938129?include=content,excerpt,voteup_count,comment_count,question.detail',
    { headers: expect.objectContaining({
      'user-agent': expect.stringContaining('Chrome/'),
      cookie: 'z_c0=login-value; d_c0=device-value; __zse_ck=check-value',
      'x-zse-93': '101_3_3.0',
      'x-zse-96': expect.stringMatching(/^2\.0_.{64}$/),
    }) },
  );
  expect(html).toContain('<p>回答正文</p>');
  expect(html).toContain('<p>问题详情</p>');
  expect(html).toContain('const redirect = false;');
});
