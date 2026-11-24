# ATLAS: Product Requirements Document (V1)

Version: 22 November 2026. Owner: Bright Oppong.
This PRD replaces the August 2026 PRD (KG to Nursing scope, FSRS, seven-phase lessons, Paystack). None of that scope applies to V1.
In the repo this file is saved as `specs/prd.md`.

## 1. Summary

ATLAS is one learning companion for each pupil. It plays the part of teacher, parent and study friend. It knows the child, teaches each concept in the way that fits them, checks understanding at every step, and calls in a human when the app alone is not enough.

V1 proves this on one topic, with the Detieso pilot class first and then any pupil who signs up. Basic 7 pupils complete Integrated Science, Diversity of Matter: Materials, from onboarding to a timed exam. V1.0 is released to the pilot class and to the public on **15 December 2026**, and stays in use for one to two months until the next update.

## 2. The problem

Many pupils can repeat a correct answer without understanding why it is correct. Most apps reward that: they check the answer, give points and move on. The gap shows later, in exams and in real use.

ATLAS checks the reason behind every answer. A right answer with a wrong reason is treated as not yet understood. A wrong reason picks the next lesson video, so the pupil is taught at the exact point where their thinking went off.

## 3. Goals

Every design choice serves these goals.

| # | Goal | How V1 delivers it |
| --- | --- | --- |
| 1 | Understand how each learner thinks | Layered profile: onboarding, overview responses, segment checks, sure or not sure taps, exam results |
| 2 | Identify gaps in understanding | AI check after every segment; the confidence tap separates guessing from misconceptions |
| 3 | Adapt teaching to individual needs | 2 video versions per segment in V1; a fixed rule routes each pupil to the best fit |
| 4 | Develop reasoning, problem solving and independent thinking | Pupils explain every answer in their own words; the reasoning check decides each segment |
| 5 | Build understanding, confidence and long-term retention | No scores in onboarding; kind messages on retries; a spaced re-check after mastery |
| 6 | Move learners from not knowing to mastery | Segment by segment progress, a timed topic exam, an 80% mastery threshold |
| 7 | Application: creative and innovative learners in society | Examples drawn from the pupil's own world; not measured in V1 (wording to confirm with Bright) |

## 4. What V1 is and is not

V1 is the main ATLAS product for this topic, not only a pilot: one topic, the Detieso pilot class first on Android phones supplied by ATLAS, then any pupil who signs up, and a web dashboard for the admin and class teachers. Admins manage pupils. Each pupil states their school, and an admin may link it to a school record.

It is shared as an APK from a public link. A new personal Google Play account must run a closed test with at least 12 testers opted in for 14 days in a row before it can apply for production access, so the public Play Store listing comes after 15 December.

Public self sign-up is built in V1 but stays switched off until the admin turns it on, after the data protection consultant confirms that registration and in-app guardian consent cover public use. Until then only the pilot class and admin-created pupils can use V1.

### Scope

| Area | In V1 (15 Dec) | Later |
| --- | --- | --- |
| Subject and topic | Basic 7 Integrated Science, Diversity of Matter: Materials. Overview plus segments 1A to 1E | Mathematics from January, then more topics |
| Platform | Android app installed from a public APK link; pilot phones supplied by ATLAS; web dashboard for admin and teacher | iOS, public Play Store listing, pupil web app |
| Accounts | Self sign-up (behind the admin switch) or admin-issued pupil code, plus 4-digit PIN. The pupil states their school. No child email or phone number | Phone OTP |
| Language | English only | No other language is planned |
| Onboarding | Name, class, interests, 3 playful choices | |
| Lesson flow | Overview video, segment loop, "Why do you think so?" after every answer, 3 tries, flags to admin | |
| Answer input | Typing (default), tap options, sure or not sure tap, photo of handwriting (first to cut) | Voice |
| Videos | 2 board-style versions per segment, plus a worked-example card | 3 to 5 versions per segment |
| Assessment | Timed topic exam, objective and theory, results after submission, retake with Paper B | |
| Mastery | 80% on the exam, no segment left at 3 failed tries, re-check 3 days later | Graded reasoning depth |
| Adults | Admin dashboard (flags, borderline marks, pupils); read-only teacher progress view | Parent view, tutor marketplace |

## 5. Users

