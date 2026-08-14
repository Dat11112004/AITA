/**
 * Centralized assignment HTML sanitizer & style normalizer.
 * Ensures:
 * 1. High contrast text in code blocks (dark #0f172a text on light #f8fafc background, or bright #f8fafc text on dark #0d1117 background).
 * 2. Full-width container layout across all assignment types ("không bao giờ bị thu nhỏ/bị hẹp").
 * 3. Removes all global-polluting <style>, <link>, <script>, <html>, <head>, <body> tags.
 */
export function cleanAssignmentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  let cleaned = rawHtml;

  // 1. Strip markdown code fences if AI accidentally wrapped it
  cleaned = cleaned.replace(/^```html\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();

  // 2. Strip embedded <style>...</style> blocks that pollute global page rules
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 3. Strip <script>, <link>, <meta>, <title>, <!DOCTYPE> and document tags
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<head[\s\S]*?<\/head>/gi, '');
  cleaned = cleaned.replace(/<link[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<meta[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<title[\s\S]*?<\/title>/gi, '');
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<\/?(?:html|head|body|meta|title)[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Process inline styles on tags to fix text colors, widths, zooms, paper sizing
  cleaned = cleaned.replace(/\s*style\s*=\s*(["'])([\s\S]*?)\1/gi, (_, __, styleContent: string) => {
    let s = styleContent;

    // A. Remove any fixed widths or max-widths (px, rem, em, mm, cm, in, pt, %, vw, ch) and replace with 100% or auto
    s = s.replace(/(?:max-width|min-width)\s*:\s*[^;"]+;?/gi, 'max-width: 100%;');
    s = s.replace(/\bwidth\s*:\s*(?:[0-9]+(?:\.[0-9]+)?(?:px|rem|em|mm|cm|in|pt|vw|%)|[0-9]+);?/gi, 'width: 100%;');
    s = s.replace(/\bheight\s*:\s*(?:297mm|100vh|[0-9]+(?:mm|cm|in|pt));?/gi, '');
    s = s.replace(/(?:margin|margin-left|margin-right)\s*:\s*(?:0\s+auto|auto|center);?/gi, '');
    s = s.replace(/zoom\s*:\s*[^;"]+;?/gi, '');
    s = s.replace(/(?:-webkit-)?transform\s*:\s*scale\([^)]+\);?/gi, '');
    s = s.replace(/word-break\s*:\s*break-all;?/gi, '');
    s = s.replace(/white-space\s*:\s*nowrap;?/gi, '');

    // B. Fix faint/white text color on light backgrounds
    const isLightBg = /background(?:-color)?\s*:\s*(?:#f[89a-f][0-9a-f]{4}|#fff|#ffffff|rgb\(\s*24[0-9]|rgb\(\s*25[0-5]|white|#f1f5f9)/i.test(s);
    const hasLightColor = /color\s*:\s*(?:#f[89a-f][0-9a-f]{4}|#fff|#ffffff|white|rgb\(\s*255|rgb\(\s*24|#e2e8f0)/i.test(s);

    if (isLightBg && hasLightColor) {
      s = s.replace(/color\s*:\s*[^;"]+;?/gi, 'color: #0f172a !important;');
    } else if (isLightBg && !/color\s*:/i.test(s)) {
      s += '; color: #0f172a !important;';
    }

    return s.trim() ? ` style="${s.trim()}"` : '';
  });

  // 5. Ensure all <pre> and <code> blocks use light background #f8fafc with crisp dark text #0f172a in light mode
  cleaned = cleaned.replace(/<pre([^>]*)>/gi, (_match, p1) => {
    let styleAttr = p1;
    styleAttr = styleAttr.replace(/background(?:-color)?\s*:\s*(?:#0[0-9a-f]{5}|#1[0-9a-f]{5}|#000|black|#111)/gi, 'background-color: #f8fafc !important');
    if (!/style=/i.test(styleAttr)) {
      return `<pre style="background-color: #f8fafc !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important;"${styleAttr}>`;
    }
    return `<pre${styleAttr}>`;
  });

  // 6. Ensure all tables have 100% width and clean border collapse
  cleaned = cleaned.replace(/<table([^>]*)>/gi, (match, p1) => {
    if (/style=/i.test(p1)) {
      return match.replace(/style=(["'])([\s\S]*?)\1/i, 'style="width: 100% !important; border-collapse: collapse; $2"');
    }
    return `<table style="width: 100% !important; border-collapse: collapse;"${p1}>`;
  });

  return cleaned.trim();
}
