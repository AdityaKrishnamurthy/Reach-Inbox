export interface ParsedRecipients {
  validEmails: string[];
  invalidEntries: string[];
  totalDetected: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class RecipientParser {
  /**
   * Parses raw text or array of strings into validated, deduplicated email addresses
   */
  static parse(input: string | string[]): ParsedRecipients {
    const rawTokens: string[] = [];

    if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string') {
          // Split each string by comma, semicolon, newline, or tab
          const tokens = item.split(/[\r\n,;\t]+/);
          rawTokens.push(...tokens);
        }
      }
    } else if (typeof input === 'string') {
      // Split by comma, semicolon, newline, tab
      const tokens = input.split(/[\r\n,;\t]+/);
      rawTokens.push(...tokens);
    }

    const seen = new Set<string>();
    const validEmails: string[] = [];
    const invalidEntries: string[] = [];

    for (let token of rawTokens) {
      token = token.trim();
      
      // Clean leading/trailing quotes or CSV formatting
      token = token.replace(/^["']+|["']+$/g, '').trim();

      if (!token) continue;

      // Extract email from "Name <email@domain.com>" format if present
      const bracketMatch = token.match(/<([^>]+)>/);
      const emailCandidate = bracketMatch ? bracketMatch[1].trim() : token;

      if (EMAIL_REGEX.test(emailCandidate)) {
        const normalized = emailCandidate.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          validEmails.push(normalized);
        }
      } else {
        // Skip common CSV header words like "email", "recipients", "to"
        if (!['email', 'emails', 'recipient', 'recipients', 'to', 'address'].includes(emailCandidate.toLowerCase())) {
          invalidEntries.push(token);
        }
      }
    }

    return {
      validEmails,
      invalidEntries,
      totalDetected: validEmails.length,
    };
  }
}
