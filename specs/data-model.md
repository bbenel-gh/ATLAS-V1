# Data model

Source: ATLAS V1 Build Guide, Claude Code pack tab, section 3. Exported 24 November 2026 in session S00.

One row per table. Every table has Row Level Security.

Amended 24 November 2026 by Bright (D-24): V1 is public, with self sign-up behind an admin switch. Added `schools`, `consents` and `app_settings`; the teacher of a class is stored only on `classes`; pupils gained school, class level, PIN lockout, sign-up source and status.

Amended 24 November 2026 by Bright (D-27, D-28, S06): added `overview_responses`, `recheck_items` and `exam_item_keys`. The exam answer key and scheme points moved out of `exam_items` into `exam_item_keys`, which no pupil can read. A pupil gets their exam questions through a safe function, and gets the key for their own attempt only after it is submitted. Objective items are scored on the server at submission.

| Table | Holds |
| --- | --- |
| `schools` | School name, district, region, added by (admin), date added. Managed by admins only |
| `staff` | Admin and teacher accounts, role (admin or teacher). A teacher's classes are found through `classes` |
| `classes` | Class name, school (link to `schools`), teacher, join code |
| `pupils` | Class (optional), display name, school as the pupil stated it, school (optional link to `schools`, set by an admin), class level, pupil code, hashed PIN, failed PIN count, locked until, signed up by (self or admin), status (active or suspended), AI notice seen date, date created |
| `consents` | Pupil, method (paper or in-app), recorded by (staff, for paper), date given, form reference, withdrawn date |
| `app_settings` | Public sign-up on or off, global daily AI call cap, sign-ups per phone per day. One row, admin only |
| `profiles` | Interests, playful-choice behaviour, overview keywords and confusions |
| `topics` | Title, class level, subject |
| `segments` | Topic, code (1A to 1E), title, order, objective, reference meaning |
| `video_versions` | Segment, label (a or b), 360p and 480p URLs, example world, misconception tags, interest tags, poster URL (`poster_url` text), captions URL (`captions_url` text), board colour (`board_colour` text, hex like #F6F0E6), duration in seconds (`duration_seconds` integer) |
| `check_items` | Segment, try number, question, accepted answers, tap options, reason options, reference reasoning, misconception codes |
| `worked_examples` | Segment, text, image URL |
| `attempts` | Pupil, segment, try number, version shown, answer, input mode, reason, sure or not sure, time taken, changed answer, AI verdicts, misconception codes |
| `segment_status` | Pupil, segment, status (in progress, complete, moved on), tries used |
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
