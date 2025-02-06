import { createTemplate, Segment, renderSegments, SegmentType, fetchWithCache } from "./lib";

export type Article = {
  header: {
    text: string;
  };
  structured_content: { segments: Segment<SegmentType>[] };
  excerpt: string;
  author: {
    fullname: string;
    description: string;
    avatar: {
      avatar_image: {
        day: string;
        jump_url: string;
      };
    };
  };
  content_end_info: {
    create_time_text: string;
  };
  reaction: {
    statistics: {
      up_vote_count: number;
      comment_count: number;
    };
  }
  cover_image?: {
    url: string;
  };
  third_business: {
    column?: {
      title: string;
    };
  };
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
    <hr>
    <div class="column" style="margin: 1em 0; padding: 0.5em 1em; border: 2px solid #999; border-radius: 5px;">
      <h2>专栏：${"column_title"}</h2>
      <p>${"column_description"}</p>
    </div>
  </article>
</body>
</html>
`;

export async function article(id: string, redirect: boolean, env: Env): Promise<string> {
  const url = new URL(id, `https://api.zhihu.com/articles/v2/`);
  const response = await fetchWithCache(url, {
    "headers": {
      "user-agent": "node",
    },
  });
  const data = await response.json<Article>();

  return template({
    title: data.header.text,
    url: new URL(id, `https://zhuanlan.zhihu.com/p/`).href,
    content: renderSegments(data.structured_content.segments),
    excerpt: data.excerpt,
    author: data.author.fullname,
    created_time: data.content_end_info.create_time_text,
    created_time_formatted: data.content_end_info.create_time_text,
    voteup_count: data.reaction.statistics.up_vote_count.toString(),
    comment_count: data.reaction.statistics.comment_count.toString(),
    column_title: data.third_business.column?.title ?? '',
    column_description: '',
    redirect: redirect ? 'true' : 'false',
    author_url: data.author.avatar.avatar_image.jump_url,
    headline: data.author.description,
    avatar_url: data.author.avatar.avatar_image.day,
    image_url: data.cover_image?.url ?? '',
  });
}
