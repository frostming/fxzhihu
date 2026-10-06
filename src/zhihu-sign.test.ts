import { describe, expect, it } from 'vitest';

import { buildZhihuCookie, getCookieValue, getSignedZhihuHeaders, getZhihuRequestHeaders } from './zhihu-sign';

describe('zhihu signing helpers', () => {
  it('builds cookie headers from individual secret values', () => {
    const env = {
      Z_C0: 'zc0=value',
      D_C0: 'dc0=|value',
      ZSE_CK: 'zse-ck-value',
    } as Env;

    expect(buildZhihuCookie(env)).toBe('z_c0=zc0=value; d_c0=dc0=|value; __zse_ck=zse-ck-value');
  });

  it('keeps explicitly named cookie parts intact', () => {
    const env = {
      Z_C0: 'z_c0=zc0=value',
      D_C0: 'd_c0="dc0=|value"',
      ZSE_CK: '__zse_ck=zse-ck-value',
    } as Env;

    expect(buildZhihuCookie(env)).toBe('z_c0=zc0=value; d_c0=dc0=|value; __zse_ck=zse-ck-value');
  });

  it('extracts d_c0 from full cookie strings and generates signed headers', () => {
    const cookie = 'z_c0=zc0-value; d_c0=dc0-value; __zse_ck=zse-ck-value';
    const headers = getSignedZhihuHeaders('https://www.zhihu.com/api/v4/articles/2033118481449734702', getCookieValue(cookie, 'd_c0'));

    expect(headers['x-zse-93']).toBe('101_3_3.0');
    expect(headers['x-api-version']).toBe('3.0.91');
    expect(headers['x-zse-96']).toMatch(/^2\.0_.{64}$/);
    expect(headers['x-requested-with']).toBe('fetch');
    expect(headers['x-app-za']).toBe('OS=Web');
  });

  it('generates deterministic signatures for the same request', () => {
    const url = 'https://www.zhihu.com/api/v4/articles/2033118481449734702';
    const dC0 = 'dc0-value';

    expect(getSignedZhihuHeaders(url, dC0)['x-zse-96']).toBe(getSignedZhihuHeaders(url, dC0)['x-zse-96']);
  });

  it('ignores surrounding d_c0 quotes when signing', () => {
    const url = 'https://www.zhihu.com/api/v4/articles/2033118481449734702';

    expect(getSignedZhihuHeaders(url, '"dc0-value"')['x-zse-96']).toBe(getSignedZhihuHeaders(url, 'dc0-value')['x-zse-96']);
    expect(getSignedZhihuHeaders(url, '%22dc0-value%22')['x-zse-96']).toBe(getSignedZhihuHeaders(url, 'dc0-value')['x-zse-96']);
    expect(getSignedZhihuHeaders(url, 'dc0%3D%7Cvalue')['x-zse-96']).toBe(getSignedZhihuHeaders(url, 'dc0=|value')['x-zse-96']);
  });

  it('signs answer requests including their query string with the configured cookies', () => {
    const url = 'https://www.zhihu.com/api/v4/answers/554938129?include=content,excerpt,voteup_count,comment_count,question.detail';
    const headers = getZhihuRequestHeaders(url, {
      Z_C0: 'z_c0=login-value',
      ZSE_CK: 'd_c0="device-value"; __zse_ck=check-value',
    } as Env);

    expect(headers.cookie).toBe('z_c0=login-value; d_c0="device-value"; __zse_ck=check-value');
    expect(headers['user-agent']).toMatch(/Mozilla\/5\.0 .*AppleWebKit\/.*Chrome\/.*Safari\//);
    expect(headers['x-zse-96']).toBe(getSignedZhihuHeaders(url, 'device-value')['x-zse-96']);
    expect(headers['x-zse-96']).not.toBe(getSignedZhihuHeaders(url.split('?')[0], 'device-value')['x-zse-96']);
    expect(headers['x-api-version']).toBe('3.0.91');
  });

  it('omits cookies and signatures when secrets are not configured', () => {
    const headers = getZhihuRequestHeaders('https://www.zhihu.com/api/v4/answers/554938129', {} as Env);

    expect(headers['user-agent']).toContain('Chrome/');
    expect(headers).not.toHaveProperty('cookie');
    expect(headers).not.toHaveProperty('x-zse-96');
  });
});
