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
}

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{title}} | FxZhihu">
    <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
    <meta property="og:url" content="{{url}}">
    <meta property="twitter:card" content="summary">
    <meta name="twitter:title" property="og:title" itemprop="name" content="{{title}} | FxZhihu">
    <meta name="twitter:description" property="og:description" itemprop="description" content="{{excerpt}}">
    <script>
        window.location.replace("{{url}}");
    </script>
</head>
<body>
    <header>
        <h1>{{title}}</h1>
        <h2>@{{author}}</h2>
        <p style="color: #999; font-size: 0.9em;">{{voteup_count}} 👍 / {{comment_count}} 💬</p>
    </header>
    <article>
        {{content}}
    </article>
</body>
</html>
`;

export async function answer(id: string, env: Env): Promise<string> {
    const url = `https://api.zhihu.com/v4/answers/${id}?include=content%2Cexcerpt%2Cauthor%2Cvoteup_count%2Ccomment_count%2Cquestion`;
    const response = await fetch(url);
    const data = (await response.json()) as Answer;
    return template
        .replaceAll('{{title}}', `${data.question.title} - @${data.author.name}`)
        .replaceAll('{{content}}', fixImagesAndLinks(data.content))
        .replaceAll('{{excerpt}}', data.excerpt)
        .replaceAll('{{author}}', data.author.name)
        .replaceAll('{{voteup_count}}', data.voteup_count.toString())
        .replaceAll('{{comment_count}}', data.comment_count.toString())
        .replaceAll('{{url}}', `https://zhihu.com/question/${data.question.id}/answer/${id}`);
}