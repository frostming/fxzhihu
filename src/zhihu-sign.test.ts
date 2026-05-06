import { describe, expect, it } from 'vitest';

import { buildZhihuCookie, getCookieValue, getSignedZhihuHeaders } from './zhihu-sign';

describe('zhihu signing helpers', () => {
  it('builds cookie headers from individual secret values', () => {
    const env = {
      Z_C0: 'zc0-value',
      D_C0: 'dc0-value',
      ZSE_CK: 'zse-ck-value',
    } as Env;

    expect(buildZhihuCookie(env)).toBe('z_c0=zc0-value; d_c0=dc0-value; __zse_ck=zse-ck-value');
  });

  it('extracts d_c0 from full cookie strings and generates signed headers', () => {
    const cookie = 'z_c0=zc0-value; d_c0=dc0-value; __zse_ck=zse-ck-value';
    const headers = getSignedZhihuHeaders('https://www.zhihu.com/api/v4/articles/2033118481449734702', getCookieValue(cookie, 'd_c0'));

    expect(headers['x-zse-93']).toBe('101_3_3.0');
    expect(headers['x-api-version']).toBe('3.0.91');
    expect(headers['x-zse-96']).toMatch(/^2\.0_.{64}$/);
    expect(headers['x-app-za']).toBe('OS=Web');
  });
});
