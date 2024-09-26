import { fixImagesAndLinks, renderTemplate } from "./lib";

export type Article = {
    title: string;
    content: string;
    excerpt: string;
    author: {
        name: string;
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

const template = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <title>{{title}} | FxZhihu</title>
    <meta charset="UTF-8">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{title}} | FxZhihu">
    <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
    <meta property="og:url" content="{{url}}">
    <meta property="twitter:card" content="summary">
    <meta name="twitter:title" property="og:title" itemprop="name" content="{{title}} | FxZhihu">
    <meta name="twitter:description" property="og:description" itemprop="description" content="{{excerpt}}">
    <script>
        const redirect = {{redirect}};
        if (redirect) {
            window.location.replace("{{url}}");
        }
    </script>
</head>
<body style="max-width: 1000px; margin: 0 auto;">
    <header>
        <h1>{{title}}</h1>
        <h2 rel="author">@{{author}}</h2>
        <time datetime="{{created_time}}">发表于 {{created_time_formatted}}</time>
        <p rel="stats"style="color: #999; font-size: 0.9em;">{{voteup_count}} 👍 / {{comment_count}} 💬</p>
    </header>
    <article>
        {{question}}
        {{content}}
        <hr>
        <div class="column" style="margin: 1em 0; padding: 0.5em 1em; border: 2px solid #999; border-radius: 5px;">
            <h2>专栏：{{column_title}}</h2>
            <p>{{column_description}}</p>
        </div>
    </article>
</body>
</html>
`;

export async function article(id: string, redirect: boolean, env: Env): Promise<string> {
    const url = `https://api.zhihu.com/article/${id}`;
    const response = await fetch(url);
    const data = (await response.json()) as Article;
    const createdTime = new Date(data.created * 1000);
    return renderTemplate(template, {
        title: data.title,
        url: `https://zhuanlan.zhihu.com/p/${id}`,
        content: fixImagesAndLinks(data.content),
        excerpt: data.excerpt,
        author: data.author.name,
        created_time: createdTime.toISOString(),
        created_time_formatted: createdTime.toDateString(),
        voteup_count: data.voteup_count.toString(),
        comment_count: data.comment_count.toString(),
        column_title: data.column.title,
        column_description: data.column.description,
        redirect: redirect ? 'true' : 'false',
    });
}