import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Body, Label } from '@/components/common/Text';
import { colors, spacing } from '@/components/common/theme';
import { downloadTopic, getTopicDownloadSize, readManifest, type DownloadProgress } from '@/data/videoCache';
import { formatMegabytes, type TopicMedia } from '@/domain/videoPlan';

type Phase = 'sizing' | 'idle' | 'downloading' | 'paused' | 'failed';

/**
 * "Download this topic" (runbook S16 item 2). Shown before the overview when
 * the topic is not on the phone yet. Cancel pauses; the next tap continues
 * from where it stopped. Progress is "<n> of <total> videos", never a percentage.
 */
export function TopicDownload({ media, onReady }: { media: TopicMedia; onReady: () => void }) {
  const [phase, setPhase] = useState<Phase>('sizing');
  const [bytes, setBytes] = useState(0);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [size, manifest] = await Promise.all([getTopicDownloadSize(media), readManifest(media.topicCode)]);
      if (!live) return;
      setBytes(size);
      setPhase(manifest?.paused ? 'paused' : 'idle');
    })();
    return () => {
      live = false;
      controller.current?.abort();
    };
  }, [media]);

  const start = async () => {
    const c = new AbortController();
    controller.current = c;
    setPhase('downloading');
    const result = await downloadTopic(media, { onProgress: setProgress, signal: c.signal });
    controller.current = null;
    if (result === 'done') onReady();
    else setPhase(result === 'cancelled' ? 'paused' : 'failed');
  };

  if (phase === 'sizing') return <Body muted>{COPY.topic.checkingSize}</Body>;

  return (
    <View style={styles.wrap}>
      <Body>{COPY.topic.needsData(formatMegabytes(bytes))}</Body>
      {phase === 'downloading' ? (
        <>
          <LoadingCalm />
          {progress ? <Label>{COPY.topic.progress(progress.videosDone, progress.videosTotal)}</Label> : null}
          {progress?.fileBytesTotal ? <FileLine written={progress.fileBytesWritten} total={progress.fileBytesTotal} /> : null}
          <PillButton variant="secondary" label={COPY.topic.cancel} onPress={() => controller.current?.abort()} />
        </>
      ) : (
        <>
          {phase === 'paused' ? <Body muted>{COPY.topic.paused}</Body> : null}
          {phase === 'failed' ? <Body muted>{COPY.topic.failed}</Body> : null}
          <PillButton
            label={phase === 'idle' ? COPY.topic.download : COPY.topic.continueDownload}
            onPress={() => void start()}
          />
        </>
      )}
    </View>
  );
}

/** A thin line for the file downloading now. No numbers on screen. */
function FileLine({ written, total }: { written: number; total: number }) {
  const share = Math.max(0, Math.min(1, written / total));
  return (
    <View style={styles.track} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { flex: share }]} />
      <View style={{ flex: 1 - share }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  track: { flexDirection: 'row', height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { backgroundColor: colors.teal },
});
