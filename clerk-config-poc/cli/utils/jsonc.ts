/**
 * Parse JSONC (JSON with Comments) files
 */

export function parseJSONC(content: string): any {
  // Strip single-line comments (// ...) that are not inside strings
  // Strip multi-line comments (/* ... */)
  let inString = false;
  let inComment = false;
  let result = '';
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle string delimiters
    if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    // If we're in a string, keep everything
    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Check for multi-line comment start
    if (char === '/' && nextChar === '*' && !inComment) {
      inComment = true;
      i += 2;
      continue;
    }

    // Check for multi-line comment end
    if (inComment && char === '*' && nextChar === '/') {
      inComment = false;
      i += 2;
      continue;
    }

    // If we're in a multi-line comment, skip
    if (inComment) {
      i++;
      continue;
    }

    // Check for single-line comment
    if (char === '/' && nextChar === '/') {
      // Skip until end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Otherwise, keep the character
    result += char;
    i++;
  }

  return JSON.parse(result);
}
