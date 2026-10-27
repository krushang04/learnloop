import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProgressStatus } from 'src/common/enums';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { Response } from 'src/modules/responses/schemas/response.schema';
import { VideosService } from 'src/modules/videos/videos.service';
import { ProgressService } from './progress.service';
import { Progress } from './schemas/progress.schema';

/**
 * recalculate() is the rule that decides whether a learner has finished a
 * lesson, so it is tested directly against a plain progress object.
 */
describe('ProgressService.recalculate', () => {
  let service: ProgressService;
  let answeredCount = 0;
  let totalQuestions = 0;
  let videoDuration = 100;
  let storedRows: any[] = [];

  const makeProgress = (overrides: Partial<Progress> = {}): any => ({
    videoId: { toString: () => 'video-1' },
    learnerId: { toString: () => 'learner-1' },
    lastPositionSeconds: 0,
    maxPositionSeconds: 0,
    completionPercentage: 0,
    status: ProgressStatus.NOT_STARTED,
    answeredQuestionCount: 0,
    completedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    answeredCount = 0;
    totalQuestions = 0;
    videoDuration = 100;
    storedRows = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: getModelToken(Progress.name),
          useValue: { find: () => ({ exec: async () => storedRows }) },
        },
        {
          provide: getModelToken(Response.name),
          useValue: { countDocuments: () => ({ exec: async () => answeredCount }) },
        },
        {
          provide: QuestionsService,
          useValue: { countActiveForVideo: async () => totalQuestions },
        },
        {
          provide: VideosService,
          useValue: { findByIdOrFail: async () => ({ durationSeconds: videoDuration }) },
        },
      ],
    }).compile();

    service = moduleRef.get(ProgressService);
  });

  it('reports 0% and not_started for an untouched video', async () => {
    const progress = makeProgress();
    await service.recalculate(progress, 100);

    expect(progress.completionPercentage).toBe(0);
    expect(progress.status).toBe(ProgressStatus.NOT_STARTED);
  });

  it('derives the percentage from the furthest point watched', async () => {
    const progress = makeProgress({ maxPositionSeconds: 42 });
    await service.recalculate(progress, 100);

    expect(progress.completionPercentage).toBe(42);
    expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
  });

  it('does not complete a video whose questions are unanswered', async () => {
    totalQuestions = 3;
    answeredCount = 1;

    const progress = makeProgress({ maxPositionSeconds: 100 });
    await service.recalculate(progress, 100);

    expect(progress.completionPercentage).toBe(100);
    expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
    expect(progress.completedAt).toBeNull();
  });

  it('does not complete a video that was only partly watched', async () => {
    totalQuestions = 2;
    answeredCount = 2;

    const progress = makeProgress({ maxPositionSeconds: 50 });
    await service.recalculate(progress, 100);

    expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
  });

  it('completes once the video is watched through and every question is answered', async () => {
    totalQuestions = 2;
    answeredCount = 2;

    const progress = makeProgress({ maxPositionSeconds: 100 });
    await service.recalculate(progress, 100);

    expect(progress.status).toBe(ProgressStatus.COMPLETED);
    expect(progress.completedAt).toBeInstanceOf(Date);
  });

  it('completes at the 95% threshold, not only at the literal final frame', async () => {
    const progress = makeProgress({ maxPositionSeconds: 96 });
    await service.recalculate(progress, 100);

    expect(progress.status).toBe(ProgressStatus.COMPLETED);
  });

  it('keeps an existing completedAt stable when recalculated again', async () => {
    const earlier = new Date('2026-01-01T00:00:00Z');
    const progress = makeProgress({
      maxPositionSeconds: 100,
      status: ProgressStatus.COMPLETED,
      completedAt: earlier,
    });

    await service.recalculate(progress, 100);
    expect(progress.completedAt).toBe(earlier);
  });

  it('caps the percentage at 100 if a position somehow exceeds the duration', async () => {
    const progress = makeProgress({ maxPositionSeconds: 250 });
    await service.recalculate(progress, 100);

    expect(progress.completionPercentage).toBe(100);
  });

  it('reports 0% rather than a misleading number when the duration is unknown', async () => {
    const progress = makeProgress({ maxPositionSeconds: 30 });
    await service.recalculate(progress, 0);

    expect(progress.completionPercentage).toBe(0);
    expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);
  });
});

