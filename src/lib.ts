export function fixImagesAndLinks(html: string): string {
    return html.replaceAll(/<img [^>]+? data-actualsrc="([^>]+?)"[^>]+?(\/?>)/g, (match, p1, p2) => {
        return `<img src="${p1}"${p2}`;
    });
}