// Strips Instagram cruft from captions so they read like clean photo-book text.
// Note: Meta exports captions as latin-1-encoded UTF-8; we round-trip to recover emoji/accents.

// Meta's exports encode UTF-8 bytes as latin1 (so 🌅 arrives as "ð\x9f\x8c\x85"). We detect that
// fingerprint — only latin1-range chars, no higher codepoints — and round-trip; otherwise leave alone.
function fixMojibake(s: string): string {
  let suspicious = false;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0xff) return s;
    if (code >= 0x80) suspicious = true;
  }
  if (!suspicious) return s;
  try {
    return Buffer.from(s, 'latin1').toString('utf8');
  } catch {
    return s;
  }
}

export function cleanCaption(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let s = fixMojibake(raw);

  // Strip @mentions and #hashtags
  s = s.replace(/(^|\s)[@#][\w.]+/g, ' ');
  // Strip URLs
  s = s.replace(/https?:\/\/\S+/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  if (!s) return undefined;
  // Truncate to a reasonable photo-book length
  if (s.length > 200) s = s.slice(0, 197).trimEnd() + '…';
  return s;
}
