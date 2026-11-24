# ATLAS Lesson Framework v1

Source: the "ATLAS Lesson Framework v1" Claude Doc (19 November 2026), transcribed as Markdown on 22 November 2026.
In the repo this file is saved as `specs/framework.md`. If the Claude Doc changes, re-export it and replace this file.

ATLAS acts as one companion for each learner. It plays the part of teacher, parent and study friend. It knows the child, teaches each concept in the way that fits them, checks understanding at every step, and calls in a human when the app alone is not enough. This is version 1, a fresh start. Earlier ATLAS lesson concepts, including the teacher avatar, are retired.

## Purpose and goals

Every design choice below serves these goals.

| # | Goal | How the framework delivers it |
| --- | --- | --- |
| 1 | Understand how each learner thinks | Layered profile: onboarding, overview responses, segment checks, sure or not sure taps, exam results |
| 2 | Identify gaps in understanding | AI check after every segment; confidence signal separates guessing from misconceptions |
| 3 | Adapt teaching to individual needs | Each segment has 2 to 5 video versions; the app routes each pupil to the best fit |
| 4 | Develop reasoning, problem solving and independent thinking | Pupils explain in their own words; conflict and repair for misconceptions; a reasoning check decides each segment |
| 5 | Build understanding, confidence and long-term retention | No scores during onboarding; kind messages on retries; spaced re-check after mastery |
| 6 | Move learners from not knowing to mastery | Segment by segment progress, a timed topic exam, and a mastery threshold |
| 7 | Application | Creative and innovative learners in society (wording to confirm) |

## Learner journey at a glance

1. Onboarding and profiling (once)
2. Choosing what to learn (each time)
3. Topic overview (once per topic)
4. Segment loop: video, answer, "Why do you think so?", AI check (repeats for every concept)
5. Retry ceiling and flagging (after 3 failed tries)
6. Timed topic exam (closes the topic)
7. Results, revision and retakes
8. Mastery and what unlocks

Onboarding runs once. Topic choice and the overview run once per topic. The segment loop repeats for every concept, and the exam closes the topic.

## Stage 1: Onboarding and profiling

Onboarding learns who the child is, not what they know. Nothing in it is marked right or wrong, and it should feel like play.

1. **Welcome.** One question: "What should I call you?" Name only. No forms, no account wall, no test.
2. **Class level.** The pupil picks their class.
3. **Interests.** A playful pick of things they enjoy, such as football, music, farming or stories.
4. **Playful choices.** A few short "would you rather" choices and story scenarios. The app watches behaviour: quick or careful, curious or cautious, drawn to people, animals, money or sport.

**What this stage is for.** It feeds the examples the app uses later, so lessons speak to each child's world. It does not estimate ability. The first read on knowledge comes from the topic overview in Stage 3.

**Profiling never stops here.** The profile is a living record. It updates after every session from three sources:
- Onboarding: interests, behaviour in the playful choices.
- Lesson responses: answers, time taken, changed answers, and keywords from free responses.
- The sure or not sure tap: one tap after key answers. Sure and wrong signals a misconception. Not sure and right signals fragile knowledge.

**Safeguard.** Some pupils tap "sure" out of pride or "not sure" out of shyness. The app learns each child's baseline over a few sessions before trusting the confidence signal.

## Stage 2: Choosing what to learn

The app leads, and the pupil can always overrule it.

| Section | What the pupil sees | Source |
| --- | --- | --- |
| Main (free choice) | Any subject, then any topic | The full lesson library |
| Recommended | A short guided list of topics | The pupil's school or teacher (what class is covering now), and the app (prerequisites the pupil is missing, segments due for re-teaching) |

**When the two clash.** If a pupil picks a class topic but lacks a prerequisite, the app says "I'd suggest this first, here's why." The pupil can tap "Take me to the class topic anyway." The app never blocks.

**Safeguard.** If the pupil skips the prerequisite and then struggles, the app offers the missing piece mid-lesson as a quick side step. It never says or implies "I told you so."

