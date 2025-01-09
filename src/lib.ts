export async function fixImagesAndLinks(html: string) {
  const htmlResponse = new Response(html)
  // Create a new HTMLRewriter instance
  const rewriter = new HTMLRewriter()
    // Handle img tags
    .on('img', {
      element(element) {
        const actualsrc = element.getAttribute('data-actualsrc')
        if (actualsrc) {
          element.setAttribute('src', actualsrc)
          // Remove the data-actualsrc attribute
          element.removeAttribute('data-actualsrc')
        }
      }
    })
    // Handle u tags
    .on('u', {
      element(element) {
        // Remove the u tag but keep its contents
        element.remove()
      },
      text(text) {
        // Ensure the text content is preserved
        text.before(text.text)
      }
    })
  // Transform the HTML content

  return await rewriter.transform(htmlResponse).text()
}

export function createTemplate<
  K extends readonly string[]
>(strings: TemplateStringsArray, ...keys: K) {
  return (dict: Record<K[number], string>) => {
    const result = [strings[0]];
    keys.forEach((key, i) => {
      result.push(dict[key as K[number]], strings[i + 1]);
    });
    return result.join("");
  };
}

export async function extractReference(html: string) {
  const references = new Map<string, { text: string; url: string }>();
  const htmlResponse = new Response(html);

  // Create HTMLRewriter instance to collect references
  const rewriter = new HTMLRewriter()
    .on('sup', {
      element(element) {
        const text = element.getAttribute('data-text')
        const url = element.getAttribute('data-url')
        const numero = element.getAttribute('data-numero')

        if (text && url && numero) {
          references.set(numero, { text, url })
        }
      }
    })

  // Process the HTML to collect references
  await rewriter.transform(htmlResponse).text()

  // Generate reference list if any references were found
  if (references.size > 0) {
    const referenceList = Array.from(references.entries())
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([index, { text, url }]) => `${index}. ${text} <a href="${url}">${url}</a>`)
      .join('<br>')

    return `<hr><section><h2>参考</h2>${referenceList}</section>`
  }

  // Return empty string if no references found
  return ''
}

export class FetchError extends Error {
  response?: Response;

  constructor(message: string, response?: Response) {
    super(message);
    this.response = response;
  }
}

export async function TransformUrl(url: string, env: Env) {
  const patterns = {
    question: new URLPattern({
      protocol: 'http{s}?',
      hostname: '*.zhihu.com',
      pathname: '/question/:questionId/answer/:answerId'
    }),
    answer: new URLPattern({
      protocol: 'http{s}?',
      hostname: '*.zhihu.com',
      pathname: '/answer/:answerId'
    }),
    article: new URLPattern({
      protocol: 'http{s}?',
      hostname: 'zhuanlan.zhihu.com',
      pathname: '/p/:articleId'
    })
  };

  const transformUrl = (urlString: string, env: Env) => {
    if (!urlString.startsWith('http')) return urlString;

    try {
      const questionMatch = patterns.question.exec(urlString);
      if (questionMatch) {
        return env.API_URL + `/question/${questionMatch.pathname.groups.questionId}/answer/${questionMatch.pathname.groups.answerId}`
      }

      const answerMatch = patterns.answer.exec(urlString);
      if (answerMatch) {
        return env.API_URL + `/answer/${answerMatch.pathname.groups.answerId}`
      }

      const articleMatch = patterns.article.exec(urlString);
      if (articleMatch) {
        return env.ARTICLE_URL + `/p/${articleMatch.pathname.groups.articleId}`
      }

      return urlString;
    } catch (e) {
      return urlString;
    }
  };
  return new HTMLRewriter()
    .on('a', {
      element(element) {
        const href = element.getAttribute('href')!;
        if (href?.startsWith('https://link.zhihu.com/')) {
          try {
            const url = new URL(href)
            const target = decodeURIComponent(url.searchParams.get('target') || '')
            if (target) {
              element.setAttribute('href', target)
            }
          } catch (e) {
            // Keep original href if URL parsing fails
            console.error('Failed to parse URL:', e)
          }
        } else {
          element.setAttribute('href', transformUrl(href, env));
        }
      }
    }).transform(new Response(url)).text();
  // Transform HTML string
}

function escapeHtml(text: string, insertBreaks: boolean = true) {
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return insertBreaks ? text.replace(/\n/g, '<br>') : text;
}

// NOTE: This is an incomplete list, please add more.
export type SegmentType = 'paragraph' | 'hr' | 'image' | 'heading' | 'card' | 'blockquote' | 'reference_block' | 'video' | 'code_block' | 'list_node';
type MarkType = 'link' | 'formula' | 'reference' | 'italic' | 'bold';
type Mark<T extends MarkType> = {
  [K in T]: K extends 'reference' ? { index: number } : K extends 'link' ? { href: string } : K extends 'formula' ? { img_url: string, height: number, width: number } : never;
} & {
  start_index: number;
  end_index: number;
  type: T;
};

