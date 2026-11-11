import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/shared/mailer';

describe('renderTemplate', () => {
  it('substitutes a single placeholder', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Aarav' })).toBe('Hello Aarav!');
  });

  it('substitutes multiple placeholders', () => {
    const result = renderTemplate(
      'Hi {{candidateName}}, you have been shortlisted for {{jobTitle}} at {{companyName}}.',
      { candidateName: 'Aarav', jobTitle: 'Backend Engineer', companyName: 'Acme Corp' },
    );
    expect(result).toBe('Hi Aarav, you have been shortlisted for Backend Engineer at Acme Corp.');
  });

  it('replaces an unmatched placeholder with an empty string rather than leaving it verbatim', () => {
    expect(renderTemplate('Link: {{link}}', {})).toBe('Link: ');
  });

  it('treats null and undefined variable values the same as missing (empty string)', () => {
    expect(renderTemplate('{{a}}{{b}}', { a: null, b: undefined })).toBe('');
  });

  it('leaves text with no placeholders untouched', () => {
    expect(renderTemplate('No placeholders here.', { name: 'ignored' })).toBe('No placeholders here.');
  });

  it('does not substitute a malformed single-brace token', () => {
    expect(renderTemplate('{name} vs {{name}}', { name: 'Aarav' })).toBe('{name} vs Aarav');
  });
});