## Stage 3: Topic overview

Every topic opens with one short video, under three minutes, that previews all the concepts the topic will cover. Example: Basic 7 Science, Diversity of Matter, Materials.

After the video, the pupil tells the app what they saw and took from it. **This response is not graded.** It is a listening exercise. The app harvests:
- keywords and terms the pupil uses;
- examples they bring up from their own life;
- signs of interest, and parts they found confusing.

This replaces a separate pre-test. Long question sets at the start of a topic were rejected because they cut engagement.

**Prompts stay specific and low pressure,** so vague answers like "I understood everything" are less likely. Examples: "Tell a friend what this video was about in one sentence." "Which part felt confusing?"

## Stage 4: Segmented lessons

Each topic is broken into segments, one concept per segment. Every segment follows the same loop: video, response, AI check, then move on or re-route.

**Example, Materials topic:** 1A = definition of a material, 1B = properties of materials, and so on to the end of the topic.

### Video versions per segment

- Each segment has a small bank of video versions. Start with 2, grow to a maximum of 5. Production cost sets the cap.
- Versions differ in pitch: examples (farming, football, market), reading level, and pace.
- Naming: lesson 1A, version a = 1Aa; version b = 1Ab.

### Routing: which version a pupil gets

The app chooses using these inputs, never one alone:
1. the pupil's overview response (keywords, examples, confusions);
2. the profile (interests, reading level, past performance);
3. on a retry, the reason behind the pupil's last wrong answer, which shows where their thinking went off.

### Response formats

| Format | Status | Notes |
| --- | --- | --- |
| Typing | Default | Text box always shown first |
| Photo of handwriting | Optional button | Lighting, messy pages and maths notation cause read errors, so the pupil confirms what the app read |
| Voice | Optional microphone button | Weakest today for local accents; treat as a bonus (not in V1) |
| Tap from options | Always used for the sure or not sure tap | Fastest for younger pupils on basic phones |

### The AI check

- The AI compares the pupil's response with the reference meaning of the concept. It judges meaning, not wording.
- It shows its reading back: "Here's what I understood from you. Is that right?" It never silently misjudges a child.
- Every answer, right or wrong, is followed by "Why do you think so?" The reasoning has the final say (see below).
- Not correct: show a **different** video version, chosen to fix the faulty reason the pupil gave, never the same one again.
- Misconception (sure and wrong): use conflict and repair. Surface the pupil's reasoning, show a case where their idea fails, guide them to the correct idea with a hint, and revisit with a fresh question a few days later.

### The reasoning check

The pupil explains every answer, right or wrong. On a correct answer, the reason decides whether the segment is complete. On a wrong answer, the reason picks the next video.

- Prompt: "Why did you choose that?" The pupil types, speaks, sends a photo, or picks from three short reasons (best for younger pupils). (V1: no voice.)
- The AI compares the reason with the segment's reference reasoning, written by the lesson author. Meaning counts, not wording.
- Sound reasoning: segment complete, move to the next segment.
- Wrong answer or wrong reasoning: one of the three tries is used. The reason given picks the video version that targets that mistake, for example a version built on the misconception it shows.
- A right answer with a wrong reason is logged as a lucky guess or hidden misconception and feeds the profile.
- Verdicts the AI is unsure of go to the admin for review, as with theory marking.

## Stage 5: Retry ceiling and flagging

A pupil gets three tries per segment. A wrong answer and wrong reasoning each use one try. After the third unsuccessful try, the app moves on. More videos at that point frustrate rather than teach.

**What happens to the unfinished segment:**
1. It goes into the pupil's Recommended section, to be re-taught on a different day.
2. A flag goes to the ATLAS admin. The admin holds sole authority over flags.
3. The admin decides the response:
    - Content fix: if many pupils stall on the same segment, add video versions or update the lesson.
    - Human help: suggest a one-on-one session to the parent or the pupil's own teacher.
