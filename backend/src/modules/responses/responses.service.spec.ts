import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { QuestionType } from 'src/common/enums';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { Response } from './schemas/response.schema';
import { ResponsesService } from './responses.service';

const VIDEO_ID = '6530f1a2b3c4d5e6f7a8b9c0';
const OTHER_VIDEO_ID = '6530f1a2b3c4d5e6f7a8b9c1';
const QUESTION_ID = '6530f1a2b3c4d5e6f7a8b9c2';
const LEARNER_ID = '6530f1a2b3c4d5e6f7a8b9c3';

const makeQuestion = (overrides: Record<string, unknown> = {}): any => ({
  _id: new Types.ObjectId(QUESTION_ID),
  videoId: new Types.ObjectId(VIDEO_ID),
  type: QuestionType.SINGLE_CHOICE,
  timestampSeconds: 30,
  isActive: true,
  points: 1,
  ...overrides,
});

describe('ResponsesService.submit() - playback position gate', () => {
  let service: ResponsesService;
  let questionsService: { findByIdOrFail: jest.Mock; grade: jest.Mock };
  let responseModel: { findOneAndUpdate: jest.Mock };

  const savedResponse = {
    questionId: new Types.ObjectId(QUESTION_ID),
    isCorrect: true,
    pointsAwarded: 1,
    attempts: 1,
  };

  beforeEach(async () => {
    questionsService = {
      findByIdOrFail: jest.fn().mockResolvedValue(makeQuestion()),

      grade: jest.fn().mockReturnValue({ isCorrect: true, pointsAwarded: 1 }),
    };
    responseModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(savedResponse),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResponsesService,
        { provide: getModelToken(Response.name), useValue: responseModel },
        { provide: QuestionsService, useValue: questionsService },
      ],
    }).compile();

    service = moduleRef.get(ResponsesService);
  });

  const submit = (reachedSeconds: number) =>
    service.submit(VIDEO_ID, QUESTION_ID, LEARNER_ID, { selectedOptionKeys: ['a'] }, reachedSeconds);

  it('accepts an answer once the learner has played past the question', async () => {
    await expect(submit(45)).resolves.toMatchObject({ isCorrect: true });
    expect(responseModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('accepts an answer at exactly the question timestamp', async () => {
    await expect(submit(30)).resolves.toMatchObject({ isCorrect: true });
  });

  it('refuses an answer for a question the learner has not reached', async () => {
    await expect(submit(5)).rejects.toThrow(ForbiddenException);

    expect(responseModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('allows the grace margin, since positions are saved as whole seconds', async () => {
    await expect(submit(29)).resolves.toMatchObject({ isCorrect: true });
  });

  it('refuses an answer just beyond the grace margin', async () => {
    await expect(submit(27)).rejects.toThrow(/not reached this question yet/);
  });

  it('still refuses a question belonging to a different video', async () => {
    await expect(
      service.submit(OTHER_VIDEO_ID, QUESTION_ID, LEARNER_ID, { selectedOptionKeys: ['a'] }, 999),
    ).rejects.toThrow(BadRequestException);
  });

  it('still refuses an inactive question even when the position is fine', async () => {
    questionsService.findByIdOrFail.mockResolvedValue(makeQuestion({ isActive: false }));
    await expect(submit(999)).rejects.toThrow(/no longer active/);
  });

  it('treats a question at the very start as immediately answerable', async () => {
    questionsService.findByIdOrFail.mockResolvedValue(makeQuestion({ timestampSeconds: 0 }));
    await expect(submit(0)).resolves.toMatchObject({ isCorrect: true });
  });
});
