// Unit tests for RecipientParser covering delimiter handling, dedup/
// normalization, bracketed-name extraction, CSV header/email-column
// detection, invalid-entry reporting, and comment-line skipping.

import { RecipientParser } from '../utils/recipient.parser';

export function runRecipientTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  };

  test('Parses comma and newline separated emails correctly', () => {
    const input = 'alice@example.com, bob@example.com\ncharlie@example.com; david@example.com';
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 4) {
      throw new Error(`Expected 4 emails, got ${parsed.validEmails.length}`);
    }
    if (!parsed.validEmails.includes('alice@example.com')) throw new Error('Missing alice');
    if (!parsed.validEmails.includes('bob@example.com')) throw new Error('Missing bob');
  });

  test('Deduplicates duplicate emails and normalizes casing', () => {
    const input = ['Alice@Example.COM', 'alice@example.com', 'ALICE@EXAMPLE.COM', 'bob@test.com'];
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 2) {
      throw new Error(`Expected 2 deduplicated emails, got ${parsed.validEmails.length}`);
    }
    if (parsed.validEmails[0] !== 'alice@example.com') throw new Error('Casing not normalized');
  });

  test('Extracts emails from bracketed names and skips CSV headers', () => {
    const input = 'Email,Name\n"John Doe <john@reachinbox.test>"\n"Jane Doe <jane@reachinbox.test>"';
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 2) {
      throw new Error(`Expected 2 emails, got ${parsed.validEmails.length}`);
    }
    if (!parsed.validEmails.includes('john@reachinbox.test')) throw new Error('Missing john');
    if (!parsed.validEmails.includes('jane@reachinbox.test')) throw new Error('Missing jane');
  });

  test('Rejects invalid email formats and logs invalid entries', () => {
    const input = 'not-an-email, valid@domain.com, @missinguser.com, user@.com';
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 1 || parsed.validEmails[0] !== 'valid@domain.com') {
      throw new Error(`Invalid parse: ${JSON.stringify(parsed)}`);
    }
    if (parsed.invalidEntries.length < 2) {
      throw new Error('Failed to record invalid entries');
    }
  });

  test('Extracts only the email column from a multi-column CSV, ignoring metadata columns', () => {
    const input =
      'Email,Name,Company\nalex.morgan@example.com,Alex Morgan,Acme Corp\nsarah.connor@example.com,Sarah Connor,Cyberdyne';
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 2) {
      throw new Error(`Expected 2 emails, got ${parsed.validEmails.length}: ${JSON.stringify(parsed)}`);
    }
    if (!parsed.validEmails.includes('alex.morgan@example.com')) throw new Error('Missing alex.morgan');
    if (!parsed.validEmails.includes('sarah.connor@example.com')) throw new Error('Missing sarah.connor');
    if (parsed.invalidEntries.length !== 0) {
      throw new Error(`Expected no invalid entries (Name/Company are metadata, not garbage), got: ${JSON.stringify(parsed.invalidEntries)}`);
    }
  });

  test('Skips comment lines starting with # in plain text lists', () => {
    const input = '# Marketing Lead Outreach List\nemma.watson@example.com\nbruce.wayne@example.com';
    const parsed = RecipientParser.parse(input);
    if (parsed.validEmails.length !== 2) {
      throw new Error(`Expected 2 emails, got ${parsed.validEmails.length}: ${JSON.stringify(parsed)}`);
    }
    if (parsed.invalidEntries.length !== 0) {
      throw new Error(`Expected the comment line to be skipped, not reported invalid: ${JSON.stringify(parsed.invalidEntries)}`);
    }
  });

  return results;
}
