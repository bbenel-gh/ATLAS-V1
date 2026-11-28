/**
 * Turns segment rows into the list the dev segments screen shows (specs/B1.md
 * task 6). The overview is the segment with code OV (D-34). Pure, no imports.
 */
export const OVERVIEW_CODE = 'OV';

export type SegmentRow = { code: string; title: string; sort_order: number };
export type SegmentItem = { code: string; title: string };
export type SegmentList = { overview: SegmentItem | null; segments: SegmentItem[] };

export function toSegmentList(rows: readonly SegmentRow[]): SegmentList {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const item = (r: SegmentRow): SegmentItem => ({ code: r.code, title: r.title });
  const overview = sorted.find((r) => r.code === OVERVIEW_CODE);
  return {
    overview: overview ? item(overview) : null,
    segments: sorted.filter((r) => r.code !== OVERVIEW_CODE).map(item),
  };
}
