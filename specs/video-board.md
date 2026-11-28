# Spec: board-style lesson video and player

Version: 22 November 2026. Source: the "ATLAS lesson: seamless board demo" artifact.
Applies to the overview video and every segment video version. Used by runbook sessions S16 (video download and playback), S17 (overview) and S21 to S23 (segment screen).

## 1. What the pupil sees

The lesson video looks like a page being written on, not like a video player. Handwriting appears on a paper-coloured board while a teacher's voice explains it. When the video ends, the last frame stays on the board, like a board that was written on, and the check question appears below it.

## 2. How the video is made (video producer)

1. Board background colour: `#F6F0E6`. Ink colour: `#1C2740`. Keep these identical in every video.
2. After export, sample the background colour from a decoded frame, not from the editing project. Give that value to the build operator. The app background behind the video must match it exactly, or the board edge shows.
3. Handwriting appears stroke by stroke, in time with the narration. One idea per line. Large enough to read on a 5-inch phone.
4. Audio: Ghanaian English voice-over plus a quiet pen sound. No music.
5. Captions: burned into the video in English, and also supplied as a timed cue file (WebVTT, `.vtt`) per version, word for word with the script.
6. Aspect ratio 16:10. Exports at 480p and 360p, MP4, H.264, AAC, about 500 kbps. Under 3 minutes. 720p and 1080p exports are optional (D-46): the pupil may choose them on the download screen, and a version without them uses the best lower quality.
7. Also export one poster image (JPEG) of the first frame per version.
8. Never write the answer to the segment's check questions on the board.

## 3. Player behaviour (build operator)

| # | Behaviour | Detail |
| --- | --- | --- |
| P1 | No player chrome | No frame, border, shadow, progress bar or visible controls. No picture-in-picture, casting, download or speed menu. Long-press menu disabled. Seeking is by gesture only (P11) |
| P2 | Seamless edge | The board area background equals the sampled board colour. A soft 4% fade at each edge hides small colour drift between phones |
| P3 | Plays from the phone | Always play the cached local file. Show the poster image until the first frame is ready |
| P4 | Starts automatically | Try to play with sound. If the phone refuses, play muted, show a small "Tap for sound" pill, and unmute on the first touch without restarting |
| P5 | Tap to pause | A single tap on the board pauses or continues (it waits 280 ms, so a double tap can seek instead). When paused, the board dims slightly and shows "tap to continue" in the handwriting font |
| P6 | Never runs unseen | Pause when less than half of the board is on screen, or when the app goes to the background. Resume only if the pupil did not pause it themselves |
| P7 | Captions under the board | The current cue shows as text under the board, read from the version's `.vtt` file, updated in step with the video frame (not on a separate timer) |
| P8 | End state | The last frame stays. The check question section fades in below and scrolls into view |
| P9 | Watch again | Restarts the same version from the start and scrolls back to the board. It does not use a try |
| P10 | Header | Above the board: breadcrumb (for example "Basic 7 Science · Materials"), segment title, and the journey label |
| P11 | Seek by gesture (D-53) | Double tap the left half: back 10 seconds. Double tap the right half: forward 10 seconds. Each further quick tap on the same side moves again. Press and hold a half for 0.5 seconds: it keeps moving back or forward (2 seconds every 250 ms, video paused) until the finger lifts, then playback carries on unless the pupil had paused. Forward never goes past the furthest point already watched, so a first watch cannot skip ahead. A brief handwritten hint ("back 10 s", "forward 10 s", "going back", "going forward") shows on that side and fades within a second. No bar, no arrows, nothing left on screen. Screen readers get "Back 10 seconds" and "Forward 10 seconds" actions. Going back after the end plays on from there; the question below stays |

Handwriting font for board-related text in the app (paused label, seek hints, "Your turn" heading): Caveat 700, bundled with the app. All other text uses the app fonts in `CLAUDE.md`.

## 4. How this joins the segment loop

The demo ends with a "Your turn" question checked instantly in red or green. **V1 does not do that.** After the video ends, the segment loop in `specs/framework.md` takes over:
1. The check question for this try appears under the board, headed "Your turn".
2. The pupil answers (typing default, tap options available), taps sure or not sure, then answers "Why do you think so?".
3. The answer goes to ai-check, then the read-back. No instant right or wrong, and never red text for a wrong answer.

## 5. Content file fields per video version

`content/materials.json`, inside each video version:
- `label`: `a` or `b`
- `url360`, `url480`: R2 links
- `url720`, `url1080`: optional R2 links (D-46)
- `posterUrl`: R2 link to the poster image
- `captionsUrl`: R2 link to the `.vtt` file
- `boardColour`: the sampled hex value
- `durationSeconds`
- `exampleWorld`: for example `home and farm`
- `misconceptionTags`: list of codes, for example `["1B-M1"]`
- `interestTags`: list, for example `["farming", "cooking"]`

## 6. Done when

- On both test phones, no edge is visible between the board video and the screen around it.
- No player control ever appears, including on long-press.
- The video pauses when the app goes to the background and when the board scrolls off screen.
- Captions match the narration to within half a second.
- With the network off, a downloaded video plays with its poster, captions and end state.
- A double tap on the left goes back 10 seconds and on the right forward 10 seconds, with the caption following at once. A single tap still pauses.
- Holding a side keeps moving back or forward until the finger lifts, and no menu appears.
- On a first watch, forward never passes the furthest point already watched.
