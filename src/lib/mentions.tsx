import Link from "next/link";

const MENTION_REGEX = /(?:^|\s)@([a-zA-Z0-9_]+)/g;

/**
 * Extract @username mentions from text content.
 */
export function parseMentions(content: string): string[] {
  const mentions: string[] = [];
  let match;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}

/**
 * Render text content with @mentions as styled links.
 * Splits content around @username tokens and wraps each in a Link.
 */
export function renderContentWithMentions(content: string): React.ReactNode[] {
  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    const fullMatch = match[0];
    const username = match[1];
    const startIndex = match.index;

    // Leading whitespace before @ might be part of match
    const prefix = fullMatch.startsWith(" ") || fullMatch.startsWith("\n") ? fullMatch[0] : "";
    const atStart = startIndex + prefix.length;

    // Text before the mention
    if (atStart > lastIndex) {
      parts.push(content.slice(lastIndex, atStart));
    }

    // The mention link
    parts.push(
      <Link
        key={`${username}-${startIndex}`}
        href={`/profile/${username}`}
        className="font-semibold text-cma-bordeaux hover:underline"
      >
        @{username}
      </Link>
    );

    lastIndex = MENTION_REGEX.lastIndex;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}
