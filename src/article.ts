import { createTemplate, extractReference, fetchWithCache, fixImagesAndLinks } from "./lib";

type InitialData = {
  initialState: {
    entities: {
      articles: {
        [id: string]: {
          title: string;
          url: string;
          imageUrl: string;
          content: string;
          created: number;
          updated: number;
          author: {
            name: string;
            description: string;
            url: string;
            avatarUrl: string;
          };
          column?: {
            description: string;
            intro: string;
            title: string;
          };
          voteupCount: number;
          commentCount: number;
        }
      }
    }
  }
}

const template = createTemplate`
<!DOCTYPE html>
<html lang="zh">
<head>
  <title>${"title"} | FxZhihu</title>
  <meta charset="UTF-8">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${"title"} | FxZhihu">
  <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
  <meta property="og:url" content="${"url"}">
	<meta property="og:image" content="${"image_url"}">
	<meta property="og:description" content="${"excerpt"}">
  <meta name="twitter:card" content="summary_large_image">
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
  <style>
    .origin_image {
      width: 100%;
    }
    figure {
      margin:1.4em 0;
    }
    figure img {
      width: 100%;
    }
    img {
      vertical-align: middle;
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
    .references {
      font-size: 0.85em;
    }
    .formula-display {
      display: block;
      text-align: center;
    }
  </style>
</head>
<body style="max-width: 1000px; margin: 0 auto; padding: 0 1em 0 1em;" class="yue">
  <header>
		<img class="origin_image" src="${"image_url"}"/>
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
    ${"content"}
    ${"reference"}
    <hr>
    <div class="column" style="margin: 1em 0; padding: 0.5em 1em; border: 2px solid #999; border-radius: 5px;">
      <h2>专栏：${"column_title"}</h2>
      <p>${"column_description"}</p>
    </div>
  </article>
</body>
</html>
`;

async function parseHTML(text: string, id: string) {
  let excerpt = '';
  let script = '';
  const rewriter = new HTMLRewriter()
    .on('meta[name="description"]', {
      element(element) {
        excerpt = element.getAttribute('content') || '';
      }
    })
    .on('script#js-initialData', {
      text(text) {
        script += text.text;
      }
    })

  await rewriter.transform(new Response(text)).text();
  const articleData = (JSON.parse(script || '{}') as InitialData).initialState.entities.articles[id];
  return { articleData, excerpt };
}

export async function article(id: string, redirect: boolean, env: Env): Promise<string> {
  const url = new URL(id, `https://zhuanlan.zhihu.com/p/`).href;
  console.log(`ZSE_CK: ${env.ZSE_CK}`);
  const response = await fetchWithCache(url, {
    "headers": {
      "user-agent": "node",
      "cookie": `__zse_ck=${env.ZSE_CK}`,
    },
  });
  const { articleData, excerpt } = await parseHTML(await response.text(), id);
  const createdTime = new Date(articleData.created * 1000);
  return template({
    title: articleData.title,
    url: articleData.url,
    content: await fixImagesAndLinks(articleData.content),
    reference: await extractReference(articleData.content),
    excerpt: excerpt,
    author: articleData.author.name,
    created_time: createdTime.toISOString(),
    created_time_formatted: createdTime.toLocaleString(),
    voteup_count: articleData.voteupCount.toString(),
    comment_count: articleData.commentCount.toString(),
    column_title: articleData.column?.title ?? '',
    column_description: articleData.column?.description ?? '',
    redirect: redirect ? 'true' : 'false',
    author_url: `https://www.zhihu.com${articleData.author.url}`,
    headline: articleData.author.description,
    avatar_url: articleData.author.avatarUrl,
    image_url: articleData.imageUrl,
  });
}
