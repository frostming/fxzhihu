import { fixImagesAndLinks, createTemplate, extractReference, fetchWithCache } from './lib';

const ZHIHU_HOST = 'https://www.zhihu.com';

type Status = {
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
  content: ContentItem[];
  created: number;
  updated: number;
  reaction: {
    statistics: {
      up_vote_count: number;
      comment_count: number;
    };
  };
  origin_pin: Status;
};

type ContentItem = TextContent | VideoContent | ImageContent;

interface TextContent {
  title: string;
  content: string;
  fold_type: string;
  own_text: string;
  type: 'text';
  text_link_type: string;
}

interface ImageContent {
  url: string;
  original_url: string;
  is_watermark: boolean;
  watermark_url: string;
  thumbnail: string;
  width: number;
  height: number;
  type: 'image';
  is_gif: boolean;
  is_long: boolean;
}


interface VideoContent {
  status: string;
  width: number;
  playlist: VideoFormat[];
  type: 'video';
}

interface VideoFormat {
  format: string;
  url: string;
  bitrate: number;
  height: number;
  width: number;
  fps: number;
  duration: number;
  quality: string;
  size: number;
}

function findVideoUrl(contents: ContentItem[]): string | undefined {
  return contents
    .find(contentItem => contentItem.type === 'video')
    ?.playlist
    ?.find(videoItem => videoItem.quality === 'hd')
    ?.url;
}

const template = createTemplate`
<!DOCTYPE html>
<html lang="zh">
<head>
  <title>${'title'} | FxZhihu</title>
  <meta charset="UTF-8">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${'title'} | FxZhihu">
  <meta property="og:site_name" content="FxZhihu / Fixup Zhihu">
  <meta property="og:url" content="${'url'}">
  <meta property="twitter:card" content="summary">
  <meta name="twitter:title" property="og:title" itemprop="name" content="${'title'} | FxZhihu">
  <meta name="twitter:description" property="og:description" itemprop="description" content="${'excerpt'}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/yue.css@0.4.0/yue.css">
  <script>
    const redirect = ${'redirect'};
    if (redirect) {
      window.location.replace("${'url'}");
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
  </style>
</head>
<body style="max-width: 1000px; margin: 0 auto; padding: 0 1em 0 1em;" class="yue">
  <header>
    <h1><a href="${'url'}">${'title'}</a></h1>
    <div class="author">
      <img class="avatar" id="avatar" src="${'avatar_url'}" />
      <div>
        <h3 rel="author">
          <a href="${'author_url'}" target="_blank">@${'author'}</a>
        </h3>
        <div>${'headline'}</div>
      </div>
    </div>
    <time datetime="${'created_time'}">发表于 ${'created_time_formatted'}</time>
    <time datetime="${'updated_time'}">更新于 ${'updated_time_formatted'}</time>
    <p rel="stats"style="color: #999; font-size: 0.9em;">${'voteup_count'} 👍 / ${'comment_count'} 💬</p>
  </header>
  <article>
    ${'content'}
    ${'reference'}
    ${'videoHtml'}
  </article>
  ${'originPinResult'}
</body>
</html>
`;

const originPinTemplate = createTemplate`
<hr>
<section>
<header>
    <h2><a href="${'originPinUrl'}">转发：${'originPinAuthorName'}的想法</a></h2>
    <div class="author">
        <img class="avatar" id="avatar" src="${'originPinAuthorAvatarUrl'}" />
        <div>
            <h2 rel="author">
                <a href="${'originPinAuthorUrl'}" target="_blank">@${'originPinAuthorName'}</a>
            </h2>
            <p>${'originPinAuthorHeadline'}</p>
        </div>
    </div>
    <time datetime="${'originPinCreatedTime'}">发表于 ${'originPinCreatedTimeFormatted'}</time>
    <time datetime="${'originPinUpdatedTime'}">更新于 ${'originPinUpdatedTimeFormatted'}</time>
    <p rel="stats"style="color: #999; font-size: 0.9em;">${'originPinVoteupCount'} 👍 / ${'originPinCommentCount'} 💬</p>
    </header>
    <article>
        ${'originPinContent'}
        ${'originPinVideoHtml'}
    </article>
</section>
`;

const videoContentTemplate = createTemplate`
<video controls="controls" src="${'videoUrl'}">`;

export async function status(id: string, redirect: boolean, env: Env): Promise<string> {
  const url = new URL(id, `https://www.zhihu.com/api/v4/pins/`);
  const response = await fetchWithCache(url);
  const data = await response.json<Status>();
  const createdTime = new Date(data.created * 1000);
  const updatedTime = new Date(data.updated * 1000);
  let originPinResult = '';


  if (data.origin_pin) {
    const videoUrl = findVideoUrl(data.origin_pin.content);
    let originPinVideoHtml = '';
    if (videoUrl) {
      originPinVideoHtml = videoContentTemplate({
        videoUrl
      });
    }
    originPinResult = originPinTemplate({
      originPinUrl: new URL(data.origin_pin.id.toString(), `https://www.zhihu.com/pin/`).href,
      originPinContent: await fixImagesAndLinks(data.origin_pin.content_html),
      originPinAuthorName: data.origin_pin.author.name,
      originPinAuthorUrl: ZHIHU_HOST + data.origin_pin.author.url,
      originPinAuthorHeadline: data.origin_pin.author.headline,
      originPinAuthorAvatarUrl: data.origin_pin.author.avatar_url,
      originPinCreatedTime: new Date(data.origin_pin.created * 1000).toISOString(),
      originPinCreatedTimeFormatted: new Date(data.origin_pin.created * 1000).toDateString(),
      originPinUpdatedTime: new Date(data.origin_pin.updated * 1000).toISOString(),
      originPinUpdatedTimeFormatted: new Date(data.origin_pin.updated * 1000).toDateString(),
      originPinVoteupCount: data.origin_pin.reaction.statistics.up_vote_count.toString(),
      originPinCommentCount: data.origin_pin.reaction.statistics.comment_count.toString(),
      originPinVideoHtml
    });
  }
  const videoUrl = findVideoUrl(data.content);
  let videoHtml = '';
  if (videoUrl) {
    videoHtml = videoContentTemplate({
      videoUrl
    });
  }

  return template({
    title: data.author.name + '的想法',
    url: new URL(id, `https://www.zhihu.com/pin/`).href,
    content: await fixImagesAndLinks(data.content_html),
    reference: await extractReference(data.content_html),
    excerpt: data.excerpt_title,
    author: data.author.name,
    created_time: createdTime.toISOString(),
    created_time_formatted: createdTime.toDateString(),
    updated_time: updatedTime.toISOString(),
    updated_time_formatted: updatedTime.toDateString(),
    voteup_count: data.reaction.statistics.up_vote_count.toString(),
    comment_count: data.reaction.statistics.comment_count.toString(),
    redirect: redirect ? 'true' : 'false',
    author_url: ZHIHU_HOST + data.author.url,
    headline: data.author.headline,
    avatar_url: data.author.avatar_url,
    originPinResult,
    videoHtml
  });
}