4. When the segment returns, the app re-tests it. The flag clears only when the pupil actually gets it.

**Tone.** The pupil sees a kind message such as "We'll come back to this one. You're not behind." Moving on must never feel like failing.

**Scale note.** One admin cannot review every flag past a few hundred pupils. Flag triage rules will be needed before wider rollout.

## Stage 6: Timed topic exam

The exam unlocks once the pupil has worked through every segment of the topic. It runs like a real exam, with the app as the invigilator.

- **Sections:** objective questions, then theory questions.
- **Timer:** set per topic, for example 15 or 20 minutes. The pupil taps "Start exam" to begin.
- **End:** a stop-work sound plays when time runs out, and the paper is submitted.
- **No mid-paper feedback.** Results appear only after the whole paper is submitted.

### AI marking of theory answers

The marking scheme lists suggested acceptable answers, as in BECE marking. It is a guide, not a rigid key. The AI judges whether the pupil's answer carries the same meaning as a scheme point, in any wording.

**Guards:**
1. The scheme stays the anchor, so the same answer earns the same mark every time.
2. Borderline answers are flagged for teacher or admin review instead of guessed.
3. Before launch, a teacher marks real pupil answers. The AI's marks are compared against the teacher's. AI marking goes live only if agreement is high. (V1 uses a 100-response sample; see the PRD, section 8.4.)

## Stage 7: Results, revision and retakes

After submission the app shows the score, then walks through every question where marks were lost.
- Each lost mark shows what was credited, what was missing, and the suggested answer.
- Each links back to its segment (for example 1B, properties) for a quick re-watch.
- Results feed the profile, so the Recommended section knows what to revise.

**The pupil chooses the next step:** revise the weak segments, or retake straight away. Both are allowed.

**Retakes draw fresh questions** on the same segments from a larger question bank. The pupil has just seen the model answers, so the same paper would test memory, not understanding.

The app compares attempts. If a retake without revision does not improve, it gently suggests the weak segments.

## Stage 8: Mastery and what unlocks

Each segment is mastered on sound reasoning, not a correct answer alone (Stage 4). Topic mastery then follows the rule below.

**Mastery rule (draft):**
1. The pupil scores at least 80% on a full topic exam. The final threshold is set with teachers, not guessed.
2. No segment in the topic remains at three failed tries.
3. A spaced re-check confirms it. A few days later, the app slips in 2 or 3 questions on the topic. Pass, and mastery is confirmed. Miss, and the topic quietly returns to revision.

**What unlocks:**
- A short celebration for the pupil.
- A progress view the parent and teacher can see. (V1: teacher only.)
- The next topic becomes the top recommendation. Nothing is locked as punishment; the pupil can still go anywhere.

## Data the app records

| Moment | Recorded | Used for |
| --- | --- | --- |
| Onboarding | Name, class, interests, playful-choice behaviour | Examples used in lessons |
| Topic overview | Keywords, examples, confusions | First video version routing |
| Each segment | Answer, AI verdict, time taken, changed answers, confidence tap, reasoning verdict, tries used, version watched | Routing, gap finding, flags |
| Exam | Score per question, borderline marks, retake history | Revision suggestions, mastery |
| Spaced re-check | Pass or miss | Confirming mastery, retention |

## Parked for later versions

- Tutor matching marketplace, where teachers sign up to teach pupils. Needs adult verification, in-app sessions only, and parent consent.
- Graded levels of reasoning depth, beyond sound or not sound.
- Badges or rewards.

## Open decisions

- [ ] Final mastery threshold, set with teachers.
- [ ] Exam length and question count per topic.
- [x] Account at first launch: decided for V1. Teacher-issued pupil code and PIN, no child email or phone.
- [x] First subject and class: decided for V1. Basic 7 Integrated Science, Materials (confirm by 23 Nov).
- [ ] Flag triage rules once pupil numbers outgrow one admin.
- [ ] Consent and data protection for recording children's responses and voice (V1 records no voice).
