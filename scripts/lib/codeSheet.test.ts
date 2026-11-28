import {
  assertTestClassName,
  CREATED_PUPIL_ID_PREFIX,
  createdPupilId,
  parseNamesCsv,
  PER_PAGE,
  renderCodeSheet,
  sheetFileName,
} from './codeSheet';

describe('parseNamesCsv', () => {
  it('takes the first column of each line, trimmed, skipping blank lines', () => {
    expect(parseNamesCsv('Ama\r\n  Kofi  \n\nEsi,extra,columns\n')).toEqual(['Ama', 'Kofi', 'Esi']);
  });

  it.each(['name', 'Name', 'first name', 'First_Name', 'nickname'])('skips a header row "%s"', (header) => {
    expect(parseNamesCsv(`${header}\nAma\n`)).toEqual(['Ama']);
  });

  it('removes surrounding double quotes', () => {
    expect(parseNamesCsv('"Ama"\n"Kofi, Jr"\n')).toEqual(['Ama', 'Kofi, Jr']);
  });

  it('drops a byte order mark from Excel', () => {
    expect(parseNamesCsv('﻿Ama\n')).toEqual(['Ama']);
  });

  it('refuses a name over 40 characters, naming the line', () => {
    expect(() => parseNamesCsv(`Ama\n${'x'.repeat(41)}\n`)).toThrow(/line 2/);
  });

  it('refuses an empty list', () => {
    expect(() => parseNamesCsv('name\n\n')).toThrow(/no names/i);
  });
});

describe('assertTestClassName', () => {
  it('accepts a test class', () => {
    expect(() => assertTestClassName('Test Basic 7A')).not.toThrow();
  });

  it.each(['Basic 7A', 'Detieso Basic 7', 'Testing 7A', ''])('refuses "%s" (rule 15: atlas-dev holds test classes only)', (name) => {
    expect(() => assertTestClassName(name)).toThrow(/Test /);
  });

  it('refuses a name longer than the database allows', () => {
    expect(() => assertTestClassName(`Test ${'x'.repeat(80)}`)).toThrow(/80/);
  });
});

describe('createdPupilId', () => {
  it('is a version 4 UUID that starts with the prefix the seed cleans up', () => {
    const id = createdPupilId(() => Uint8Array.from({ length: 16 }, (_, i) => i * 17));
    expect(id.startsWith(CREATED_PUPIL_ID_PREFIX)).toBe(true);
    expect(id).toMatch(/^7e57c0de-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('sheetFileName', () => {
  it('is codes-<class>-<date>.html with the class made safe for a file name', () => {
    expect(sheetFileName('Test Basic 7A', new Date(Date.UTC(2026, 10, 26, 9)))).toBe('codes-test-basic-7a-2026-11-26.html');
    expect(sheetFileName('Test  7/B: "x"', new Date(Date.UTC(2026, 0, 2)))).toBe('codes-test-7-b-x-2026-01-02.html');
  });
});

describe('renderCodeSheet', () => {
  const pupils = Array.from({ length: 13 }, (_, i) => ({ name: `Pupil ${i + 1}`, code: `ABCD${'EFGHJKLMNPQRS'[i]}2` }));
  const html = renderCodeSheet({ className: 'Test Basic 7A', pupils });

  it('puts 12 cards on each A4 page', () => {
    expect(PER_PAGE).toBe(12);
    expect(html).toContain('size: A4');
    expect(html.match(/class="page"/g)).toHaveLength(2);
    expect(html.match(/class="card"/g)).toHaveLength(13);
  });

  it('shows the class, first name and code on each card, and the keep-safe line', () => {
    for (const p of pupils) {
      expect(html).toContain(`>${p.name}<`);
      expect(html).toContain(`>${p.code}<`);
    }
    expect(html.match(/Keep this code\. Do not share your PIN\./g)).toHaveLength(13);
    expect(html.match(/>Test Basic 7A</g)?.length).toBeGreaterThanOrEqual(13);
  });

  it('draws cut lines', () => {
    expect(html).toMatch(/\.card \{[^}]*dashed/);
  });

  it('escapes names, so a name cannot break the page', () => {
    const out = renderCodeSheet({ className: 'Test <7A>', pupils: [{ name: '<b>Ama & "Kofi"</b>', code: 'ABCDEF' }] });
    expect(out).toContain('&lt;b&gt;Ama &amp; &quot;Kofi&quot;&lt;/b&gt;');
    expect(out).toContain('Test &lt;7A&gt;');
    expect(out).not.toContain('<b>Ama');
  });

  it('loads nothing from the internet (the file holds pupil names)', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<script|<link/);
  });

  it('refuses a code outside the alphabet', () => {
    expect(() => renderCodeSheet({ className: 'Test 7A', pupils: [{ name: 'Ama', code: 'ABCD0E' }] })).toThrow(/ABCD0E/);
  });
});