export type Segment<T extends SegmentType> = {
  [K in T]: (K extends 'paragraph' ? { text: string }
    : K extends 'image' ? { urls: string[] }
    : K extends 'heading' ? { level: number, text: string }
    : K extends 'card' ? { url: string, title: string }
    : K extends 'blockquote' ? { text: string }
    : K extends 'reference_block' ? { items: { text: string, marks: Mark<MarkType>[] }[] }
    : K extends 'video' ? { url: string }
    : K extends 'code_block' ? { content: string, language: string }
    : K extends 'list_node' ? { items: { text: string, marks: Mark<MarkType>[] }[], type: 'ordered' | 'unordered' }
    : never) & { marks: Mark<MarkType>[] };
} & {
  type: T;
}

function replaceMarks(text: string, marks: Mark<MarkType>[]) {
  const extras = new Map<number, string[]>();
  const addToExtras = (index: number, content: string, first: boolean = false) => {
    if (!extras.has(index)) extras.set(index, []);
    if (first) {
      extras.get(index)!.unshift(content);
    } else {
      extras.get(index)!.push(content);
    }
  }
  for (const mark of marks.sort((a, b) => a.start_index - b.start_index)) {
    switch (mark.type) {
      case 'formula':
        const isBlock = mark.formula.height >= 28;
        addToExtras(mark.start_index, `<span ${isBlock ? 'class="formula-display"' : ''}><img src="${mark.formula.img_url}" alt="`);
        addToExtras(mark.end_index, `" width="${mark.formula.width * 1.2}px"></span>`, true);
        break;
      case 'reference':
        addToExtras(mark.start_index, `<sup data-text="${mark.reference.index}" id="reflink__${mark.reference.index}" data-numero="${mark.reference.index}">
          <a href="#ref__${mark.reference.index}">`);
        addToExtras(mark.end_index, '</a></sup>', true);
        break;
      case 'link':
        if (mark.link.href) {
          addToExtras(mark.start_index, `<a href="${mark.link.href}">`);
          addToExtras(mark.end_index, '</a>', true);
        }
        break;
      case 'italic':
        addToExtras(mark.start_index, '<em>');
        addToExtras(mark.end_index, '</em>', true);
        break;
      case 'bold':
        addToExtras(mark.start_index, '<strong>');
        addToExtras(mark.end_index, '</strong>', true);
        break;
    }
  }
  const parts = [];
  let lastIndex = 0;
  [...extras.entries()].sort((a, b) => a[0] - b[0]).forEach(([index, extra]) => {
    if (index > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, index)));
    }
    parts.push(...extra);
    lastIndex = index;
  });
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)));
  }
  return parts.join('');
}

export function renderSegments(segments: Segment<SegmentType>[]): string {
  return segments.map(segment => {
    switch (segment.type) {
      case 'paragraph':
        return `<p>${replaceMarks(segment.paragraph.text, segment.paragraph.marks)}</p>`;
      case 'blockquote':
        return `<blockquote>${replaceMarks(segment.blockquote.text, segment.blockquote.marks)}</blockquote>`;
      case 'heading':
        return `<h${segment.heading.level}>${replaceMarks(segment.heading.text, segment.heading.marks)}</h${segment.heading.level}>`;
      case 'image':
        return `<img src="${segment.image.urls[0]}">`;
      case 'card':
        return `<p><a href="${segment.card.url}">${segment.card.title}</a></p>`;
      case 'reference_block':
        return `<h2>参考</h2><ol class="references">${segment.reference_block.items.map(
          (item, index) => `<li id="ref__${index + 1}">${replaceMarks(item.text, item.marks)}<a href="#reflink__${index + 1}">⏎</a></li>`
        ).join('\n')}</ol>`;
      case 'video':
        return `<video src="${segment.video.url}" controls></video>`;
      case 'code_block':
        return `<pre><code class="${segment.code_block.language}">${escapeHtml(segment.code_block.content, false)}</code></pre>`;
      case 'list_node':
        return `<${segment.list_node.type === 'ordered' ? 'ol' : 'ul'}>
          ${segment.list_node.items.map(item => `<li>${replaceMarks(item.text, item.marks)}</li>`).join('\n')}
          </${segment.list_node.type === 'ordered' ? 'ol' : 'ul'}>`;
      case 'hr':
        return '<hr>';
      default:
        return escapeHtml((segment[segment.type] as any)?.text || '');
    }
  }).join('');
}
