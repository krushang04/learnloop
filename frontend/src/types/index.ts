/** Mirrors the enums in the API. Kept in sync by hand — the API is the source of truth. */

export type UserRole = 'admin' | 'learner';
export type VideoStatus = 'draft' | 'published';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface LearnerSummary {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface QuestionOption {
  key: string;
  text: string;
}

/** Admin-facing question: includes the correct answers. */
export interface Question {
  _id: string;
  id?: string;
  videoId: string;
  timestampSeconds: number;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  correctOptionKeys: string[];
  acceptedAnswers: string[];
  points: number;
  explanation: string;
  isActive: boolean;
}

/** Learner-facing question: the API strips the answers before sending it. */
export interface LearnerQuestion {
  id: string;
  timestampSeconds: number;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  points: number;
}

export interface Video {
  _id: string;
  id?: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  durationSeconds: number;
  status: VideoStatus;
  tags: string[];
  questionCount?: number;
  createdBy?: { _id: string; name: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoDetail extends Omit<Video, 'questionCount'> {
  questions: Question[];
}

export interface Progress {
  lastPositionSeconds: number;
  maxPositionSeconds: number;
  completionPercentage: number;
  status: ProgressStatus;
  answeredQuestionCount: number;
  startedAt: string | null;
  completedAt: string | null;
  lastWatchedAt: string | null;
}

export interface AssignedVideo {
  assignmentId: string;
  assignedAt: string;
  dueAt: string | null;
  video: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    durationSeconds: number;
    tags: string[];
  };
  questionCount: number;
  progress: Progress;
}

export interface LearnerAnswer {
  questionId: string;
  selectedOptionKeys: string[];
  answerText: string;
  isCorrect: boolean;
  attempts: number;
  answeredAt: string;
}

export interface PlayerPayload {
  video: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    durationSeconds: number;
    tags: string[];
    status: VideoStatus;
  };
  questions: LearnerQuestion[];
  progress: Progress;
  answers: LearnerAnswer[];
}

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  explanation: string;
  attempts: number;
}

export interface Assignment {
  _id: string;
  videoId: string;
  learnerId: { _id: string; name: string; email: string };
  dueAt: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ReportOverview {
  totalVideos: number;
  publishedVideos: number;
  draftVideos: number;
  totalLearners: number;
  totalAssignments: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface VideoReportRow {
  learner: { id: string; name: string; email: string };
  assignedAt: string;
  dueAt: string | null;
  status: ProgressStatus;
  completionPercentage: number;
  lastPositionSeconds: number;
  lastWatchedAt: string | null;
  completedAt: string | null;
  answered: number;
  correct: number;
  pointsAwarded: number;
  accuracy: number | null;
}

export interface VideoReport {
  video: {
    id: string;
    title: string;
    status: VideoStatus;
    durationSeconds: number;
    questionCount: number;
  };
  summary: {
    assigned: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionRate: number;
    averageCompletion: number;
  };
  rows: VideoReportRow[];
}

export interface LearnerResponseReport {
  video: { id: string; title: string; durationSeconds: number };
  learner: { id: string; name: string; email: string };
  progress: {
    status: ProgressStatus;
    completionPercentage: number;
    lastPositionSeconds: number;
    lastWatchedAt: string | null;
    completedAt: string | null;
  };
  summary: {
    totalQuestions: number;
    answered: number;
    correct: number;
    pointsAwarded: number;
    pointsPossible: number;
  };
  items: {
    question: {
      id: string;
      prompt: string;
      type: QuestionType;
      timestampSeconds: number;
      points: number;
      options: QuestionOption[];
      correctOptionKeys: string[];
      correctOptionTexts: string[];
      acceptedAnswers: string[];
    };
    response: {
      selectedOptionKeys: string[];
      selectedOptionTexts: string[];
      answerText: string;
      isCorrect: boolean;
      pointsAwarded: number;
      attempts: number;
      answeredAt: string;
    } | null;
  }[];
}

/**
 * Share of the stated completion length a learner must watch before the video
 * counts as watched. Mirrors COMPLETION_WATCH_THRESHOLD on the API.
 */
export const COMPLETION_THRESHOLD = 0.95;
