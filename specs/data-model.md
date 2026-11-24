# Data model

Source: ATLAS V1 Build Guide, Claude Code pack tab, section 3. Exported 24 November 2026 in session S00.

One row per table. Every table has Row Level Security.

| Table | Holds |
| --- | --- |
| `staff` | Admin and teacher accounts, role, class |
| `classes` | Class name, school, teacher |
| `pupils` | Class, display name, pupil code, hashed PIN, consent date, AI notice seen date |
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
| `exam_items` | Paper, kind (objective or theory), question, options, answer key, scheme points, marks |
| `exam_attempts` | Pupil, paper, start and submit times, score, status |
| `exam_answers` | Attempt, item, answer, marks awarded, borderline, AI notes |
| `mastery` | Pupil, topic, status, exam score, re-check due date, re-check result |
| `ai_calls` | Job, model, pupil ID, input, output, success, time taken, date |