| User | Who in V1 | What they need |
| --- | --- | --- |
| Pupil | Basic 7 pupils at Detieso, and any pupil who signs up, about 11 to 14 years old, with parent or guardian consent | To learn the topic at their own pace without being judged, on a shared low-end phone |
| Admin | Bright | To see and act on flags, approve borderline marks, create classes, schools and pupil codes, record consent, see, suspend, reset or delete any pupil, and switch public sign-up on or off |
| Class teacher | The Basic 7 science teacher at Detieso, and teachers of other classes later | A read-only view of their own class's progress |
| Parent or guardian | Parents of pilot pupils and of pupils who sign up | A plain explanation of what ATLAS collects and that AI checks answers; a consent form or in-app consent step they understand |

## 6. Learner journey

The journey has eight stages. Onboarding runs once. Topic choice and the overview run once per topic. The segment loop repeats for every concept, and the exam closes the topic. Full detail is in `specs/framework.md`.

### 6.1 Sign-in and notices

- FR-1. The admin creates a class and its pupils on the web dashboard, or, when public sign-up is on, a pupil signs up in the app with a first name or nickname, their school in their own words and their class level. Each pupil gets a 6-character code with no ambiguous characters (no 0, O, 1 or I). A pupil may join a class with the class's join code. The admin is alerted to each new sign-up and can suspend, reset or delete any pupil.
- FR-2. A pupil signs in with code and PIN. The PIN is set on first sign-in and stored only as a hash. Five wrong PINs lock the code for 15 minutes.
- FR-3. After first sign-in the pupil sees the AI notice once (under 80 words, plain English). The app records when it was seen.
- FR-4. A pupil cannot start lessons until consent is recorded: by the admin from a signed paper form, or by a parent or guardian in the app's consent step after reading the privacy notice. Until then they see a polite waiting screen. Every consent records its method, date and any withdrawal.

### 6.2 Stage 1: Onboarding

- FR-5. Four screens, one question each: "What should I call you?", class level (Basic 7 preselected), interests (tap up to 4 of football, music, farming, stories, cooking, market, animals, phones and computers), and 3 "would you rather" choices.
- FR-6. Nothing is marked right or wrong. The app records each choice and the time taken.
- FR-7. The flow takes under 3 minutes and resumes if the app closes midway.

### 6.3 Stage 2: Choosing what to learn

- FR-8. Home has two sections: "Choose a topic" (any subject, then any topic) and "Recommended for you" (topics the teacher has set, and segments waiting to be re-taught).
- FR-9. If a pupil opens a topic with a missing prerequisite, the app says "I'd suggest this first, here's why" with a button "Take me to the class topic anyway". The app never blocks. V1 has one topic, so this rule is built and unit tested with fake prerequisite data.

### 6.4 Stage 3: Topic overview

- FR-10. Every topic opens with one overview video under 3 minutes that previews all its segments.
- FR-11. After the video the pupil answers "Tell a friend what this video was about, in one or two sentences" and "Which part felt confusing?". Skip is allowed.
- FR-12. The answers go to the ai-overview job, which returns keywords, interests and confusions for the profile. Nothing is shown as a grade. The pupil sees "Thanks. That helps me choose how to teach this."
- FR-13. If the job fails, the text is saved on the phone and sent later. The pupil continues.

### 6.5 Stage 4: Segment loop

- FR-14. The first video version is chosen by the pupil's interests and played from the phone.
- FR-15. The pupil answers the check question for this try. Typing is the default; "Choose an answer" shows 3 tap options. Then the sure or not sure tap.
- FR-16. Every answer, right or wrong, is followed by "Why do you think so?". Typing is the default; 3 tap reason options are available.
- FR-17. The ai-check job returns: answer correct (yes, no, unsure), reasoning sound (yes, no, unsure), misconception codes, a one-sentence read-back, and a safeguarding signal.
- FR-18. The app shows the read-back: "Here's what I understood: ... Is that right?" If the pupil says no, they may edit once and re-check.
- FR-19. Correct answer and sound reasoning: the segment is complete, with a calm "Well reasoned" message.
- FR-20. Otherwise one try is used. Before try 2 and try 3, the routing rule picks the next video (section 8.2). If no unseen version is left, the pupil sees the worked-example card.
- FR-21. A right answer with a wrong reason is logged as a lucky guess or hidden misconception and feeds the profile.
- FR-22. An "unsure" verdict uses the read-back and the tap reason options as a tie-breaker and creates a borderline flag for admin review.
- FR-23. Every attempt records: try number, version shown, answer, input mode, reason, sure or not sure, time taken, changed answer, AI verdicts, misconception codes.

