import { toSegmentList } from './segmentList';

const seg = (code: string, sort_order: number, title = `Title ${code}`) => ({ code, title, sort_order });

describe('toSegmentList', () => {
  it('puts the overview first and the segments in their order', () => {
    const list = toSegmentList([seg('1C', 3), seg('OV', 0, 'Overview'), seg('1A', 1), seg('1B', 2)]);
    expect(list.overview).toEqual({ code: 'OV', title: 'Overview' });
    expect(list.segments.map((s) => s.code)).toEqual(['1A', '1B', '1C']);
  });

  it('orders by sort order, not by code, so 1AA comes after 1Z', () => {
    const list = toSegmentList([seg('1AA', 27), seg('1Z', 26), seg('1A', 1)]);
    expect(list.segments.map((s) => s.code)).toEqual(['1A', '1Z', '1AA']);
  });

  it('copes with no overview and no segments', () => {
    expect(toSegmentList([])).toEqual({ overview: null, segments: [] });
  });

  it('keeps only code and title', () => {
    expect(toSegmentList([seg('1A', 1, 'What a material is')]).segments).toEqual([{ code: '1A', title: 'What a material is' }]);
  });
});
