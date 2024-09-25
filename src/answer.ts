import { Question } from "./question";
import { fixImagesAndLinks } from "./lib";
export type Answer = {
    content: string;
    excerpt: string;
    author: {
        name: string;
    };
    voteup_count: number;
    comment_count: number;
    question: Question;
    created_time: number;
}

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{title}} - @{{author}} | FxZhihu">
    <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
    <meta property="og:url" content="{{url}}">
    <meta property="twitter:card" content="summary">
    <meta name="twitter:title" property="og:title" itemprop="name" content="{{title}} - @{{author}} | FxZhihu">
    <meta name="twitter:description" property="og:description" itemprop="description" content="{{excerpt}}">
    <script>
        const redirect = {{redirect}};
        if (redirect) {
            window.location.replace(redirect);
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
        {{content}}
    </article>
</body>
</html>
`;

export async function answer(id: string, redirect: boolean, env: Env): Promise<string> {
    const url = `https://api.zhihu.com/v4/answers/${id}?include=content%2Cexcerpt%2Cauthor%2Cvoteup_count%2Ccomment_count%2Cquestion%2Ccreated_time`;
    const response = await fetch(url);
    const data = (await response.json()) as Answer;
    const createdTime = new Date(data.created_time * 1000);
    return template
        .replaceAll('{{title}}', data.question.title)
        .replaceAll('{{content}}', fixImagesAndLinks(data.content))
        .replaceAll('{{excerpt}}', data.excerpt)
        .replaceAll('{{author}}', data.author.name)
        .replaceAll('{{voteup_count}}', data.voteup_count.toString())
        .replaceAll('{{comment_count}}', data.comment_count.toString())
        .replaceAll('{{created_time}}', createdTime.toISOString())
        .replaceAll('{{created_time_formatted}}', createdTime.toDateString())
        .replaceAll('{{url}}', `https://zhihu.com/question/${data.question.id}/answer/${id}`)
        .replaceAll('{{redirect}}', redirect ? 'true' : 'false');
}
