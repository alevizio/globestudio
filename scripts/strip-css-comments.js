// Drops /* comments */ from built CSS and changes nothing else. The build
// keeps cssMinify off so both backdrop-filter spellings survive (see
// vite.config.js), which also shipped every source comment: about 60 kB of
// the 214 kB index stylesheet. A comment that has a line to itself goes with
// its indentation and line break, so no blank lines are left behind; an
// inline comment is cut on its own. Quoted strings are copied untouched, so
// a "/*" inside content: or url("...") stays.
export const stripCssComments = (css) => {
  let out = "";
  let copyFrom = 0;
  let i = 0;
  const { length } = css;
  while (i < length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      i += 1;
      while (i < length && css[i] !== ch && css[i] !== "\n") i += css[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch !== "/" || css[i + 1] !== "*") {
      i += 1;
      continue;
    }
    const close = css.indexOf("*/", i + 2);
    const end = close === -1 ? length : close + 2;
    const lineStart = css.lastIndexOf("\n", i - 1) + 1;
    const lineBreak = css.indexOf("\n", end);
    const lineEnd = lineBreak === -1 ? length : lineBreak + 1;
    const ownLine =
      lineStart >= copyFrom &&
      /^[ \t]*$/.test(css.slice(lineStart, i)) &&
      /^[ \t]*\r?\n?$/.test(css.slice(end, lineEnd));
    if (ownLine) {
      out += css.slice(copyFrom, lineStart);
      copyFrom = lineEnd;
      i = lineEnd;
    } else {
      out += css.slice(copyFrom, i);
      copyFrom = end;
      i = end;
    }
  }
  return out + css.slice(copyFrom);
};