### 6.6 Stage 5: Retry ceiling and flags

- FR-24. A pupil gets 3 tries per segment. After the third failed try the pupil sees "We'll come back to this one. You're not behind." and moves to the next segment.
- FR-25. The unfinished segment goes to Recommended and a stalled flag goes to the admin. The admin decides: content fix needed, or human help suggested, with a note.
- FR-26. When the segment returns, the app re-tests it. The flag clears only when the pupil actually gets it.

### 6.7 Stage 6: Timed topic exam

- FR-27. The exam unlocks when every segment is complete or moved on. The pupil sees the rules, the duration and a "Start exam" button.
- FR-28. An objective section, then a theory section. Pupils can move between questions within a section. No feedback of any kind until submission.
- FR-29. The timer is always visible but calm. It counts from a stored start time, so closing the app does not reset it. At zero a stop-work sound plays and the paper submits itself.
- FR-30. Objective items are scored on the server when the paper is submitted, so the answer key never reaches the phone before submission (D-28). Each theory answer goes to the ai-mark-theory job, which marks against the scheme points. Borderline marks show "Being checked by a teacher" until an admin approves.

### 6.8 Stage 7: Results and retakes

- FR-31. Results show the total, then every question where marks were lost: what was credited, what was missing, the suggested answer, and a link back to the segment video.
- FR-32. Two buttons: "Revise weak segments" and "Retake now". A retake uses Paper B, so the pupil is not tested on answers they have just seen.

### 6.9 Stage 8: Mastery

- FR-33. Mastery needs an exam score of at least 80% and no segment left at 3 failed tries.
- FR-34. On mastery the pupil sees a short, calm celebration, and the re-check is set for 3 days later.
- FR-35. When the re-check is due, the app serves 3 re-check questions before anything else, with an option to do it later that day. Pass confirms mastery. Miss sends the topic back to revision quietly, and the segments answered wrongly go to Recommended.

## 7. Content

Content is the real deadline. All videos and questions are final by **5 December 2026** (content freeze).

### 7.1 Segments (Bright confirms against the NaCCA Basic 7 curriculum on 23 November)

| Code | Segment | Note |
| --- | --- | --- |
| OV | Overview: materials around us | One video, under 3 minutes |
| 1A | What a material is | |
| 1B | Properties of materials | |
| 1C | Natural and man-made materials | |
| 1D | Choosing a material for a use | |
| 1E | Caring for and reusing materials | First to cut if content slips |

### 7.2 Content pack per segment

1. Learning objective: one sentence, from the curriculum.
2. Reference meaning: what a correct answer must contain, in plain words.
3. Misconception list: the wrong ideas pupils really hold, each with a code, for example `1B-M1: heavy things are always strong`. Bright and the reviewer write these from classroom experience.
4. Video version a: home and farm examples, simpler language.
5. Video version b: market and sport examples.
6. Version tags: the misconception codes each version tackles head-on.
7. Three check questions, one per try, each worded differently. Each has the question, accepted answers, 3 tap options, 3 reason options (1 sound, 2 tied to misconception codes) and the reference reasoning in 1 or 2 sentences.
8. Worked-example card for try 3: under 120 words plus one photo.

Topic-level items: exam Paper A and Paper B, each with 10 objective and 3 theory questions; a marking scheme of acceptable points for every theory question; 3 re-check questions.

Totals for V1: 11 videos, 15 check questions, 5 worked-example cards, 20 objective and 6 theory exam questions, 3 re-check questions.

### 7.3 Video format

Videos use the board style defined in `specs/video-board.md`: handwriting appearing on a paper-coloured board, a Ghanaian English voice-over, pen sound, and burned-in English captions.
- Script rules: under 3 minutes (about 350 spoken words), one concept per video, Ghanaian names, places and objects, real objects shown wherever possible. A video teaches the idea but never answers the exact check question.
- Export: MP4, H.264 video, AAC audio, two files per video at 480p and 360p (about 500 kbps, so a 3-minute video is roughly 11 MB).
- File names: `mat-<segment>-<version>-<resolution>.mp4`, for example `mat-1B-a-360.mp4`.
- No copyrighted music, images or clips. No children's faces.

