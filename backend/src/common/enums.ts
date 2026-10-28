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

export const COMPLETION_WATCH_THRESHOLD = 0.95;

export const ANSWER_POSITION_GRACE_SECONDS = 2;
