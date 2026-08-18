export interface ParsedRecipients {
  validEmails: string[];
  invalidEntries: string[];
  totalDetected: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const HEADER_WORDS = ['email', 'emails', 'recipient', 'recipients', 'to', 'address'];
const EMAIL_COLUMN_HEADER_WORDS = ['email', 'emails', 'email address', 'e-mail', 'e-mail address'];

export class RecipientParser {
  /**
   * Parses raw text or array of strings into validated, deduplicated email addresses.
   *
   * Row/column aware for real CSV input: if the first non-comment line looks like a
   * CSV header row containing an "Email" column, only that column is extracted from
   * every subsequent row - other columns (Name, Company, etc.) are legitimate
   * metadata and are silently ignored rather than reported as invalid entries.
   * Falls back to flat comma/semicolon/tab tokenization for plain address lists.
   */
  static parse(input: string | string[]): ParsedRecipients {
    const lines: string[] = [];

    if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          lines.push(...item.split(/\r\n|\r|\n/));
        }
      }
    } else if (typeof input === 'string') {
      lines.push(...input.split(/\r\n|\r|\n/));
    }

    const seen = new Set<string>();
    const validEmails: string[] = [];
    const invalidEntries: string[] = [];

    const processToken = (rawToken: string) => {
      let token = rawToken.trim().replace(/^["']+|["']+$/g, '').trim();
      if (!token) return;

      // Extract email from "Name <email@domain.com>" format if present
      const bracketMatch = token.match(/<([^>]+)>/);
      const emailCandidate = bracketMatch ? bracketMatch[1].trim() : token;

      if (EMAIL_REGEX.test(emailCandidate)) {
        const normalized = emailCandidate.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          validEmails.push(normalized);
        }
      } else if (!HEADER_WORDS.includes(emailCandidate.toLowerCase())) {
        invalidEntries.push(token);
      }
    };

    // Detect a CSV header row: the first non-empty, non-comment line splits into
    // 2+ comma-separated columns where one names an "email" column.
    let emailColumnIndex: number | null = null;
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const cols = trimmedLine.split(',').map((c) => c.trim().replace(/^["']+|["']+$/g, '').toLowerCase());
      if (cols.length >= 2) {
        const idx = cols.findIndex((c) => EMAIL_COLUMN_HEADER_WORDS.includes(c));
        if (idx !== -1) {
          emailColumnIndex = idx;
          headerLineIndex = i;
        }
      }
      break;
    }

    lines.forEach((line, i) => {
      if (i === headerLineIndex) return;
      if (!line.trim() || line.trim().startsWith('#')) return;

      if (emailColumnIndex !== null) {
        // CSV mode: only the designated email column is a recipient candidate;
        // other columns in the row are ignored metadata, not invalid entries.
        const cols = line.split(',');
        const candidate = cols[emailColumnIndex];
        if (candidate !== undefined) {
          processToken(candidate);
        }
        return;
      }

      // Flat mode: no CSV header detected, split the line as a plain address list.
      line.split(/[,;\t]+/).forEach(processToken);
    });

    return {
      validEmails,
      invalidEntries,
      totalDetected: validEmails.length,
    };
  }
}