## 8. The AI layer

### 8.1 Four narrow jobs

Claude does four jobs in V1. Pupils never chat with it.

| Job | When | Model | Returns | Guard |
| --- | --- | --- | --- | --- |
| Overview listening | After the overview video | `claude-haiku-5-5` | Keywords, interests, confusions, segments mentioned | Never shown as a grade |
| Answer and reason check | Every segment answer | `claude-sonnet-5-5` | Answer correct, reasoning sound, misconception codes, read-back, safeguarding | "Unsure" triggers the read-back and tap reasons, and a borderline flag |
| Theory marking | Exam submission | `claude-sonnet-5-5` | Marks per scheme point, borderline, credited, missing | Borderline answers wait for admin approval |
| Handwriting reading | Photo input, only if B12 ships | `claude-sonnet-5-5` | The text it read | The pupil confirms or edits the text before any check |

The system prompts are in `specs/ai-prompts.md`. They are first drafts; the quality gate decides the final wording.

### 8.2 How the next video is chosen (a rule, not AI)

1. Collect the misconception codes from the pupil's wrong answer and wrong reason.
2. From the versions this pupil has not seen, pick the one whose tags match the most codes.
3. On a tie, pick the version whose examples match the pupil's interests.
4. If no unseen version is left, show the worked-example card.

### 8.3 Reliability

- Every AI output is parsed against a fixed shape. Bad output is retried once; a second failure falls back to tap options.
- Each call has a 20-second limit. A timeout falls back to tap options.
- At most 120 AI calls per pupil per day. A monthly spend limit is set in the Anthropic Console.
- Every call is logged: job, model, pupil ID, input, output, success, time taken.

### 8.4 Quality gate (3 to 7 December)

1. Collect 100 realistic answers with reasons: 60 written by Bright and the reviewer imitating real pupils, 40 from 5 volunteer Basic 7 pupils with consent on 4 to 5 December.
2. The reviewer marks all 100 by hand without seeing the AI's verdict.
3. Run the same 100 through the answer and reason check.
4. Pass: at least 85% agreement on answer verdicts and 80% on reasoning verdicts. These are our own working targets, not an external standard.
5. An item that still fails on 7 December becomes tap-only for the pilot.

## 9. Admin and teacher dashboard

Web, built with Expo web export in the same codebase.

The admin can:
1. See flags by kind (stalled, borderline, safeguarding), newest first. Safeguarding flags are pinned at the top in their own section.
2. Mark a stalled flag "content fix needed" or "human help suggested" and add a note.
3. See a borderline mark with the question, scheme, pupil answer and AI notes, then approve or change it.
4. See a pupil progress table: segments complete, moved on, tries, exam score, mastery.
5. See stall counts per segment.
6. Create classes and pupils, print pupil code sheets, and record consent dates.

The class teacher sees the progress table for their own class only, read-only.

## 10. Privacy, consent and safeguarding

Anthropic requires organisations whose products let minors use its API to add their own safeguards, state their child safety and privacy compliance publicly, and tell users they are dealing with an AI. Ghana's Data Protection Act requires a data controller to register with the Data Protection Commission before processing personal data. V1 meets these as follows.

- No open chat. Pupil text goes only to the four jobs, each with a fixed prompt and a fixed output shape.
- No names go to the API: only a pupil ID, the question and the pupil's words.
- Pupils have no email or phone number in ATLAS. They sign in with a code and PIN.
- An AI notice screen for pupils, and a plain-language AI and privacy notice for parents, also published on a public ATLAS page.
- A signed parent consent form for every pilot pupil, explained in person. For pupils who sign up, a parent or guardian consent step in the app with the same content. Both state what ATLAS collects, that AI checks answers, who sees the data, how long it is kept, and how to withdraw.
- Data Protection Commission registration submitted by 1 December. The consultant confirms whether the pilot can run while registration is pending. If not, the pilot waits. Public sign-up stays off until the consultant confirms that registration and in-app consent cover public use.
- A global daily cap on AI calls across all pupils, set by the admin, on top of the 120 calls per pupil per day, and a limit on sign-ups per phone per day.
- Safeguarding: if a pupil's text suggests danger, harm or serious distress, the pupil sees "Thank you for sharing. A teacher may check in with you.", no verdict is shown for that answer, and the admin is alerted by email the same day. Bright names who acts on alerts before the pilot.
- Handwriting photos are deleted from the phone and the server once the text is confirmed.
- AI logs and pupil data are kept only as long as the privacy notice says.

