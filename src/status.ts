import { fixImagesAndLinks, createTemplate, extractReference, FetchError } from "./lib";

export type Status = {
    id: number;
	title: string;
	content_html: string;
    excerpt_title: string;
	author: {
		name: string;
		url: string;
        url_token: string;
		headline: string;
		avatar_url: string;
	};
	created: number;
    updated: number;
    reaction: {
        up_vote_count: number;
        comment_count: number;
    }
	image_url: string;
	origin_pin: Status;
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
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/yue.css@0.4.0/yue.css">
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
    </style>
</head>
<body style="max-width: 1000px; margin: 0 auto; padding: 0 1em 0 1em;" class="yue">
    <header>
		<img class="origin_image" src="${"image_url"}"/>
        <h1><a href="${"url"}">${"title"}</a></h1>
		<div class="author">
            <img class="avatar" id="avatar" src="${"avatar_url"}" />
            <div>
                <h2 rel="author">
                    <a href="${"author_url"}" target="_blank">@${"author"}</a>
                </h2>
                <p> ${"headline"} </p>
            </div>
        </div>
        <time datetime="${"created_time"}">发表于 ${"created_time_formatted"}</time>
        <time datetime="${"updated_time"}">更新于 ${"updated_time_formatted"}</time>
        <p rel="stats"style="color: #999; font-size: 0.9em;">${"voteup_count"} 👍 / ${"comment_count"} 💬</p>
    </header>
    <article>
        ${"content"}
        ${"reference"}        
    </article>
</body>
</html>
`;

export async function status(id: string, redirect: boolean, env: Env): Promise<string> {
	const url = new URL(id, `https://api.zhihu.com/pins/`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new FetchError(response.statusText, response);
	}
	const data = await response.json<Status>();
	const createdTime = new Date(data.created * 1000);

	return template({
		title: data.author.name + "的想法",
		url: new URL(id, `https://www.zhihu.com/pin/`).href,
		content: fixImagesAndLinks(data.content_html),
		reference: extractReference(data.content_html),
		excerpt: data.excerpt_title,
		author: data.author.name,
		created_time: createdTime.toISOString(),
		created_time_formatted: createdTime.toDateString(),
        updated_time: new Date(data.updated * 1000).toISOString(),
        updated_time_formatted: new Date(data.updated * 1000).toDateString(),
		voteup_count: data.reaction.up_vote_count.toString(),
		comment_count: data.reaction.comment_count.toString(),
		redirect: redirect ? 'true' : 'false',
		author_url: data.author.url.replace("api.", ""),
		headline: data.author.headline,
		avatar_url: data.author.avatar_url,
		image_url: data.image_url,
	});
}
