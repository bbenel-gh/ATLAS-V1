import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COPY } from '@/components/common/copy';
import { board, fonts, radius, spacing, typography } from '@/components/common/theme';
import { readLocalText } from '@/data/videoCache';
import { cueAt, parseVtt, type Cue } from '@/domain/vtt';
import { shouldPlay } from '@/domain/videoPlan';

export type BoardVideoHandle = {
  /** P9: start the same version again from the beginning. The parent scrolls back to the board. */
  replay: () => void;
};

type Props = {
  /** Local file only (P3). Never a web link. */
  videoUri: string;
  posterUri: string | null;
  captionsUri: string | null;
  /** The sampled board colour from the content file (P2). */
  boardColour: string;
  /** How much of the board is on screen, 0 to 1, from the parent's scroll (P6). */
  visible: number;
  /** P8: the video reached its end. The last frame stays on the board. */
  onEnded?: () => void;
};

/** Width of each edge fade as a share of the board: 4% (P2), drawn as 4 bands of 1%. */
const FADE_BANDS = [0.85, 0.6, 0.35, 0.12];

/**
 * The board video (specs/video-board.md P1 to P9). It should look like a page
 * being written on, not like a video player: no frame, no shadow, no controls,
 * no menus, and a background that matches the board exactly.
 */
export const BoardVideo = forwardRef<BoardVideoHandle, Props>(function BoardVideo(
  { videoUri, posterUri, captionsUri, boardColour, visible, onEnded },
  ref,
) {
  const player = useVideoPlayer({ uri: videoUri }, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [firstFrame, setFirstFrame] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [soundPill, setSoundPill] = useState(false);
  const [loadedCues, setLoadedCues] = useState<{ uri: string; cues: Cue[] } | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const triedMuted = useRef(false);

  // P6: the app going to the background pauses; coming back resumes unless the pupil paused.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // P7: the caption cues for this version.
  useEffect(() => {
    if (!captionsUri) return;
    let live = true;
    void readLocalText(captionsUri).then((text) => {
      if (live) setLoadedCues({ uri: captionsUri, cues: parseVtt(text) });
    });
    return () => {
      live = false;
    };
  }, [captionsUri]);
  const cues = captionsUri && loadedCues?.uri === captionsUri ? loadedCues.cues : [];

  // P7: the caption follows the video's own clock, not a separate timer.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const next = cueAt(cues, currentTime)?.text ?? null;
    setCaption((prev) => (prev === next ? prev : next));
  });

  // P8: the end. The last frame stays; the parent fades in what comes next.
  useEventListener(player, 'playToEnd', () => {
    setEnded(true);
    onEnded?.();
  });

  const wantPlay = shouldPlay({ ready: status === 'readyToPlay', ended, userPaused, appActive, visible });

  useEffect(() => {
    if (wantPlay) player.play();
    else player.pause();
  }, [wantPlay, player]);

  // P4: if the phone refuses to start with sound, play muted and offer "Tap for sound".
  useEffect(() => {
    if (!wantPlay || isPlaying || triedMuted.current) return;
    const timer = setTimeout(() => {
      if (player.playing) return;
      triedMuted.current = true;
      setMuted(player, true);
      player.play();
      setSoundPill(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [wantPlay, isPlaying, player]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        seekTo(player, 0);
        setCaption(null);
        setEnded(false);
        setUserPaused(false);
        player.play();
      },
    }),
    [player],
  );

  const onTap = () => {
    // P4: the first touch after a muted start only turns the sound on, without restarting.
    if (soundPill) {
      setMuted(player, false);
      setSoundPill(false);
      return;
    }
    if (ended) return;
    setUserPaused((p) => !p);
  };

  const pausedByPupil = userPaused && !ended;

  return (
    <View style={[styles.column, { backgroundColor: boardColour }]}>
      <Pressable
        onPress={onTap}
        // P1: a long press does nothing, so no menu can open.
        onLongPress={() => undefined}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={pausedByPupil ? COPY.board.tapToContinue : COPY.board.tapToPause}
        style={[styles.board, { backgroundColor: boardColour }]}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          allowsPictureInPicture={false}
          startsPictureInPictureAutomatically={false}
          fullscreenOptions={{ enable: false }}
          contentFit="contain"
          onFirstFrameRender={() => setFirstFrame(true)}
          pointerEvents="none"
        />
        {!firstFrame && posterUri ? (
          <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : null}
        <EdgeFade colour={boardColour} />
        {pausedByPupil ? (
          <View style={styles.paused} pointerEvents="none">
            {/* P5: the board dims slightly. */}
            <View style={styles.dim} />
            <Text style={styles.pausedText}>{COPY.board.tapToContinue}</Text>
          </View>
        ) : null}
        {soundPill ? (
          <View style={styles.soundPill} pointerEvents="none">
            <Text style={styles.soundText}>{COPY.board.tapForSound}</Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.captionBox} accessibilityLiveRegion="polite">
        <Text style={styles.caption}>{caption ?? ' '}</Text>
      </View>
    </View>
  );
});

/** The player is a native object; these change it outside React's render data. */
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}
function seekTo(player: VideoPlayer, seconds: number) {
  player.currentTime = seconds;
}

/** P2: a soft 4% fade into the board colour at each edge hides small colour drift between phones. */
function EdgeFade({ colour }: { colour: string }) {
  const bands = FADE_BANDS.map((opacity, i) => ({ opacity, at: `${i}%` as const }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bands.map((b) => (
        <View key={`l${b.at}`} style={[styles.vBand, { left: b.at, backgroundColor: colour, opacity: b.opacity }]} />
      ))}
      {bands.map((b) => (
        <View key={`r${b.at}`} style={[styles.vBand, { right: b.at, backgroundColor: colour, opacity: b.opacity }]} />
      ))}
      {bands.map((b) => (
        <View key={`t${b.at}`} style={[styles.hBand, { top: b.at, backgroundColor: colour, opacity: b.opacity }]} />
      ))}
      {bands.map((b) => (
        <View key={`b${b.at}`} style={[styles.hBand, { bottom: b.at, backgroundColor: colour, opacity: b.opacity }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // No frame, border, radius or shadow (P1).
  column: { width: '100%' },
  board: { width: '100%', aspectRatio: 16 / 10, overflow: 'hidden' },
  vBand: { position: 'absolute', top: 0, bottom: 0, width: '1%' },
  hBand: { position: 'absolute', left: 0, right: 0, height: '1%' },
  paused: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: board.boardInk, opacity: 0.08 },
  pausedText: { fontFamily: fonts.hand, fontSize: 28, lineHeight: 34, color: board.boardInk },
  soundPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: board.boardLine,
    backgroundColor: board.board,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  soundText: { ...typography.small, color: board.boardInk },
  captionBox: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56, justifyContent: 'center' },
  caption: { ...typography.body, color: board.boardInk, textAlign: 'center' },
});
