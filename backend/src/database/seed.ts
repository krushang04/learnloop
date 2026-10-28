import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import mongoose, { Types } from 'mongoose';
import {
  COMPLETION_WATCH_THRESHOLD,
  ProgressStatus,
  QuestionType,
  UserRole,
  VideoStatus,
} from '../common/enums';
import { AssignmentSchema } from '../modules/assignments/schemas/assignment.schema';
import { ProgressSchema } from '../modules/progress/schemas/progress.schema';
import { QuestionSchema } from '../modules/questions/schemas/question.schema';
import { ResponseSchema } from '../modules/responses/schemas/response.schema';
import { UserSchema } from '../modules/users/schemas/user.schema';
import { VideoSchema } from '../modules/videos/schemas/video.schema';

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/learnloop';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@learnloop.dev';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
const LEARNER_PASSWORD = process.env.SEED_LEARNER_PASSWORD ?? 'Learner@123';

const User = mongoose.model('User', UserSchema);
const Video = mongoose.model('Video', VideoSchema);
const Question = mongoose.model('Question', QuestionSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Progress = mongoose.model('Progress', ProgressSchema);
const Response = mongoose.model('Response', ResponseSchema);

const SAMPLE_VIDEOS = [
  {
    title: 'Getting Started with Trade Compliance',
    description:
      'A short primer on why classification matters, who regulates it, and what happens when a shipment is misdeclared.',
    videoUrl: 'https://download.samplelib.com/mp4/sample-30s.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/compliance/640/360',
    durationSeconds: 30,
    tags: ['compliance', 'onboarding'],
    status: VideoStatus.PUBLISHED,
    questions: [
      {
        timestampSeconds: 8,
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'What is the primary purpose of an HS code?',
        options: [
          { key: 'a', text: 'To classify a traded product for customs' },
          { key: 'b', text: 'To track the shipping container' },
          { key: 'c', text: 'To identify the freight forwarder' },
          { key: 'd', text: 'To set the currency exchange rate' },
        ],
        correctOptionKeys: ['a'],
        points: 2,
        explanation:
          'HS codes are the internationally standardised way of classifying a product so customs authorities can apply the right duty and controls.',
      },
      {
        timestampSeconds: 17,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Which of these can a misclassification lead to? (Select all that apply)',
        options: [
          { key: 'a', text: 'Underpaid or overpaid duty' },
          { key: 'b', text: 'Shipment delays at the border' },
          { key: 'c', text: 'Penalties from the customs authority' },
          { key: 'd', text: 'A lower fuel surcharge' },
        ],
        correctOptionKeys: ['a', 'b', 'c'],
        points: 3,
        explanation:
          'Misclassification affects duty, clearance time and compliance standing. It has nothing to do with fuel surcharges.',
      },
      {
        timestampSeconds: 26,
        type: QuestionType.SHORT_ANSWER,
        prompt: 'What does "HS" stand for in HS code?',
        acceptedAnswers: ['harmonized system', 'harmonised system', 'harmonized', 'hs'],
        points: 2,
        explanation: 'HS stands for the Harmonized System, maintained by the World Customs Organization.',
      },
    ],
  },
  {
    title: 'Reading a Bill of Lading',
    description:
      'Walk through a real bill of lading field by field and learn which parties and terms actually matter.',
    videoUrl: 'https://download.samplelib.com/mp4/sample-20s.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/lading/640/360',
    durationSeconds: 20,
    tags: ['documentation', 'logistics'],
    status: VideoStatus.PUBLISHED,
    questions: [
      {
        timestampSeconds: 6,
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Who is the "consignee" on a bill of lading?',
        options: [
          { key: 'a', text: 'The party shipping the goods' },
          { key: 'b', text: 'The party receiving the goods' },
          { key: 'c', text: 'The vessel operator' },
          { key: 'd', text: 'The customs broker' },
        ],
        correctOptionKeys: ['b'],
        points: 2,
        explanation: 'The consignee is the receiving party - the shipper is the one sending.',
      },
      {
        timestampSeconds: 14,
        type: QuestionType.SHORT_ANSWER,
        prompt: 'Which three-letter Incoterm means the seller clears the goods for export but the buyer pays freight?',
        acceptedAnswers: ['fob', 'f.o.b.'],
        points: 3,
        explanation: 'FOB (Free On Board): the seller handles export clearance, the buyer takes on cost and risk once loaded.',
      },
    ],
  },
  {
    title: 'Sanctions and Denied Party Screening',
    description:
      'How screening works, which lists matter, and what to do when you get a hit.',
    videoUrl: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/sanctions/640/360',
    durationSeconds: 15,
    tags: ['compliance', 'risk'],
    status: VideoStatus.PUBLISHED,
    questions: [
      {
        timestampSeconds: 5,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Which parties should be screened before a shipment? (Select all that apply)',
        options: [
          { key: 'a', text: 'The buyer' },
          { key: 'b', text: 'The end user' },
          { key: 'c', text: 'The freight forwarder' },
          { key: 'd', text: 'Your own finance team' },
        ],
        correctOptionKeys: ['a', 'b', 'c'],
        points: 3,
        explanation: 'Every external party in the transaction chain is screened. Internal teams are not.',
      },
      {
        timestampSeconds: 11,
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'You get a potential name match on a sanctions list. What is the correct first step?',
        options: [
          { key: 'a', text: 'Cancel the order immediately' },
          { key: 'b', text: 'Escalate and investigate before proceeding' },
          { key: 'c', text: 'Ship it and note the match in the file' },
          { key: 'd', text: 'Ask the customer whether they are sanctioned' },
        ],
        correctOptionKeys: ['b'],
        points: 2,
        explanation:
          'A potential match is not a confirmed match. Hold, escalate and investigate before acting either way.',
      },
    ],
  },
  {
    title: 'Advanced Tariff Engineering (Draft)',
    description:
      'Still being written - kept unpublished so you can see how a draft behaves: invisible to learners until published.',
    videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/tariff/640/360',
    durationSeconds: 10,
    tags: ['advanced'],
    status: VideoStatus.DRAFT,
    questions: [
      {
        timestampSeconds: 5,
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Is tariff engineering legal?',
        options: [
          { key: 'a', text: 'Yes, when the product is genuinely designed to meet a classification' },
          { key: 'b', text: 'No, it is always considered fraud' },
        ],
        correctOptionKeys: ['a'],
        points: 1,
        explanation:
          'Designing a product so it genuinely falls under a different classification is lawful; misdeclaring an unchanged product is not.',
      },
    ],
  },
];

const LEARNERS = [
  { name: 'Asha Menon', email: 'asha@learnloop.dev' },
  { name: 'Rahul Verma', email: 'rahul@learnloop.dev' },
  { name: 'Priya Nair', email: 'priya@learnloop.dev' },
  { name: 'Daniel Osei', email: 'daniel@learnloop.dev' },
];

async function seed() {
  console.log(`\nConnecting to ${MONGODB_URI} ...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  console.log('Clearing existing data ...');
  await Promise.all([
    User.deleteMany({}),
    Video.deleteMany({}),
    Question.deleteMany({}),
    Assignment.deleteMany({}),
    Progress.deleteMany({}),
    Response.deleteMany({}),
  ]);

  const hash = (plain: string) => bcrypt.hash(plain, 10);

  const admin = await User.create({
    name: 'Maya Iyer',
    email: ADMIN_EMAIL,
    password: await hash(ADMIN_PASSWORD),
    role: UserRole.ADMIN,
  });
  console.log(`Created admin: ${admin.email}`);

  const learners = await User.insertMany(
    await Promise.all(
      LEARNERS.map(async (l) => ({
        name: l.name,
        email: l.email,
        password: await hash(LEARNER_PASSWORD),
        role: UserRole.LEARNER,
      })),
    ),
  );
  console.log(`Created ${learners.length} learners`);

  const createdVideos: { id: Types.ObjectId; duration: number; questionIds: Types.ObjectId[] }[] = [];

  for (const spec of SAMPLE_VIDEOS) {
    const video = await Video.create({
      title: spec.title,
      description: spec.description,
      thumbnailUrl: spec.thumbnailUrl,
      videoUrl: spec.videoUrl,
      durationSeconds: spec.durationSeconds,
      status: spec.status,
      tags: spec.tags,
      createdBy: admin._id,
    });

    const questions = await Question.insertMany(
      spec.questions.map((q) => ({
        videoId: video._id,
        timestampSeconds: q.timestampSeconds,
        type: q.type,
        prompt: q.prompt,
        options: (q as any).options ?? [],
        correctOptionKeys: (q as any).correctOptionKeys ?? [],
        acceptedAnswers: (q as any).acceptedAnswers ?? [],
        points: q.points,
        explanation: q.explanation,
        isActive: true,
      })),
    );

    createdVideos.push({
      id: video._id as Types.ObjectId,
      duration: spec.durationSeconds,
      questionIds: questions.map((q) => q._id as Types.ObjectId),
    });
    console.log(`Created video "${spec.title}" with ${questions.length} question(s)`);
  }

  const publishedVideos = createdVideos.slice(0, 3);

  for (const video of publishedVideos) {
    await Assignment.insertMany(
      learners.map((learner) => ({
        videoId: video.id,
        learnerId: learner._id,
        assignedBy: admin._id,
        dueAt: null,
      })),
    );
  }
  console.log(`Assigned ${publishedVideos.length} videos to ${learners.length} learners`);

  const [firstVideo, secondVideo] = publishedVideos;
  const [asha, rahul, priya] = learners;

  await seedProgress({
    video: firstVideo,
    learner: asha._id as Types.ObjectId,
    position: firstVideo.duration,
    answerAll: true,
    allCorrect: true,
  });

  await seedProgress({
    video: firstVideo,
    learner: rahul._id as Types.ObjectId,
    position: Math.round(firstVideo.duration * 0.5),
    answerCount: 1,
    allCorrect: false,
  });

  await seedProgress({
    video: secondVideo,
    learner: priya._id as Types.ObjectId,
    position: Math.round(secondVideo.duration * 0.2),
    answerCount: 0,
  });

  console.log('Seeded demo progress and responses\n');
  console.log('─'.repeat(58));
  console.log('  Sample credentials');
  console.log('─'.repeat(58));
  console.log(`  Admin    ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  for (const l of LEARNERS) {
    console.log(`  Learner  ${l.email.padEnd(24)}  /  ${LEARNER_PASSWORD}`);
  }
  console.log('─'.repeat(58));

  await mongoose.disconnect();
  console.log('\nSeed complete.\n');
}

async function seedProgress(input: {
  video: { id: Types.ObjectId; duration: number; questionIds: Types.ObjectId[] };
  learner: Types.ObjectId;
  position: number;
  answerAll?: boolean;
  answerCount?: number;
  allCorrect?: boolean;
}) {
  const { video, learner, position } = input;
  const questionIds = input.answerAll
    ? video.questionIds
    : video.questionIds.slice(0, input.answerCount ?? 0);

  for (const questionId of questionIds) {
    const question = await Question.findById(questionId).lean();
    if (!question) continue;

    const correct = input.allCorrect ?? true;
    const isShortAnswer = question.type === QuestionType.SHORT_ANSWER;

    await Response.create({
      questionId,
      videoId: video.id,
      learnerId: learner,
      questionType: question.type,
      selectedOptionKeys: isShortAnswer
        ? []
        : correct
          ? question.correctOptionKeys
          : [question.options.find((o: any) => !question.correctOptionKeys.includes(o.key))?.key ?? 'a'],
      answerText: isShortAnswer ? (correct ? question.acceptedAnswers[0] : 'not sure') : '',
      isCorrect: correct,
      pointsAwarded: correct ? question.points : 0,
      attempts: 1,
      answeredAt: new Date(),
    });
  }

  const watchRatio = video.duration > 0 ? Math.min(position / video.duration, 1) : 0;
  const answeredAll = questionIds.length >= video.questionIds.length;
  const completed = watchRatio >= COMPLETION_WATCH_THRESHOLD && answeredAll;

  await Progress.create({
    videoId: video.id,
    learnerId: learner,
    lastPositionSeconds: position,
    maxPositionSeconds: position,
    completionPercentage: Math.round(watchRatio * 100),
    status: completed
      ? ProgressStatus.COMPLETED
      : position > 0 || questionIds.length
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED,
    answeredQuestionCount: questionIds.length,
    startedAt: new Date(),
    completedAt: completed ? new Date() : null,
    lastWatchedAt: new Date(),
  });
}

seed().catch(async (error) => {
  console.error('\nSeed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
