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

## B5 overview

Runbook S17. Proves the B5 gate: the overview works offline after download, the profile updates when the network returns, and `ai_calls` logs every call with no names.

Before you start: Bright has set `ANTHROPIC_API_KEY` in the atlas-dev Supabase secrets, and the Materials topic is downloaded on Phone A (B5 board checks).

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
