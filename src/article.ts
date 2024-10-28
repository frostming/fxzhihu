import { fixImagesAndLinks, createTemplate, extractReference } from "./lib";

export type Article = {
	title: string;
	content: string;
	excerpt: string;
	author: {
		name: string;
		url: string;
		headline: string;
		avatar_url: string;
	};
	created: number;
	voteup_count: number;
	comment_count: number;
	image_url: string;
	column: {
		title: string;
		description: string;
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
    <meta property="twitter:card" content="summary">
    <meta name="twitter:title" property="og:title" itemprop="name" content="${"title"} | FxZhihu">
    <meta name="twitter:description" property="og:description" itemprop="description" content="${"excerpt"}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
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
        }
        .avatar {
            width: 100px;
            height: 100px;
        }
        .author > div {
            flex: 1;
        }
    </style>
    </style>
</head>
<body style="max-width: 1000px; margin: 0 auto; padding: 0 1em 0 1em;">
    <header>
	    <img class="origin_image" src="${"image_url"}"/>
        <h1><a href="${"url"}">${"title"}</a></h1>
		<div class="author">
            <img class="avatar" src="${"avatar_url"}" />
            <div>
                <h2 rel="author">
                    <a href="${"author_url"}" target="_blank">@${"author"}</a>
                </h2>
                <p> ${"headline"} </p>
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

export async function article(id: string, redirect: boolean, env: Env): Promise<string> {
	const url = new URL(id, `https://api.zhihu.com/article/`);
	const response = await fetch(url);
	const data = (await response.json()) as Article;
	const createdTime = new Date(data.created * 1000);

	return template({
		title: data.title,
		url: new URL(id, `https://zhuanlan.zhihu.com/p/`).href,
		content: fixImagesAndLinks(data.content),
		reference: extractReference(data.content),
		excerpt: data.excerpt,
		author: data.author.name,
		created_time: createdTime.toISOString(),
		created_time_formatted: createdTime.toDateString(),
		voteup_count: data.voteup_count.toString(),
		comment_count: data.comment_count.toString(),
		column_title: data.column.title,
		column_description: data.column.description,
		redirect: redirect ? 'true' : 'false',
		author_url: data.author.url.replace("api.", ""),
		headline: data.author.headline,
		avatar_url: data.author.avatar_url,
		image_url: data.image_url,
	});
}
