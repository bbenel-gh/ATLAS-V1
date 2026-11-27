import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { DevSignOut } from '@/components/auth/DevSignOut';
import { TopicDownload } from '@/components/board/TopicDownload';
import { useBoardScroll } from '@/components/board/useBoardScroll';
import { VersionBoard } from '@/components/board/VersionBoard';
import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { Screen } from '@/components/common/Screen';
import { Body, Heading } from '@/components/common/Text';
import { loadTopicMedia } from '@/data/topicMedia';
import { isTopicReady } from '@/data/videoCache';
import type { TopicMedia } from '@/domain/videoPlan';

async function loadTopic(code: string) {
  const result = await loadTopicMedia(code);
  if (result.kind !== 'ok') return result;
  // Ready means every file is on the phone at whatever quality was downloaded (D-46).
  let ready = false;
  try {
    ready = await isTopicReady(result.media);
  } catch (e) {
    // Not ready is the safe answer: the download screen checks every file again.
    console.warn('isTopicReady failed', e);
  }
  return { kind: 'ok' as const, media: result.media, ready };
}

/**
 * Topic screen (runbook S16). The id is the topic code (D-44). First visit:
 * "Download this topic". Once the topic is on the phone: the overview board.
 * S17 adds the overview questions under the board.
 */
export default function Topic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const code = String(id ?? '');
  const query = useQuery({ queryKey: ['topicMedia', code], queryFn: () => loadTopic(code), staleTime: Infinity, retry: false });
  const [downloaded, setDownloaded] = useState(false);
  const state = query.data ?? { kind: 'loading' as const };
  const load = () => void query.refetch();
  const missing = () => {
    setDownloaded(false);
    load();
  };

  // A failed load shows a calm retry, never an endless loading screen.
  if (query.isError && !query.isFetching) {
    console.warn('topic load failed', query.error);
    return (
      <Screen>
        <CalmError message={COPY.topic.loadFailed} onRetry={load} />
        <DevSignOut />
      </Screen>
    );
  }
  if (state.kind === 'loading') {
    return (
      <Screen>
        <LoadingCalm />
      </Screen>
    );
  }
  if (state.kind !== 'ok') {
    return (
      <Screen>
        {state.kind === 'offline' ? (
          <CalmError message={COPY.offline} onRetry={load} />
        ) : (
          <Body>{COPY.topic.notFound}</Body>
        )}
        <DevSignOut />
      </Screen>
    );
  }
  if (!state.ready && !downloaded) {
    return (
      <Screen>
        <Heading>{state.media.title ?? code}</Heading>
        <TopicDownload media={state.media} onReady={() => setDownloaded(true)} />
      </Screen>
    );
  }
  return <OverviewBoard media={state.media} onMissing={missing} />;
}

function OverviewBoard({ media, onMissing }: { media: TopicMedia; onMissing: () => void }) {
  const scroll = useBoardScroll();
  const overview = media.versions.find((v) => v.segmentCode === 'OV');
  const title = media.title ?? media.topicCode;
  const shortTitle = title.split(': ').pop() ?? title;
  return (
    <Screen onScroll={scroll.onScroll} scrollRef={scroll.scrollRef}>
      {overview ? (
        <VersionBoard
          topicCode={media.topicCode}
          version={overview}
          breadcrumb={COPY.board.breadcrumb(media.classLevel ?? '', media.subject ?? '', shortTitle)}
          title={title}
          journey={COPY.topic.overview}
          visible={scroll.visible}
          onBoardLayout={scroll.onBoardLayout}
          scrollToBoard={scroll.scrollToBoard}
          onEnded={scroll.scrollToEnd}
          onMissing={onMissing}
          after={<Body muted>{COPY.topic.ready}</Body>}
        />
      ) : (
        <Body>{COPY.topic.notFound}</Body>
      )}
      <DevSignOut />
    </Screen>
  );
}
