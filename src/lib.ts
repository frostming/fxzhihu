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

export function renderTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
        return data[p1] || '';
    });
}