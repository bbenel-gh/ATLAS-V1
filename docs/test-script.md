# Test script

## B2 accounts

Runbook S13. Proves the B2 gate: 3 test pupils sign in across 2 phones, the PIN lock works, and the consent gate works.
Use only the fake test pupils in atlas-dev. Never use a real pupil's code here.

### Before you start

1. Someone at the computer runs `npm run seed:dev`. This gives every test pupil a fresh start: no PIN, no lock.
2. Both phones have the dev build of ATLAS (or Expo Go) and a data connection.
3. The test pupils:

| Pupil | Code | Consent | Lands on after sign-in |
| --- | --- | --- | --- |
| TEST-P1 | TESTPA | yes | Home |
| TEST-P2 | TESTPB | yes | Home |
| TEST-P3 | TESTPC | none, on purpose | AI notice, then the waiting screen |

Each pupil chooses a PIN the first time. Write the PINs you choose on paper for this test only, then throw it away.

To "sign out" a pupil: close the app fully (swipe it away from recent apps), open it again, and the PIN screen shows. Tap "Not you?". You are back on the code screen.

Write each result (PASS or FAIL, and what you saw) in the shift log.

### a. Two pupils on two phones

1. Phone A: type code TESTPA. Choose a PIN, type it again. Tap "I understand" if the AI notice shows. Expected: Home.
2. Phone B: type code TESTPB. Choose a PIN, type it again. Expected: Home.

### b. Shared phone and the consent gate

1. Phone B: sign TEST-P2 out ("Not you?", see above).
2. Phone B: type code TESTPC. Choose a PIN. Tap "I understand" on the AI notice.
3. Expected: "You are all set. Your teacher will let you start soon." with "Check again". No way to reach Home or a lesson.

### c. One pupil on two phones

1. Phone A: sign TEST-P1 out.
2. Phone A: type code TESTPB and TEST-P2's PIN. Expected: Home. TEST-P2 is now signed in on Phone A, and it was signed in on Phone B earlier. Both work.

### d. Lock follows the code, not the phone

1. Phone B: sign TEST-P3 out. Type code TESTPA and a wrong PIN, 5 times.
2. Expected on the 5th try: "Too many tries. Please wait 15 minutes, or ask your teacher."
3. Phone A: sign out, type code TESTPA and TEST-P1's right PIN. Expected: refused with the lock message (the minutes may now be 14 or fewer). The lock covers every phone.
4. After 15 minutes, on either phone: TESTPA with the right PIN. Expected: Home.

### e. Code sheet

1. At the computer: `npm run pupils:create -- --class "Test Basic 7A" --names names.csv`, where names.csv holds fake first names, one per line.
2. Open the sheet it names (in `content-work/pilot/`) in a browser and print one page on A4 at 100%.
3. Expected: 12 cards per page with dashed cut lines, each with the class, first name, code and "Keep this code. Do not share your PIN.". No 0, O, 1 or I in any code.
4. Delete the printout and the sheet file when done. Run `npm run seed:dev` to remove the pupils again.

## B3 onboarding

Runbook S14. Proves the B3 gate: onboarding takes under 3 minutes, resumes after the app closes, and saves every answer.
Use TEST-P3 (code TESTPC): it is the test pupil with no profile.

### Before you start

1. At the computer: `npm run seed:dev`, then `npm run consent:set -- --code TEST-P3 --on`.
2. Phone A: sign in with TESTPC, choose a PIN, tap "I understand" on the AI notice. Onboarding opens.

### a. Under 3 minutes

1. Start a stopwatch when "What should I call you?" shows.
2. Go through every screen at a normal reading pace: name, class (Basic 7 is already picked), up to 4 interests, the three "would you rather" cards, then "Go to my lessons".
3. Expected: Home opens. Stopwatch under 3:00. Write the time in the shift log.
4. Expected on every screen: 4 small dots at the top, no numbers on screen, no score, no timer, nothing marked right or wrong, nothing red.

### b. Resume

1. Run the "Before you start" steps again (the reseed clears TEST-P3).
2. Answer the name and class screens. On the interests screen, close the app fully (swipe it away).
3. Open the app and type the PIN.
4. Expected: the interests screen, with the third dot current. Your name and class are kept (the end screen will say "Thank you, <your name>.").

### c. Saved

1. After a full onboarding, in the Supabase dashboard (atlas-dev), table `profiles`, row for TEST-P3.
2. Expected: `interests` lists your picks; `playful_choices` has radio, farm and song, each with `choice` and `ms`; `onboarding` has `name_ms`, `class_ms` and `interests_ms`; `onboarded_at` is set. Table `pupils`: your name and class level.

### d. Offline

1. Run the "Before you start" steps again. On the name screen, turn on airplane mode.
2. Finish onboarding offline. Expected: every screen works and "Go to my lessons" opens Home.
3. Turn airplane mode off and wait 15 seconds (or close and reopen the app).
4. Expected: the answers are in `profiles` as in step c.

## B5 board video

