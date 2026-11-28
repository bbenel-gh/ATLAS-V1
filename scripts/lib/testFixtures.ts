/**
 * The fake test people and rows that scripts/seedDev.ts creates in atlas-dev and
 * scripts/rlsTests.ts checks against. Fake names only, never a real pupil.
 *
 * Every id starts with 7e57 ("test") so test rows are easy to find and remove.
 * Emails use the reserved .invalid domain, so no mail can ever be sent to them.
 * Test pupils sign in with email and password only until the pupil-signin
 * function exists (S10); real pupils never have an email (D-31).
 */

const id = (group: string, n: number) => `7e57${group}-0000-4000-8000-${String(n).padStart(12, '0')}`;

export type TestUserKey = 'admin' | 'teacher7A' | 'teacher7B' | 'p1' | 'p2' | 'p3' | 'p4';

export type TestUser = {
  key: TestUserKey;
  label: string;
  authId: string;
  email: string;
  passwordEnv: string;
};

const user = (key: TestUserKey, label: string, n: number, local: string, passwordEnv: string): TestUser => ({
  key,
  label,
  authId: id('00aa', n),
  email: `${local}@atlas-dev.invalid`,
  passwordEnv,
});

export const USERS: Record<TestUserKey, TestUser> = {
  admin: user('admin', 'test-admin', 1, 'test-admin', 'TEST_ADMIN_PASSWORD'),
  teacher7A: user('teacher7A', 'Teacher of Test Basic 7A', 2, 'test-teacher-7a', 'TEST_TEACHER_7A_PASSWORD'),
  teacher7B: user('teacher7B', 'Teacher of Test Basic 7B', 3, 'test-teacher-7b', 'TEST_TEACHER_7B_PASSWORD'),
  p1: user('p1', 'TEST-P1', 11, 'test-p1', 'TEST_P1_PASSWORD'),
  p2: user('p2', 'TEST-P2', 12, 'test-p2', 'TEST_P2_PASSWORD'),
  p3: user('p3', 'TEST-P3', 13, 'test-p3', 'TEST_P3_PASSWORD'),
  p4: user('p4', 'TEST-P4', 14, 'test-p4', 'TEST_P4_PASSWORD'),
};

export const SCHOOL = { id: id('0001', 1), name: 'Test School' };

export const CLASSES = {
  A: { id: id('0002', 1), name: 'Test Basic 7A', joinCode: 'TSTBSA' },
  B: { id: id('0002', 2), name: 'Test Basic 7B', joinCode: 'TSTBSB' },
};

export const STAFF = {
  admin: { id: id('0003', 1), name: 'Test Admin', role: 'admin' as const, user: USERS.admin },
  teacher7A: { id: id('0003', 2), name: 'Teacher 7A Test', role: 'teacher' as const, user: USERS.teacher7A },
  teacher7B: { id: id('0003', 3), name: 'Teacher 7B Test', role: 'teacher' as const, user: USERS.teacher7B },
};

export type TestPupil = {
  id: string;
  user: TestUser;
  name: string;
  code: string;
  classId: string;
  consent: 'paper' | 'in_app' | null;
};

export const PUPILS: Record<'p1' | 'p2' | 'p3' | 'p4', TestPupil> = {
  p1: { id: id('0004', 1), user: USERS.p1, name: 'Ama Test', code: 'TESTPA', classId: CLASSES.A.id, consent: 'paper' },
  p2: { id: id('0004', 2), user: USERS.p2, name: 'Kofi Test', code: 'TESTPB', classId: CLASSES.A.id, consent: 'paper' },
  // No consent, on purpose (runbook S07).
  p3: { id: id('0004', 3), user: USERS.p3, name: 'Esi Test', code: 'TESTPC', classId: CLASSES.A.id, consent: null },
  p4: { id: id('0004', 4), user: USERS.p4, name: 'Yaw Test', code: 'TESTPD', classId: CLASSES.B.id, consent: 'in_app' },
};

export const PUPIL_LIST = [PUPILS.p1, PUPILS.p2, PUPILS.p3, PUPILS.p4];
export const PUPIL_IDS = PUPIL_LIST.map((p) => p.id);
export const CLASS_7A_PUPIL_IDS = [PUPILS.p1.id, PUPILS.p2.id, PUPILS.p3.id];

export const CONTENT = {
  topicId: id('0005', 1),
  topicCode: 'TEST-MATERIALS',
  segmentId: id('0006', 1),
  videoVersionId: id('0007', 1),
  checkItemId: id('0008', 1),
  paperId: id('0009', 1),
  objectiveItemId: id('000b', 1),
  theoryItemId: id('000b', 2),
};

/** Per-pupil row ids. n is 1 to 4 for P1 to P4. */
export const rowIds = (n: number) => ({
  attempt: id('000c', n),
  examAttempt: id('000d', n),
  examAnswer: id('000e', n),
  flag: id('000f', n),
  overview: id('0010', n),
  mastery: id('0011', n),
  consent: id('0012', n),
});

/** Pupils with exam rows, flags and AI calls. P3 has lesson rows only. */
export const PUPILS_WITH_EXAM = ['p1', 'p2', 'p4'] as const;
