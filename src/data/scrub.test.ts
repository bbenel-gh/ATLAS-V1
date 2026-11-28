import { scrubEvent } from './scrub';

describe('scrubEvent', () => {
  it('removes name, pin, code, answer and reason at any depth', () => {
    const event = {
      message: 'Something failed',
      extra: {
        name: 'Ama',
        pin: '1234',
        code: 'K7Q2ZP',
        answer: 'Wood is a metal',
        reason: 'Because it is hard',
        nested: [{ Name: 'Kofi', keep: 1 }],
        segment: '1A',
      },
      user: { id: 'pupil-uuid', name: 'Ama' },
    };
    expect(scrubEvent(event)).toEqual({
      message: 'Something failed',
      extra: { nested: [{ keep: 1 }], segment: '1A' },
      user: { id: 'pupil-uuid' },
    });
  });

  it('removes the device name, which can hold a pupil name', () => {
    const event = { contexts: { device: { name: "Ama's phone", model: 'A05' } } };
    expect(scrubEvent(event)).toEqual({ contexts: { device: { model: 'A05' } } });
  });

  it('scrubs breadcrumb data', () => {
    const event = { breadcrumbs: [{ category: 'ui', data: { answer: 'iron', segment: '1B' } }] };
    expect(scrubEvent(event)).toEqual({ breadcrumbs: [{ category: 'ui', data: { segment: '1B' } }] });
  });

  // Sentry's own structure uses `name`. Removing it from sdk would break the
  // event, and the os, runtime and browser blocks hold no pupil data.
  it('keeps Sentry structural names', () => {
    const event = {
      sdk: { name: 'sentry.javascript.react-native', version: '8.28.0' },
      contexts: {
        os: { name: 'Android', version: '14' },
        runtime: { name: 'hermes' },
        browser: { name: 'Chrome' },
      },
    };
    expect(scrubEvent(event)).toEqual(event);
  });

  it('does not change the input', () => {
    const event = { extra: { name: 'Ama' } };
    scrubEvent(event);
    expect(event).toEqual({ extra: { name: 'Ama' } });
  });

  it('passes through values that are not objects', () => {
    expect(scrubEvent({ a: null, b: 3, c: 'x', d: [1, 'two'] })).toEqual({
      a: null,
      b: 3,
      c: 'x',
      d: [1, 'two'],
    });
  });
});
