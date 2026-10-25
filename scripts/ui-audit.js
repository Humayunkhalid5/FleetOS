// Paste into the browser console (or run via a test driver) on any FleetOS
// page. Reports low-contrast text, clipped/overflowing text, horizontal page
// scroll and broken images for the current theme.
(() => {
  const parse = (value) => {
    const match = String(value).match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
  };
  const lum = ({ r, g, b }) => {
    const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const backgroundOf = (element) => {
    const stack = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none' && !/gradient/.test(style.backgroundImage)) return null; // photo behind text: skip
      const color = parse(style.backgroundColor);
      if (color && color.a > 0) { stack.push(color); if (color.a >= 1) break; }
    }
    let result = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    for (let index = stack.length - 1; index >= 0; index -= 1) result = blend(stack[index], result);
    return result;
  };
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
  };
  const issues = { contrast: [], overflow: [], images: [], pageScroll: document.documentElement.scrollWidth > innerWidth + 1 };
  const seen = new Set();
  document.querySelectorAll('body *').forEach((element) => {
    if (!visible(element) || ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CANVAS'].includes(element.tagName.toUpperCase())) return;
    const ownText = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent.trim()).join(' ').trim();
    const style = getComputedStyle(element);
    if (ownText && !element.closest('[aria-hidden="true"]') && !style.fontFamily.includes('Material Symbols')) {
      const fg = parse(style.color);
      const bg = backgroundOf(element);
      if (fg && bg && !(/transparent/.test(style.color)) && style.webkitTextFillColor !== 'rgba(0, 0, 0, 0)') {
        const color = blend(fg, bg);
        const [light, dark] = [lum(color), lum(bg)].sort((a, b) => b - a);
        const ratio = (light + 0.05) / (dark + 0.05);
        const size = parseFloat(style.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
        const disabled = element.closest(':disabled, [aria-disabled="true"]');
        if (!disabled && ratio < (large ? 3 : 4.5)) {
          const key = `${ownText.slice(0, 40)}|${ratio.toFixed(2)}`;
          if (!seen.has(key)) { seen.add(key); issues.contrast.push({ text: ownText.slice(0, 60), ratio: Number(ratio.toFixed(2)), color: style.color, cls: String(element.className).slice(0, 80) }); }
        }
      }
      // Text spilling out of a box that does not clip or scroll.
      if (element.scrollWidth > element.clientWidth + 2 && !['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && style.display !== 'inline' && element.clientWidth > 0) {
        issues.overflow.push({ text: ownText.slice(0, 60), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, cls: String(element.className).slice(0, 80) });
      }
    }
    if (element.tagName === 'IMG' && element.complete && element.naturalWidth === 0 && element.getAttribute('src')) issues.images.push(element.getAttribute('src').slice(0, 90));
  });
  return issues;
})();
