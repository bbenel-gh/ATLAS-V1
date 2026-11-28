import {
  ATLAS_DEV_REF,
  assertAtlasDev,
  parseEnvFile,
  setEnvValues,
  sqlText,
} from './devTarget';

const devUrl = `https://${ATLAS_DEV_REF}.supabase.co`;

describe('assertAtlasDev', () => {
  it('accepts the atlas-dev URL with the atlas-dev link', () => {
    expect(assertAtlasDev({ supabaseUrl: devUrl, linkedRef: ATLAS_DEV_REF })).toBe(ATLAS_DEV_REF);
  });

  it('accepts a trailing slash and a trailing newline in the link file', () => {
    expect(assertAtlasDev({ supabaseUrl: `${devUrl}/`, linkedRef: `${ATLAS_DEV_REF}\n` })).toBe(ATLAS_DEV_REF);
  });

  it.each([
    ['another project', 'https://abcdefghijklmnopqrst.supabase.co'],
    ['a look-alike host', `https://${ATLAS_DEV_REF}.supabase.co.evil.example`],
    ['a look-alike subdomain', `https://x${ATLAS_DEV_REF}.supabase.co`],
    ['plain http', `http://${ATLAS_DEV_REF}.supabase.co`],
    ['a local URL', 'http://127.0.0.1:54321'],
    ['not a URL', 'atlas-dev'],
    ['an empty value', ''],
    ['a missing value', undefined],
  ])('refuses %s', (_label, url) => {
    expect(() => assertAtlasDev({ supabaseUrl: url, linkedRef: ATLAS_DEV_REF })).toThrow(/atlas-dev/);
  });

  it('refuses when the CLI is linked to another project', () => {
    expect(() => assertAtlasDev({ supabaseUrl: devUrl, linkedRef: 'abcdefghijklmnopqrst' })).toThrow(/linked/);
  });

  it('refuses when the CLI is not linked at all', () => {
    expect(() => assertAtlasDev({ supabaseUrl: devUrl, linkedRef: undefined })).toThrow(/linked/);
  });
});

describe('parseEnvFile', () => {
  it('reads KEY=value lines and skips comments and blanks', () => {
    const text = '# comment\n\nA=1\nB = two words \r\nC=\nD=x=y\n';
    expect(parseEnvFile(text)).toEqual({ A: '1', B: 'two words', C: '', D: 'x=y' });
  });
});

describe('setEnvValues', () => {
  it('replaces existing keys in place and keeps everything else', () => {
    const text = '# keep me\nA=old\nB=keep\n';
    expect(setEnvValues(text, { A: 'new' })).toBe('# keep me\nA=new\nB=keep\n');
  });

  it('appends missing keys at the end', () => {
    expect(setEnvValues('A=1\n', { B: '2' })).toBe('A=1\nB=2\n');
    expect(setEnvValues('A=1', { B: '2' })).toBe('A=1\nB=2\n');
    expect(setEnvValues('', { B: '2' })).toBe('B=2\n');
  });
});

describe('sqlText', () => {
  it('quotes a value as a SQL string literal', () => {
    expect(sqlText('Ama Test')).toBe("'Ama Test'");
  });

  it('doubles single quotes so a value cannot end the literal', () => {
    expect(sqlText("O'Brien'); drop table pupils; --")).toBe("'O''Brien''); drop table pupils; --'");
  });

  it('refuses a backslash or a NUL so nothing depends on server settings', () => {
    expect(() => sqlText('a\\b')).toThrow();
    expect(() => sqlText('a\u0000b')).toThrow();
  });
});