/**
 * Progress is derived from the video's duration and question count, so editing
 * either has to re-derive every stored row. These cover the admin-side edits
 * that would otherwise leave the report showing figures from the old settings.
 */
describe('ProgressService.recalculateForVideo', () => {
  // recalculateForVideo casts the id, so the fixture has to be a real ObjectId.
  const VIDEO_ID = '6530f1a2b3c4d5e6f7a8b9c0';

  let service: ProgressService;
  let answeredCount = 0;
  let totalQuestions = 0;
  let videoDuration = 100;
  let storedRows: any[] = [];

  const makeRow = (overrides: Record<string, any> = {}) => ({
    videoId: { toString: () => 'video-1' },
    learnerId: { toString: () => 'learner-1' },
    lastPositionSeconds: 0,
    maxPositionSeconds: 0,
    completionPercentage: 0,
    status: ProgressStatus.NOT_STARTED,
    answeredQuestionCount: 0,
    completedAt: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    answeredCount = 0;
    totalQuestions = 0;
    videoDuration = 100;
    storedRows = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: getModelToken(Progress.name),
          useValue: { find: () => ({ exec: async () => storedRows }) },
        },
        {
          provide: getModelToken(Response.name),
          useValue: { countDocuments: () => ({ exec: async () => answeredCount }) },
        },
        { provide: QuestionsService, useValue: { countActiveForVideo: async () => totalQuestions } },
        {
          provide: VideosService,
          useValue: { findByIdOrFail: async () => ({ durationSeconds: videoDuration }) },
        },
      ],
    }).compile();

    service = moduleRef.get(ProgressService);
  });

  it('pulls a saved position back inside a shortened video', async () => {
    videoDuration = 5;
    const row = makeRow({ lastPositionSeconds: 10, maxPositionSeconds: 10 });
    storedRows = [row];

    await service.recalculateForVideo(VIDEO_ID);

    // Resuming at 10s on a 5s video would drop the learner past the end.
    expect(row.lastPositionSeconds).toBe(5);
    expect(row.maxPositionSeconds).toBe(5);
    expect(row.completionPercentage).toBe(100);
    expect(row.save).toHaveBeenCalled();
  });

  it('re-derives the percentage against the new duration', async () => {
    videoDuration = 200;
    const row = makeRow({ lastPositionSeconds: 50, maxPositionSeconds: 50 });
    storedRows = [row];

    await service.recalculateForVideo(VIDEO_ID);

    // 50 of 200 is 25%, not the 50% it was when the video was 100s.
    expect(row.completionPercentage).toBe(25);
  });

  it('un-completes a learner when a new question is added', async () => {
    totalQuestions = 2;
    answeredCount = 1;
    const row = makeRow({
      maxPositionSeconds: 100,
      status: ProgressStatus.COMPLETED,
      completedAt: new Date(),
    });
    storedRows = [row];

    await service.recalculateForVideo(VIDEO_ID);

    expect(row.status).toBe(ProgressStatus.IN_PROGRESS);
    expect(row.completedAt).toBeNull();
  });

  it('completes a learner when the outstanding question is deleted', async () => {
    totalQuestions = 1;
    answeredCount = 1;
    const row = makeRow({ maxPositionSeconds: 100, status: ProgressStatus.IN_PROGRESS });
    storedRows = [row];

    await service.recalculateForVideo(VIDEO_ID);

    expect(row.status).toBe(ProgressStatus.COMPLETED);
  });

  it('leaves a video with no learners alone', async () => {
    storedRows = [];
    await expect(service.recalculateForVideo(VIDEO_ID)).resolves.toBe(0);
  });

  it('recalculates every learner, not just the first', async () => {
    videoDuration = 50;
    const rows = [
      makeRow({ maxPositionSeconds: 25 }),
      makeRow({ maxPositionSeconds: 50 }),
      makeRow({ maxPositionSeconds: 10 }),
    ];
    storedRows = rows;

    await expect(service.recalculateForVideo(VIDEO_ID)).resolves.toBe(3);
    expect(rows.map((r) => r.completionPercentage)).toEqual([50, 100, 20]);
  });
});