## 11. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Devices | Works on low-end Android phones (Android 9 or 10, 2 GB RAM). Tested on 2 such phones throughout |
| Speed | Cold start, screen change and video start each under 4 seconds on the slowest test phone |
| Offline | Once a topic's videos are downloaded, the whole topic runs with only the AI checks needing network. Answers made offline are queued and never lost |
| Data use | "Download this topic" shows the total size first. Data used per topic is measured and written down |
| Errors | Every technical error becomes a calm plain message with a retry button. No raw errors |
| Security | Row Level Security on every table. API keys only in server secrets |
| Accessibility | Visible focus on every control; respects reduced motion; body text 16px |
| Look and voice | The "paper and ink" system in `BRAND-HANDOFF.md`. Calm second-person copy, no exclamation marks, no streaks, XP, badges or leaderboards |
| Language | English only |

## 12. Definition of done on 15 December

- [ ] Pilot pupils at Detieso complete the Materials topic on the pilot phones, onboarding to exam.
- [ ] Every segment has 2 videos, 3 check questions with reason keys, and a worked-example card.
- [ ] AI answer checks agree with the content reviewer on at least 85% of the 100-response sample.
- [ ] A full run completes without a crash on the cheapest test phone.
- [ ] Data protection registration is submitted and every pilot pupil has a signed parent consent form.
- [ ] Pupils and parents are told, in plain words, that ATLAS uses AI.
- [ ] The admin dashboard shows flags, borderline marks and each pupil's progress.

### Success measures from the pilot

- Share of pilot pupils who finish the topic, onboarding to exam.
- Share of segments completed within 3 tries, and stall counts per segment.
- Share of wrong-reason retries that end in sound reasoning after the second video.
- Exam scores on Paper A and on the re-check 3 days later.
- AI agreement with the reviewer during the pilot (borderline flags approved unchanged).
- Pupil and teacher answers to the feedback questions on 11 December.

## 13. Out of scope for V1

Play Store public listing, iOS, Mathematics and every other topic, voice input, parent view, tutor marketplace, badges or rewards, graded reasoning depth, payments, any language other than English, open AI chat, the teacher avatar, and every KG to SHS and nursing feature from the August 2026 PRD.

## 14. Open decisions

| Decision | Owner | Due |
| --- | --- | --- |
| Confirm Materials (Basic 7 Science) for V1, or override to Mathematics | Bright | 23 Nov |
| Confirm the segment list against the NaCCA curriculum | Bright | 23 Nov |
| Budget ceiling for contractors, phones, router and data | Bright | 23 Nov |
| Who acts on safeguarding alerts during the pilot, and within what time | Bright | 23 Nov |
| Pilot class size and how many phones to buy | Bright | 23 Nov |
| How long pupil data and AI logs are kept after the pilot | Consultant drafts, Bright decides | 26 Nov |
| Exam length and question count (draft: 10 objective, 3 theory) | Bright with the reviewer | 25 Nov |
| Final mastery threshold (draft: 80%), set with teachers | Bright | Before the pilot |
| Flag triage rules once pupil numbers outgrow one admin | Bright | After V1 |

## 15. Related documents

| Document | Holds |
| --- | --- |
| `CLAUDE.md` | Rules for Claude Code and the shift protocol |
| `specs/framework.md` (project: `ATLAS_LESSON_FRAMEWORK.md`) | The lesson design in full |
| `specs/video-board.md` | The board-style lesson video and player |
| `ATLAS_V1_BUILD_PLAN.md` | Team, shifts, timeline, gates, risks |
| ATLAS V1 Build Guide (Claude Doc), Claude Code pack tab | Step specs B0 to B12, data model, AI prompts |
| ATLAS V1 Build Guide (Claude Doc), Claude Code runbook tab | Sessions S00 to S41, typed one by one in Claude Code |
| ATLAS V1 Shift Workflow (Claude Doc) | Shift routine, role cards, ops file templates |
| `BRAND-HANDOFF.md` | Visual identity |
