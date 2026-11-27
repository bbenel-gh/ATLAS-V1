import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Body, Label } from '@/components/common/Text';
import { colors, spacing } from '@/components/common/theme';
import { ChoicePill } from '@/components/onboarding/ChoicePill';
import { downloadTopic, getTopicDownloadSize, readManifest, type DownloadProgress } from '@/data/videoCache';
import { useVideoQuality } from '@/data/videoQuality';
import { formatMegabytes, QUALITIES, toByteCount, type TopicMedia } from '@/domain/videoPlan';

type Phase = 'sizing' | 'idle' | 'downloading' | 'paused' | 'failed';

/**
 * "Download this topic" (runbook S16 item 2). Shown before the overview when
 * the topic is not on the phone yet. Cancel pauses; the next tap continues
 * from where it stopped. Progress is "<n> of <total> videos", never a percentage.
 */
export function TopicDownload({ media, onReady }: { media: TopicMedia; onReady: () => void }) {
  const [phase, setPhase] = useState<Phase>('sizing');
  const [bytes, setBytes] = useState<number | null>(0);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const controller = useRef<AbortController | null>(null);
  const quality = useVideoQuality((q) => q.quality);
  const qualityLoaded = useVideoQuality((q) => q.loaded);
  const setQuality = useVideoQuality((q) => q.setQuality);

  useEffect(() => {
    if (!qualityLoaded) return;
    let live = true;
    void (async () => {
      // Never stuck on "Checking": if the size cannot be found, offer the download without it.
      const size = await getTopicDownloadSize(media, quality).catch((e: unknown) => {
        console.warn('getTopicDownloadSize failed', e);
        return null;
      });
      const manifest = await readManifest(media.topicCode);
      if (!live) return;
      setBytes(size);
      setPhase(manifest?.paused ? 'paused' : 'idle');
    })();
    return () => {
      live = false;
      controller.current?.abort();
    };
  }, [media, quality, qualityLoaded]);

  const start = async () => {
    const c = new AbortController();
    controller.current = c;
    setPhase('downloading');
    const result = await downloadTopic(media, { quality, onProgress: setProgress, signal: c.signal });
    controller.current = null;
    if (result === 'done') onReady();
    else setPhase(result === 'cancelled' ? 'paused' : 'failed');
  };

  if (phase === 'sizing') return <Body muted>{COPY.topic.checkingSize}</Body>;

  return (
    <View style={styles.wrap}>
      <Body>{bytes === null ? COPY.topic.needsDataUnknown : COPY.topic.needsData(formatMegabytes(bytes))}</Body>
      {phase === 'downloading' ? (
        <>
          <LoadingCalm />
          {progress ? <Label>{COPY.topic.progress(progress.videosDone, progress.videosTotal)}</Label> : null}
          {progress?.fileBytesTotal ? <FileLine written={progress.fileBytesWritten} total={progress.fileBytesTotal} /> : null}
          <PillButton variant="secondary" label={COPY.topic.cancel} onPress={() => controller.current?.abort()} />
        </>
      ) : (
        <>
          <Label>{COPY.topic.quality}</Label>
          <View style={styles.pills} accessibilityRole="radiogroup" accessibilityHint={COPY.topic.qualityHint}>
            {QUALITIES.map((q) => (
              <ChoicePill key={q} kind="radio" label={COPY.topic.qualityLabel(q)} selected={q === quality} onPress={() => setQuality(q)} />
            ))}
          </View>
          <Body muted>{COPY.topic.qualityHint}</Body>
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
  const share = Math.max(0, Math.min(1, toByteCount(written) / Math.max(1, toByteCount(total))));
  return (
    <View style={styles.track} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { flex: share }]} />
      <View style={{ flex: 1 - share }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  track: { flexDirection: 'row', height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { backgroundColor: colors.teal },
});
