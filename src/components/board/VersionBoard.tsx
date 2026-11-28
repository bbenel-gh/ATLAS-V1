import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { PillButton } from '@/components/common/PillButton';
import { spacing } from '@/components/common/theme';
import { localUriFor } from '@/data/videoCache';
import type { VideoVersionMedia } from '@/domain/videoPlan';

import { BoardHeader } from './BoardHeader';
import { BoardVideo, type BoardVideoHandle } from './BoardVideo';

type Uris = { video: string; poster: string | null; captions: string | null };

/**
 * One video version on its board: header (P10), the board with captions, and
 * after the end (P8) the "Watch again" control (P9) and whatever the parent
 * passes as `after` (S17: the overview questions; S21: the check question).
 */
export function VersionBoard({
  topicCode,
  version,
  breadcrumb,
  title,
  journey,
  visible,
  onBoardLayout,
  scrollToBoard,
  onEnded,
  onMissing,
  after,
}: {
  topicCode: string;
  version: VideoVersionMedia;
  breadcrumb: string;
  title: string;
  journey: string;
  visible: number;
  onBoardLayout: (e: LayoutChangeEvent) => void;
  scrollToBoard: () => void;
  onEnded?: () => void;
  /** The video file is not on the phone: the parent sends the pupil back to the download. */
  onMissing?: () => void;
  after?: ReactNode;
}) {
  const [uris, setUris] = useState<Uris | null>(null);
  const [missing, setMissing] = useState(false);
  const [ended, setEnded] = useState(false);
  const boardRef = useRef<BoardVideoHandle>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [video, poster, captions] = await Promise.all([
        localUriFor(topicCode, version.id, 'video'),
        localUriFor(topicCode, version.id, 'poster'),
        localUriFor(topicCode, version.id, 'captions'),
      ]).catch((e: unknown) => {
        console.warn('localUriFor failed', e);
        return [null, null, null] as const;
      });
      if (!live) return;
      if (video) setUris({ video, poster, captions });
      else setMissing(true);
    })();
    return () => {
      live = false;
    };
  }, [topicCode, version.id]);

  return (
    <>
      <BoardHeader breadcrumb={breadcrumb} title={title} journey={journey} />
      <View onLayout={onBoardLayout} style={styles.bleed}>
        {uris ? (
          <BoardVideo
            ref={boardRef}
            videoUri={uris.video}
            posterUri={uris.poster}
            captionsUri={uris.captions}
            boardColour={version.boardColour}
            visible={visible}
            onEnded={() => {
              setEnded(true);
              onEnded?.();
            }}
          />
        ) : missing ? (
          <CalmError message={COPY.topic.videoMissing} onRetry={() => onMissing?.()} />
        ) : null}
      </View>
      {ended ? (
        <View style={styles.after}>
          <PillButton
            variant="secondary"
            label={COPY.board.watchAgain}
            onPress={() => {
              setEnded(false);
              boardRef.current?.replay();
              scrollToBoard();
            }}
          />
          {after}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // The board runs edge to edge, past the Screen's 16 padding, so it reads as part of the page.
  bleed: { marginHorizontal: -spacing.lg },
  after: { gap: spacing.lg, alignItems: 'flex-start' },
});
