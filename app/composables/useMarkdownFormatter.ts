// Round-trips markdown through remark to normalize formatting:
//   - bullets: '-' (consistent across nested lists)
//   - emphasis: '_', strong: '*'
//   - fenced code blocks (no indented variants)
//   - blank lines around blocks
//   - one-space list indentation
//   - GFM extensions (tables, strikethrough, task lists) preserved
//
// Pre-pass: humans paste / type list items with markers CommonMark
// doesn't recognize:
//   - `-item` (standard marker, missing the required space)
//   - `•item` / `• item` (Unicode bullet glyphs from Word, browsers,
//     copy-paste — `•◦▪▫‣⁃`)
// Remark would parse these as paragraph text, not a list, so we
// normalize them to `- item` before parsing. Repair only runs when
// 2+ consecutive list markers appear, so a stray `*emphasis*` or
// single line starting with `•` (rare) won't be misclassified.
//
// Numbered lists (`1. text`, `1) text`) are also detected but pass
// through unchanged — they're already valid CommonMark. Their
// indented continuation lines (`   detail under item`) are part of
// the run so the run-length count is right and a preceding "Title:"
// line still gets promoted.
//
// Title promotion: a short paragraph ending with `:` immediately
// before a list is converted to a `## Title` heading. Recipe sections
// like "Приготування:", "Інгредієнти:", "Instructions:" become real
// headings instead of plain prose.
//
// Remark is loaded lazily so the ~50KB bundle only ships when the user
// actually clicks the Format button.

const UNICODE_BULLET_RE = /^[•◦▪▫‣⁃]\s*/    // • ◦ ▪ ▫ ‣ ⁃
const STANDARD_BROKEN_RE = /^[-*+]\S/        // -item / *item / +item
const STANDARD_OK_RE = /^[-*+]\s/            // - item
const NUMBERED_RE = /^\d+[.)]\s/             // 1. item / 1) item
const INDENTED_RE = /^\s+\S/                 // continuation line (any leading whitespace)

const TITLE_MAX_LEN = 60

function isListMarker(line: string): boolean {
  return UNICODE_BULLET_RE.test(line)
    || STANDARD_BROKEN_RE.test(line)
    || STANDARD_OK_RE.test(line)
    || NUMBERED_RE.test(line)
}

function fixListLine(line: string): string {
  if (UNICODE_BULLET_RE.test(line)) return line.replace(UNICODE_BULLET_RE, '- ')
  if (STANDARD_BROKEN_RE.test(line)) return line.replace(/^([-*+])/, '$1 ')
  return line
}

function isPromotableTitle(line: string): boolean {
  const t = line.trim()
  if (!t.endsWith(':')) return false
  if (t.startsWith('#')) return false           // already a heading
  if (t.length > TITLE_MAX_LEN) return false    // probably a sentence, not a title
  return true
}

function repairListMarkers(input: string): string {
  const lines = input.split(/\r?\n/)
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    // Walk forward through a contiguous list block. A list block is
    // a sequence of marker lines plus their indented continuation
    // lines (no blank lines).
    let j = i
    let markerCount = 0
    while (j < lines.length) {
      if (isListMarker(lines[j]!)) {
        markerCount++
        j++
      }
      else if (markerCount > 0 && INDENTED_RE.test(lines[j]!)) {
        j++
      }
      else {
        break
      }
    }

    if (markerCount >= 2) {
      // Promote a preceding "Title:" line to `## Title`. Skip back
      // through blank lines to find the last non-empty entry.
      let prevIdx = out.length - 1
      while (prevIdx >= 0 && (out[prevIdx] ?? '').trim() === '') prevIdx--
      const prev = prevIdx >= 0 ? out[prevIdx] : undefined
      if (prev !== undefined && isPromotableTitle(prev)) {
        const trimmed = prev.trim()
        out[prevIdx] = `## ${trimmed.slice(0, -1).trim()}`
      }
      // Repair only marker lines — continuations stay as-is.
      for (let k = i; k < j; k++) {
        const line = lines[k]!
        out.push(isListMarker(line) ? fixListLine(line) : line)
      }
      i = j
    }
    else {
      out.push(lines[i]!)
      i++
    }
  }
  return out.join('\n')
}

export function useMarkdownFormatter() {
  const formatting = ref(false)

  async function format(input: string): Promise<string> {
    if (formatting.value || !input.trim()) return input
    formatting.value = true
    try {
      const repaired = repairListMarkers(input)
      const [{ remark }, { default: remarkGfm }] = await Promise.all([
        import('remark'),
        import('remark-gfm')
      ])
      const file = await remark()
        .use(remarkGfm)
        .data('settings', {
          bullet: '-',
          emphasis: '_',
          strong: '*',
          fence: '`',
          listItemIndent: 'one',
          rule: '-'
        })
        .process(repaired)
      // remark always emits a trailing newline; trim+restore so the
      // editor doesn't accumulate blank lines on repeated formatting.
      return String(file).trimEnd() + '\n'
    }
    finally {
      formatting.value = false
    }
  }

  return { format, formatting }
}
