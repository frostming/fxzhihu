export type Question = {
	type: 'question';
	id: number;
	title: string;
	detail: string;
    excerpt: string;
};

const template = `
<html>
<head>
    <title>{{title}} | FxZhihu</title>
    <meta charset="UTF-8">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{title}}">
    <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
    <meta property="og:url" content="{{url}}">
    <meta property="twitter:card" content="summary">
    <meta name="twitter:title" property="og:title" itemprop="name" content="{{title}} | FxZhihu">
    <meta name="twitter:description" property="og:description" itemprop="description" content="{{excerpt}}">
</head>
<body>
    <h1>{{title}}</h1>
    {{detail}}
</body>
</html>
`;

export async function question(id: string, env: Env): Promise<string> {
	const response = await fetch(`https://api.zhihu.com/questions/${id}?include=detail%2Cexcerpt`, {
        headers: {
            cookie: `__zse_ck=${env.ZSE_CK}`,
        },
    });
	const data = (await response.json()) as Question;
	return template
        .replaceAll('{{title}}', data.title)
        .replaceAll('{{detail}}', data.detail)
        .replaceAll('{{excerpt}}', data.excerpt)
        .replaceAll('{{url}}', `https://zhihu.com/question/${id}`);
}
