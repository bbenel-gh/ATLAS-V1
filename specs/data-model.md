# Data model

Source: ATLAS V1 Build Guide, Claude Code pack tab, section 3. Exported 24 November 2026 in session S00.

One row per table. Every table has Row Level Security.

Amended 24 November 2026 by Bright (D-24): V1 is public, with self sign-up behind an admin switch. Added `schools`, `consents` and `app_settings`; the teacher of a class is stored only on `classes`; pupils gained school, class level, PIN lockout, sign-up source and status.

Amended 24 November 2026 by Bright (D-27, D-28, S06): added `overview_responses`, `recheck_items` and `exam_item_keys`. The exam answer key and scheme points moved out of `exam_items` into `exam_item_keys`, which no pupil can read. A pupil gets their exam questions through a safe function, and gets the key for their own attempt only after it is submitted. Objective items are scored on the server at submission.

Amended 25 November 2026 by Bright with the team (D-34, S09): `topics` gained prerequisites and content version; `segments` gained the misconception list that ai-check sends to the model.

Amended 25 November 2026 by Bright with the team (D-36, S10): added `signin_rate`. A pupil's auth user is created at first sign-in with an internal email `pupil-<pupil id>@pupils.atlas.invalid` that the pupil never sees; `pin_hash` is bcrypt (cost 10) made inside Postgres.

Amended 26 November 2026 by Bright with the team (D-41, S14, BL-16): `profiles` gained the time spent on each onboarding screen and the date onboarding was finished; onboarding counts as done only when that date is set. A pupil may change their own display name (letters, spaces and hyphens, at most 20) and class level (Basic 7 to 9), and nothing else on their `pupils` row except the AI notice date.

Amended 26 November 2026 by Bright with the team (D-44, S15): added `class_topics`, the topics a class teacher has set, shown under "Recommended for you" on Home.

| Table | Holds |
| --- | --- |
| `schools` | School name, district, region, added by (admin), date added. Managed by admins only |
| `staff` | Admin and teacher accounts, role (admin or teacher). A teacher's classes are found through `classes` |
| `classes` | Class name, school (link to `schools`), teacher, join code |
| `class_topics` | Class, topic, set by (staff), date set. One row per class and topic. A pupil reads their own class's rows; a teacher reads and changes their own classes; an admin all |
| `pupils` | Class (optional), display name, school as the pupil stated it, school (optional link to `schools`, set by an admin), class level, pupil code, hashed PIN, failed PIN count, locked until, signed up by (self or admin), status (active or suspended), AI notice seen date, date created |
| `consents` | Pupil, method (paper or in-app), recorded by (staff, for paper), date given, form reference, withdrawn date |
| `app_settings` | Public sign-up on or off, global daily AI call cap, sign-ups per phone per day. One row, admin only |
| `profiles` | Interests, playful-choice behaviour, overview keywords and confusions, onboarding times per screen (`onboarding` jsonb: name, class and interests ms, updated at), onboarding finished date (`onboarded_at` timestamptz) |
| `topics` | Code (like B7-MATERIALS), title, class level, subject, prerequisites (topic codes), content version (import date and short hash of the content file) |
| `segments` | Topic, code (OV for the overview, then 1A, 1B and on, D-33), title, order, objective, reference meaning, misconceptions (list of code and text) |
| `video_versions` | Segment, label (a or b), 360p and 480p URLs, example world, misconception tags, interest tags, poster URL (`poster_url` text), captions URL (`captions_url` text), board colour (`board_colour` text, hex like #F6F0E6), duration in seconds (`duration_seconds` integer) |
| `check_items` | Segment, try number, question, accepted answers, tap options, reason options, reference reasoning, misconception codes |
| `worked_examples` | Segment, text, image URL |
| `attempts` | Pupil, segment, round (Relearn, starts at 1, D-48), try number, version shown, answer, input mode, reason, sure or not sure, time taken, changed answer, AI verdicts, misconception codes |
| `segment_status` | Pupil, segment, status (in progress, complete, moved on; never goes down, D-48), tries used, current round (Relearn, starts at 1, D-48) |
| `flags` | Pupil, segment, kind (stalled, safeguarding, borderline), status, admin action, notes |
| `exam_papers` | Topic, label (A or B), duration in minutes |
| `exam_items` | Paper, kind (objective or theory), question, options, marks. No answers |
| `exam_item_keys` | Exam item, correct option (objective), scheme points (theory), suggested answer. Admin and service role only |
| `recheck_items` | Topic, segment, order, question, accepted answers, tap options |
| `overview_responses` | Pupil, topic, "tell a friend" text, "confusing" text, skipped, AI result, date |
| `exam_attempts` | Pupil, paper, start and submit times, score, status |
| `exam_answers` | Attempt, item, answer, marks awarded, borderline, AI notes |
| `mastery` | Pupil, topic, status, exam score, re-check due date, re-check result |
| `ai_calls` | Job, model, pupil ID, input, output, success, time taken, date |
| `signin_rate` | Sign-in calls per code per minute: keyed hash of the code (never the code), minute, count. Service role only, no policies (D-36) |
