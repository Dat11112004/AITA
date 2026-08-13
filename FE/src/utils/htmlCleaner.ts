/**
 * Centralized assignment HTML sanitizer & style normalizer.
 * Ensures:
 * 1. High contrast text in code blocks (dark #0f172a text on light #f8fafc background, or bright #f8fafc text on dark #0d1117 background).
 * 2. Full-width container layout across all assignment types ("không bị hẹp").
 */
export function cleanAssignmentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  // 1. Strip embedded <style>...</style> blocks that pollute global page rules
  let cleaned = rawHtml.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 2. Normalize wrapper divs or body tags that force narrow max-width
  cleaned = cleaned
    .replace(/<body[\s\S]*?>/gi, '')
    .replace(/<\/body>/gi, '')
    .replace(/<html[\s\S]*?>/gi, '')
    .replace(/<\/html>/gi, '');

  // 3. Process inline styles on tags to fix text colors and widths
  cleaned = cleaned.replace(/\s*style\s*=\s*(["'])([\s\S]*?)\1/gi, (_, __, styleContent: string) => {
    let s = styleContent;

    // A. Replace narrow fixed widths with full width
    s = s.replace(/(?:max-width|min-width)\s*:\s*(?:65ch|[0-9]+px|40rem|50rem|60rem|650px|700px|800px);?/gi, 'max-width: 100%;');
    s = s.replace(/width\s*:\s*(?:[0-9]+px|40rem|50rem|60rem);?/gi, 'width: 100%;');
    s = s.replace(/word-break\s*:\s*break-all;?/gi, '');
    s = s.replace(/white-space\s*:\s*nowrap;?/gi, '');

    // B. Fix faint/white text color on light backgrounds (#f8fafc, #f1f5f9, #ffffff, rgb(248...), etc.)
    const isLightBg = /background(?:-color)?\s*:\s*(?:#f[89a-f][0-9a-f]{4}|#fff|#ffffff|rgb\(\s*24[0-9]|rgb\(\s*25[0-5]|white|#f1f5f9)/i.test(s);
    const hasLightColor = /color\s*:\s*(?:#f[89a-f][0-9a-f]{4}|#fff|#ffffff|white|rgb\(\s*255|rgb\(\s*24|#e2e8f0)/i.test(s);

    if (isLightBg && hasLightColor) {
      s = s.replace(/color\s*:\s*[^;"]+;?/gi, 'color: #0f172a !important;');
    } else if (isLightBg && !/color\s*:/i.test(s)) {
      s += '; color: #0f172a !important;';
    }

    return s.trim() ? ` style="${s.trim()}"` : '';
  });

  // 4. Ensure all <pre> and <code> blocks use light background #f8fafc with crisp dark text #0f172a in light mode
  cleaned = cleaned.replace(/<pre([^>]*)>/gi, (_match, p1) => {
    let styleAttr = p1;
    // Normalize dark inline background to light background
    styleAttr = styleAttr.replace(/background(?:-color)?\s*:\s*(?:#0[0-9a-f]{5}|#1[0-9a-f]{5}|#000|black|#111)/gi, 'background-color: #f8fafc !important');
    if (!/style=/i.test(styleAttr)) {
      return `<pre style="background-color: #f8fafc !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important;"${styleAttr}>`;
    }
    return `<pre${styleAttr}>`;
  });

  return cleaned;
}
