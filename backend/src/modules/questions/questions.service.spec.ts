import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { QuestionType } from 'src/common/enums';
import { Question } from './schemas/question.schema';
import { QuestionsService } from './questions.service';
import { Response } from 'src/modules/responses/schemas/response.schema';

const makeQuestion = (overrides: Partial<Question> = {}): any => ({
  type: QuestionType.SINGLE_CHOICE,
  prompt: 'Example question',
  options: [
    { key: 'a', text: 'Option A' },
    { key: 'b', text: 'Option B' },
    { key: 'c', text: 'Option C' },
  ],
  correctOptionKeys: ['a'],
  acceptedAnswers: [],
  points: 2,
  isActive: true,
  ...overrides,
});

describe('QuestionsService', () => {
  let service: QuestionsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: getModelToken(Question.name), useValue: {} },
        { provide: getModelToken(Response.name), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(QuestionsService);
  });

  describe('grade() - single choice', () => {
    it('awards the question points for the correct option', () => {
      const result = service.grade(makeQuestion(), { selectedOptionKeys: ['a'] });
      expect(result).toEqual({ isCorrect: true, pointsAwarded: 2 });
    });

    it('awards nothing for a wrong option', () => {
      const result = service.grade(makeQuestion(), { selectedOptionKeys: ['b'] });
      expect(result).toEqual({ isCorrect: false, pointsAwarded: 0 });
    });

    it('rejects more than one selected option', () => {
      expect(() => service.grade(makeQuestion(), { selectedOptionKeys: ['a', 'b'] })).toThrow(
        BadRequestException,
      );
    });

    it('rejects an option key that does not exist on the question', () => {
      expect(() => service.grade(makeQuestion(), { selectedOptionKeys: ['z'] })).toThrow(
        /Unknown option/,
      );
    });

    it('rejects an empty selection', () => {
      expect(() => service.grade(makeQuestion(), { selectedOptionKeys: [] })).toThrow(
        /Select at least one option/,
      );
    });
  });

  describe('grade() - multiple choice', () => {
    const multi = makeQuestion({
      type: QuestionType.MULTIPLE_CHOICE,
      correctOptionKeys: ['a', 'b'],
      points: 3,
    });

    it('requires an exact set match', () => {
      expect(service.grade(multi, { selectedOptionKeys: ['a', 'b'] })).toEqual({
        isCorrect: true,
        pointsAwarded: 3,
      });
    });

    it('does not care about selection order', () => {
      expect(service.grade(multi, { selectedOptionKeys: ['b', 'a'] }).isCorrect).toBe(true);
    });

    it('marks a partial selection wrong', () => {
      expect(service.grade(multi, { selectedOptionKeys: ['a'] }).isCorrect).toBe(false);
    });

    it('marks a superset wrong', () => {
      expect(service.grade(multi, { selectedOptionKeys: ['a', 'b', 'c'] }).isCorrect).toBe(false);
    });
  });

  describe('grade() - short answer', () => {
    const short = makeQuestion({
      type: QuestionType.SHORT_ANSWER,
      options: [],
      correctOptionKeys: [],
      acceptedAnswers: ['Harmonized System', 'HS'],
      points: 2,
    });

    it('matches regardless of case and surrounding whitespace', () => {
      expect(service.grade(short, { answerText: '  harmonized SYSTEM ' }).isCorrect).toBe(true);
    });

    it('accepts any of the configured synonyms', () => {
      expect(service.grade(short, { answerText: 'hs' }).isCorrect).toBe(true);
    });

    it('marks an unlisted answer wrong', () => {
      expect(service.grade(short, { answerText: 'something else' }).isCorrect).toBe(false);
    });

    it('rejects a blank answer', () => {
      expect(() => service.grade(short, { answerText: '   ' })).toThrow(/answer is required/);
    });
  });

  describe('toLearnerShape()', () => {
    it('strips the correct answers and the explanation', () => {
      const shaped = service.toLearnerShape({
        _id: { toString: () => 'q1' },
        ...makeQuestion({ acceptedAnswers: ['secret'], explanation: 'because' }),
        timestampSeconds: 30,
      });

      expect(shaped).toEqual({
        id: 'q1',
        timestampSeconds: 30,
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Example question',
        options: [
          { key: 'a', text: 'Option A' },
          { key: 'b', text: 'Option B' },
          { key: 'c', text: 'Option C' },
        ],
        points: 2,
      });
      expect(JSON.stringify(shaped)).not.toContain('secret');
      expect(JSON.stringify(shaped)).not.toContain('because');
    });
  });
});