Runbook S16. Proves the `specs/video-board.md` Done when list: no edge around the board, no player controls, pauses in the background and off screen, captions within half a second, and full playback offline after download.
Do every step on **both phones** (Phone A and Phone B). Write each line as PASS or FAIL, with the phone, in the shift log.

### Before you start

1. Phone signed in as TESTPA (TEST-P1), on Wi-Fi, sound on, volume up.
2. To start from nothing: sign-in screen, "Component gallery (dev only)", section "Board video test (S16)", tap "Remove downloaded videos".

### a. Download, cancel and continue

1. Home, open the Materials topic.
2. Expected: "This topic needs <size> MB of data. Download it now, on Wi-Fi if you can.", a "Video quality" choice with 360p picked, and Download. No percentage anywhere.
3. Tap Download. Expected: "<n> of <total> videos" counting up.
4. After 2 or 3 videos, tap Cancel. Expected: "The download is paused. Your finished videos are kept." and the count stays where it was.
5. Tap "Start lesson" to continue. Expected: the count carries on from where it stopped, not from 0.
6. Let it finish. Expected: "This topic is on your phone. It works without data now.", then the overview board.

### b. No edge, no controls

1. While the overview plays, look closely at all four edges of the board, in good light, with screen brightness up.
2. Expected: no line, frame, shadow or change of colour between the video and the board-coloured area around it. Captions sit under the board on the same colour.
3. Expected: the video started on its own with sound. If the phone started it muted, a "Tap for sound" pill shows. Tap once: sound comes on and the video does not restart.
4. Tap the board. Expected: it pauses, dims slightly, and "tap to continue" shows in handwriting. Tap again: it continues from the same place.
5. Press and hold on the video for 3 seconds. Expected: no menu, no controls, no seek bar, no picture-in-picture or cast button. Nothing appears at any time while it plays.
6. Above the board: "Basic 7 Science · Materials", the title, and the journey label.

### c. Pauses in the background and off screen

1. During playback, press the home button. Wait 5 seconds, then reopen ATLAS (type the PIN if asked).
2. Expected: the video is paused at the same place. It plays again when you tap it.
3. During playback, scroll down until about half the board is off the top of the screen.
4. Expected: it pauses at about the half-way point. Scroll back: it plays again by itself.
5. Tap to pause, then scroll the board off and back. Expected: it stays paused, because you paused it.

### d. Captions within half a second

1. Pick 3 caption lines: one near the start, one in the middle, one near the end of the overview (75 seconds).
2. For each one, start a stopwatch the moment the caption appears and stop it when the voice starts that sentence. Use the lap button if your stopwatch has one.
3. Expected: each gap is under 0.5 seconds. Write the three times in the shift log.
4. Pause and continue once in the middle. Expected: captions stay in step with the voice.

### e. End state

1. Let the overview play to the end.
2. Expected: the last frame stays on the board (it does not go black or jump back to the start), and the next section fades in below and the screen scrolls to it.
3. Tap "Watch again". Expected: the screen scrolls back to the board and the same video restarts from the beginning.

### f. Offline

1. Close ATLAS fully (swipe it away). Turn on airplane mode.
2. Open ATLAS, type the PIN, Home, open the Materials topic.
3. Expected: no download screen. The poster shows first, then the overview plays with sound and captions, and the end state works as in step e.
4. Turn airplane mode off when done.

## B5 overview

Runbook S17. Proves the B5 gate: the overview works offline after download, the profile updates when the network returns, and `ai_calls` logs every call with no names.

Before you start: Bright has set `ANTHROPIC_API_KEY` in the atlas-dev Supabase secrets, and the Materials topic is downloaded on Phone A (see "B5 board video", step a).

### Send

1. Phone A, signed in as TESTPA (TEST-P1). Home, open the Materials topic. Watch the overview to the end.
2. Expected: under the board, "Watch again", "Tell a friend what this video was about, in one or two sentences.", "Which part felt confusing?", Send and Skip. No score, no tick, no colour on anything.
3. Type two sentences in the first box and one in the second. Tap Send.
4. Expected: "Thanks. That helps me choose how to teach this." and "Go to the first part". Nothing that looks like a mark.
5. Supabase dashboard (atlas-dev), within a minute: `profiles`, row for TEST-P1: `overview_keywords` has words you typed. `ai_calls`: one new row, job `overview`, model `claude-haiku-5-5`, `ok` true. Open its `input`: only `segment_titles`, `pupil_summary`, `pupil_confusion`, `response_id`, `try`. No name, no class.

### Offline

1. Go back to Home and open the topic again. Turn on airplane mode. Watch the overview to the end, type, tap Send.
2. Expected: the same thanks message, at once. No error.
3. Turn airplane mode off. Close and reopen the app (or wait on any screen).
4. Expected: within a minute, a new `overview_responses` row with your text and an `ai_result`, and the profile gains the new words.

### Skip

1. Watch the overview to the end and tap Skip.
2. Expected: the thanks message, then you move on. No error. In `overview_responses`, a row with `skipped` true and no AI call for it in `ai_calls`.

### Watch again keeps your words

1. Type something, then tap "Watch again". Let the video end.
2. Expected: what you typed is still there.
