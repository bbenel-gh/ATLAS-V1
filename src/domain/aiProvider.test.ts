import { DEFAULT_OPENROUTER_MODELS, loggedModel, OPENROUTER_PREFIX, pickProvider } from './aiProvider';

describe('DEFAULT_OPENROUTER_MODELS (D-50)', () => {
  it("is Bright's chain, in order", () => {
    expect(DEFAULT_OPENROUTER_MODELS).toEqual([
      'nvidia/nemotron-3-ultra:free',
      'baidu/ernie-5.5-flash-preview:free',
      'recursive/flint-v1.0:free',
      'inclusionai/ling-3.2-flash:free',
    ]);
  });
  it('holds only free models, so a fallback never costs money', () => {
    expect(DEFAULT_OPENROUTER_MODELS.every((m) => m.endsWith(':free'))).toBe(true);
  });
});

describe('pickProvider (D-50)', () => {
  it('uses Claude whenever the Claude key is set', () => {
    expect(pickProvider({ anthropicKey: 'a', openrouterKey: 'o' })).toEqual({ kind: 'anthropic' });
    expect(pickProvider({ anthropicKey: 'a' })).toEqual({ kind: 'anthropic' });
  });
  it('uses the OpenRouter chain when only its key is set', () => {
    expect(pickProvider({ openrouterKey: 'o' })).toEqual({ kind: 'openrouter', models: [...DEFAULT_OPENROUTER_MODELS] });
  });
  it('takes a comma-separated list from a secret instead, trimmed, without repeats', () => {
    expect(pickProvider({ openrouterKey: 'o', openrouterModels: ' a/x:free , b/y:free,,a/x:free ' })).toEqual({
      kind: 'openrouter',
      models: ['a/x:free', 'b/y:free'],
    });
  });
  it('keeps the default chain when the list secret is blank', () => {
    expect(pickProvider({ openrouterKey: 'o', openrouterModels: ' , ' })).toEqual({ kind: 'openrouter', models: [...DEFAULT_OPENROUTER_MODELS] });
  });
  it('is none without a key, so the pupil gets tap options', () => {
    expect(pickProvider({})).toEqual({ kind: 'none' });
    expect(pickProvider({ anthropicKey: ' ', openrouterKey: '' })).toEqual({ kind: 'none' });
    expect(pickProvider({ openrouterModels: 'a/x:free' })).toEqual({ kind: 'none' });
  });
});

describe('loggedModel', () => {
  it('logs the Claude model as it is', () => {
    expect(loggedModel({ kind: 'anthropic' }, 'claude-haiku-5-5')).toBe('claude-haiku-5-5');
  });
  it('logs the model that actually answered, marked as a stand-in', () => {
    expect(loggedModel({ kind: 'openrouter', models: ['a/x:free', 'b/y:free'] }, 'claude-haiku-5-5', 'b/y:free')).toBe(`${OPENROUTER_PREFIX}b/y:free`);
  });
  it('logs the first model of the chain when no model answered', () => {
    expect(loggedModel({ kind: 'openrouter', models: ['a/x:free'] }, 'claude-haiku-5-5')).toBe(`${OPENROUTER_PREFIX}a/x:free`);
  });
  it('fits the ai_calls.model limit of 80 characters', () => {
    expect(loggedModel({ kind: 'openrouter', models: ['m'.repeat(200)] }, 'x').length).toBeLessThanOrEqual(80);
  });
});
