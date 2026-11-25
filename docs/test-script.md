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
