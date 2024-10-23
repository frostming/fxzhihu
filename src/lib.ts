export function fixImagesAndLinks(html: string): string {
	let result = html.replaceAll(/<img [^>]+? data-actualsrc="([^>]+?)"[^>]+?(\/?>)/g, (match, p1, p2) => {
		return `<img src="${p1}"${p2}`;
	});
	result = result.replaceAll(/href="(https:\/\/link\.zhihu\.com\/.+?)"/g, (match, p1) => {
		const url = new URL(p1);
		const target = decodeURIComponent(url.searchParams.get('target') || '');
		return `href="${target}"`;
	});
	result = result.replaceAll(/<u>([\s\S]*?)<\/u>/g, (match, p1) => p1);
	return result;
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

export function extractReference(html: string): string {
	const referenceRegex = /<sup[^>]*data-text="([^"]*)"[^>]*data-url="([^"]*)"[^>]*data-numero="([^"]*)"[^>]*>/g;
	const references = new Map<string, { text: string; url: string }>();

	let match;
	while ((match = referenceRegex.exec(html)) !== null) {
		const [, text, url, numero] = match;
		references.set(numero, { text, url });
	}

	let referenceList = Array.from(references.entries())
		.sort(([a], [b]) => parseInt(a) - parseInt(b))
		.map(([index, { text, url }]) => `${index}. ${text} <a href="${url}">${url}</a>`);

	if (referenceList.length > 0) {
		return `<hr><section><h2>参考</h2>${referenceList.join("<br>")}</section>`;
	}
	return "";
}
