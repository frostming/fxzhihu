export async function fixImagesAndLinks(html: string) {
	const encoder = new TextEncoder()
	const bytes = encoder.encode(html)
	const htmlResponse = new Response(bytes)
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
	const encoder = new TextEncoder();
	const bytes = encoder.encode(html);
	const htmlResponse = new Response(bytes);

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
