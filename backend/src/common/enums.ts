/** Application-wide enums. Kept in one place so the API, the schemas and the
 *  seed script can never drift apart on a string literal. */

export enum UserRole {
  ADMIN = 'admin',
  LEARNER = 'learner',
}

export enum VideoStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  SHORT_ANSWER = 'short_answer',
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * A learner is considered to have "watched" the video once their furthest
 * watched point crosses this share of the duration. Videos rarely get watched
 * to the literal final frame (credits, player rounding), so we leave a margin.
 */
export const COMPLETION_WATCH_THRESHOLD = 0.95;
