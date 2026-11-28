import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';

import { COPY } from '@/components/common/copy';
import { board, fonts, radius, spacing, typography } from '@/components/common/theme';
import { useReducedMotion } from '@/components/common/useReducedMotion';
import { readLocalText } from '@/data/videoCache';
import {
  DOUBLE_TAP_MS,
  HOLD_DELAY_MS,
  HOLD_STEP_MS,
  HOLD_STEP_SECONDS,
  nextFurthest,
  SEEK_STEP,
  seekTarget,
  sideOf,
  tapKind,
  type SeekSide,
} from '@/domain/boardSeek';
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

/** How long a double-tap hint stays before it fades, and how long the fade takes. */
const HINT_HOLD_MS = 600;
const HINT_FADE_MS = 400;

/**
 * The board video (specs/video-board.md P1 to P11). It should look like a page
 * being written on, not like a video player: no frame, no shadow, no controls,
 * no menus, and a background that matches the board exactly. Seeking is by
 * gesture only (P11): double tap or hold the left half to go back, the right
 * half to go forward, never past the furthest point already watched.
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

  // P11: seek gestures.
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState<{ side: SeekSide; text: string } | null>(null);
  const [hintOpacity] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();
  const furthest = useRef(0);
  const width = useRef(0);
  const pressSide = useRef<SeekSide>('back');
  const lastTap = useRef<{ at: number; side: SeekSide } | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    endedRef.current = ended;
  }, [ended]);

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
    furthest.current = nextFurthest(furthest.current, currentTime);
    const next = cueAt(cues, currentTime)?.text ?? null;
    setCaption((prev) => (prev === next ? prev : next));
  });

  // P8: the end. The last frame stays; the parent fades in what comes next.
  useEventListener(player, 'playToEnd', () => {
    furthest.current = nextFurthest(furthest.current, player.duration);
    endedRef.current = true;
    setEnded(true);
    onEnded?.();
  });

  // P11: holding a side scrubs with the video paused; afterwards playback follows the same rules.
  const wantPlay = !holding && shouldPlay({ ready: status === 'readyToPlay', ended, userPaused, appActive, visible });

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

  // Timers never outlive the board.
  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (holdTimer.current) clearInterval(holdTimer.current);
    },
    [],
  );

  const togglePause = () => {
    if (endedRef.current) return;
    setUserPaused((p) => !p);
  };

  /** P11: a short handwritten hint on the side that was touched. `stay` keeps it while a hold lasts. */
  const showHint = (side: SeekSide, text: string, stay: boolean) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintOpacity.stopAnimation();
    hintOpacity.setValue(1);
    setHint({ side, text });
    if (!stay) hideHint();
  };
  const hideHint = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      if (reduceMotion) {
        setHint(null);
        return;
      }
      Animated.timing(hintOpacity, { toValue: 0, duration: HINT_FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setHint(null);
      });
    }, HINT_HOLD_MS);
  };

  /** P11: move by `delta` seconds if the rules allow. Returns false when it cannot move. */
  const seekBy = (delta: number): boolean => {
    const target = seekTarget({ current: player.currentTime, delta, duration: player.duration, furthest: furthest.current });
    if (target === null) return false;
    seekTo(player, target);
    // timeUpdate does not run while paused, so the caption follows the seek here.
    setCaption(cueAt(cues, target)?.text ?? null);
    if (delta < 0 && endedRef.current) {
      endedRef.current = false;
      setEnded(false);
    }
    return true;
  };

  const onPressIn = (e: GestureResponderEvent) => {
    pressSide.current = sideOf(e.nativeEvent.locationX, width.current);
  };

  const onTap = () => {
    // P4: the first touch after a muted start only turns the sound on, without restarting.
    if (soundPill) {
      setMuted(player, false);
      setSoundPill(false);
      return;
    }
    const side = pressSide.current;
    const now = Date.now();
    if (tapKind(lastTap.current, now, side) === 'double') {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
      // A third quick tap on the same side moves again.
      lastTap.current = { at: now, side };
      if (seekBy(side === 'back' ? -SEEK_STEP : SEEK_STEP)) {
        showHint(side, side === 'back' ? COPY.board.back10 : COPY.board.forward10, false);
      }
      return;
    }
    // P5: a single tap pauses or continues, once it is clear no second tap is coming.
    lastTap.current = { at: now, side };
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      lastTap.current = null;
      togglePause();
    }, DOUBLE_TAP_MS);
  };

  // P11: hold a side to keep moving until the finger lifts. P1: a long press never opens a menu.
  const onHoldStart = () => {
    if (soundPill) return;
    const side = pressSide.current;
    const step = side === 'back' ? -HOLD_STEP_SECONDS : HOLD_STEP_SECONDS;
    const label = side === 'back' ? COPY.board.backHold : COPY.board.forwardHold;
    setHolding(true);
    const move = () => {
      if (seekBy(step)) showHint(side, label, true);
    };
    move();
    holdTimer.current = setInterval(move, HOLD_STEP_MS);
  };

  const onPressOut = () => {
    if (!holdTimer.current) return;
    clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    hideHint();
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') togglePause();
    else if (name === 'back') seekBy(-SEEK_STEP);
    else if (name === 'forward') seekBy(SEEK_STEP);
  };

  const pausedByPupil = userPaused && !ended;

  return (
    <View style={[styles.column, { backgroundColor: boardColour }]}>
      <Pressable
        onPressIn={onPressIn}
        onPress={onTap}
        onLongPress={onHoldStart}
        onPressOut={onPressOut}
        delayLongPress={HOLD_DELAY_MS}
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width;
        }}
        accessibilityRole="button"
        accessibilityLabel={pausedByPupil ? COPY.board.tapToContinue : COPY.board.tapToPause}
        accessibilityActions={[
          { name: 'activate' },
          { name: 'back', label: COPY.board.a11yBack },
          { name: 'forward', label: COPY.board.a11yForward },
        ]}
        onAccessibilityAction={onAccessibilityAction}
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
        {hint ? (
          <Animated.View
            style={[styles.hint, hint.side === 'back' ? styles.hintBack : styles.hintForward, { opacity: hintOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.hintText}>{hint.text}</Text>
          </Animated.View>
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
  hint: { position: 'absolute', top: 0, bottom: 0, width: '50%', alignItems: 'center', justifyContent: 'center' },
  hintBack: { left: 0 },
  hintForward: { right: 0 },
  hintText: { fontFamily: fonts.hand, fontSize: 24, lineHeight: 30, color: board.boardMuted },
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
