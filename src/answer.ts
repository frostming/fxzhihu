import { Question } from "./question";
import { fixImagesAndLinks, createTemplate, extractReference, fetchWithCache } from "./lib";

export type Answer = {
  content: string;
  excerpt: string;
  author: {
    name: string;
    url: string;
    headline: string;
    avatar_url: string;
  };
  voteup_count: number;
  comment_count: number;
  question: Question;
  created_time: number;
}

const template = createTemplate`
<!DOCTYPE html>
<html lang="zh">
<head>
    <title>${"title"} - @${"author"} | FxZhihu</title>
    <meta charset="UTF-8">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${"title"} - @${"author"} | FxZhihu">
    <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
    <meta property="og:description" itemprop="description" content="${"excerpt"}">
    <meta property="og:url" content="${"url"}">
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/yue.css@0.4.0/yue.css">
    <meta name="twitter:card" content="summary">
	<meta name="twitter:site" content="FxZhihu" />
	<meta name="twitter:creator" content="@${"author"}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <script>
        const redirect = ${"redirect"};
        if (redirect) {
            window.location.replace("${"url"}");
        }
    </script>
    <style>
        img {
            vertical-align: middle;
        }
        figure img {
            width: 100%;
        }
        figure {
            margin: 1.4em 0;
        }
        .author {
            display: flex;
            gap: 1em;
            align-items: center;
        }
        #avatar {
            width: 100px;
            height: 100px;
        }
        .author > div {
            flex: 1;
        }
        a[data-draft-type="link-card"] {
            display: block;
        }
    </style>
</head>
<body style="max-width: 1000px; margin: 0 auto; padding: 0 1em 0 1em;" class="yue">
    <header>
        <h1><a href="${"url"}">${"title"}</a></h1>
        <div class="author">
            <img class="avatar" id="avatar" src="${"avatar_url"}" />
            <div>
                <h3 rel="author">
                    <a href="${"author_url"}" target="_blank">@${"author"}</a>
                </h3>
                <div>${"headline"}</div>
            </div>
        </div>
        <time datetime="${"created_time"}">发表于 ${"created_time_formatted"}</time>
        <p rel="stats"style="color: #999; font-size: 0.9em;">${"voteup_count"} 👍 / ${"comment_count"} 💬</p>
    </header>
    <article>
        ${"question"}
        ${"content"}
        ${"reference"}
    </article>
</body>
</html>
`;

const questionTemplate = createTemplate`
    <div style="margin: 0; padding: 0.5em 1em; border-left: 4px solid #999; font-size: 0.86em; background: #f9f9f9;">
        <h2>问题描述</h2>
        ${"question"}
    </div>
    <hr>
`;

export async function answer(id: string, redirect: boolean, env: Env): Promise<string> {
  const url = `https://api.zhihu.com/v4/answers/${id}?include=content%2Cexcerpt%2Cauthor%2Cvoteup_count%2Ccomment_count%2Cquestion%2Ccreated_time%2Cquestion.detail`;
  const response = await fetchWithCache(url);
  const data = await response.json<Answer>();
  const createdTime = new Date(data.created_time * 1000);

  return template({
    title: data.question.title,
    url: new URL(`${data.question.id}/answer/${id}`, `https://www.zhihu.com/question/`).href,
    content: await fixImagesAndLinks(data.content),
    reference: await extractReference(data.content),
    excerpt: data.excerpt,
    author: data.author.name,
    created_time: createdTime.toISOString(),
    created_time_formatted: createdTime.toDateString(),
    voteup_count: data.voteup_count.toString(),
    comment_count: data.comment_count.toString(),
    question: data.question.detail.trim().length > 0 ? questionTemplate({
      question: await fixImagesAndLinks(data.question.detail),
    }) : '',
    redirect: redirect ? 'true' : 'false',
    author_url: data.author.url.replace("api.", ""),
    headline: data.author.headline,
    avatar_url: data.author.avatar_url,
  });
}
