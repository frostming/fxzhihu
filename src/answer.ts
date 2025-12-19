import { Question } from "./question";
import { fixImagesAndLinks, createTemplate, extractReference, fetchWithCache, KeysToCamelCase } from "./lib";

type IAnswer = {
  content: string;
  created_time: number;
  excerpt: string;
  voteup_count: number;
  comment_count: number;
  url: string;
  author: {
    id: string;
    name: string;
    headline: string;
    url: string;
    avatar_url: string;
  };
  question: {
    id: string;
    title: string;
    detail: string;
  };
};

type InitialData = {
  initialState: {
    entities: {
      answers: {
        [id: string]: KeysToCamelCase<IAnswer>;
      };
      questions: {
        [id: string]: KeysToCamelCase<Question>;
      };
    };
  };
};

async function parseHTML(text: string, id: string) {
  let script = '';
  const rewriter = new HTMLRewriter()
    .on('script#js-initialData', {
      text(text) {
        script += text.text;
      }
    })

  await rewriter.transform(new Response(text)).text();
  const initialData = JSON.parse(script || '{}') as InitialData;
  return { answer: initialData.initialState.entities.answers[id], question: initialData.initialState.entities.questions[initialData.initialState.entities.answers[id].question.id] };
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
    <footer>
        <p style="color: #999; font-size: 0.85em; text-align: center; margin-top: 2em;">
            本页面由 <a href="https://github.com/frostming/fxzhihu" target="_blank">FxZhihu</a> 生成。<br>
        </p>
    </footer>
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

export async function answer(id: string, redirect: boolean, env: Env, qid: string): Promise<string> {
  const url = `https://www.zhihu.com/api/v4/answers/${id}?include=content,excerpt,voteup_count,comment_count,question.detail`;
  const response = await fetchWithCache(url, {
    headers: {
      "user-agent": "node",
      "cookie": `z_c0=${env.Z_C0}`,
    },
  });
  const answerData = await response.json() as IAnswer;
  const { question } = answerData;
  const createdTime = new Date(answerData.created_time * 1000);

  return template({
    title: answerData.question.title,
    url: answerData.url,
    content: await fixImagesAndLinks(answerData.content),
    reference: await extractReference(answerData.content),
    excerpt: answerData.excerpt,
    author: answerData.author.name,
    created_time: createdTime.toISOString(),
    created_time_formatted: createdTime.toDateString(),
    voteup_count: answerData.voteup_count.toString(),
    comment_count: answerData.comment_count.toString(),
    question: question.detail.trim().length > 0 ? questionTemplate({
      question: await fixImagesAndLinks(question.detail),
    }) : '',
    redirect: redirect ? 'true' : 'false',
    author_url: answerData.author.url.replace("/api/v4", ""),
    headline: answerData.author.headline,
    avatar_url: answerData.author.avatar_url,
  });
}
