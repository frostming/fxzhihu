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
    // Handle links
    .on('a', {
      element(element) {
        const href = element.getAttribute('href')
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
        element.setAttribute('href', transformUrl(href, env));
      }
    }).transform(new Response(url)).text();
  // Transform HTML string
}
