import { createTemplate, fetchWithCache } from "./lib";

export type Question = {
  type: 'question';
  id: number;
  title: string;
  detail: string;
  excerpt: string;
  created: number;
  answer_count: number;
  author: {
    name: string;
  };
};

const template = createTemplate`
<!DOCTYPE html>
<html lang="zh">
<head>
  <title>${"title"} - @${"author"} | FxZhihu</title>
  <meta charset="UTF-8">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${"title"} | FxZhihu">
  <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
  <meta property="og:description" itemprop="description" content="${"excerpt"}">
  <meta property="og:url" content="${"url"}">
  <meta name="twitter:card" content="summary">
	<meta name="twitter:site" content="FxZhihu" />
	<meta name="twitter:creator" content="@${"author"}" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/yue.css@0.4.0/yue.css">
  <script>
    const redirect = ${"redirect"};
    if (redirect) {
      window.location.replace("${"url"}");
    }
  </script>
</head>
<body style="max-width: 1000px; margin: 0 auto;" class="yue">
  <header>
    <h1><a href="${"url"}">${"title"}</a></h1>
    <h2 rel="author">@${"author"}</h2>
    <time datetime="${"created_time"}">发表于 ${"created_time_formatted"}</time>
    <p rel="stats"style="color: #999; font-size: 0.9em;">${"answer_count"} 个回答</p>
  </header>
  <article>
    ${"content"}
  </article>
</body>
</html>
`;

export async function question(id: string, redirect: boolean, env: Env): Promise<string> {
  const response = await fetchWithCache(`https://api.zhihu.com/questions/${id}?include=detail%2Cexcerpt%2Canswer_count%2Cauthor`, {
    headers: {
      cookie: `__zse_ck=${env.ZSE_CK}`,
      'user-agent': 'node'
    },
  });

  const data = await response.json<Question>();
  const createdTime = new Date(data.created * 1000);

  return template({
    title: data.title,
    author: data.author.name,
    created_time: createdTime.toISOString(),
    created_time_formatted: createdTime.toDateString(),
    answer_count: data.answer_count.toString(),
    content: data.detail,
    redirect: redirect ? 'true' : 'false',
    url: new URL(id, `https://www.zhihu.com/question/`).href,
    excerpt: data.excerpt,
  });
}
