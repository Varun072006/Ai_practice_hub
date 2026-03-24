import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { executeCode } from '../utils/codeExecutor';
import { getNextHost } from '../utils/pistonLoadBalancer';
import logger from '../config/logger';
import crypto from 'crypto';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
}

export interface ExecutionJobData {
  code: string;
  language: string;
  testCases: TestCase[];
  courseName: string;
  priority: 'submit' | 'run';
}

export interface ExecutionJobResult {
  test_case_id: string;
  passed: boolean;
  expected_output: string;
  actual_output: string;
  error_message?: string;
  execution_time?: number;
}

const queue = new Queue('code-execution', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const queueEvents = new QueueEvents('code-execution', { connection: redis as any });

function sha256(data: string) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function addEvaluationJob(data: ExecutionJobData): Promise<Job> {
  const waitingCount = await queue.getWaitingCount();
  if (waitingCount > 200) {
    throw new Error('System is busy. Please try again shortly.');
  }

  const dedupKey = `inprogress:${sha256(data.code + data.language + JSON.stringify(data.testCases))}`;
  const existingJobId = await redis.get(dedupKey);

  if (existingJobId) {
    const existingJob = await Job.fromId(queue, existingJobId);
    if (existingJob) return existingJob;
  }

  const job = await queue.add('execute', data, {
    priority: data.priority === 'submit' ? 1 : 5,
  });

  await redis.setex(dedupKey, 20, job.id!);
  return job;
}

export async function waitForJob<T>(job: Job): Promise<T> {
  return await job.waitUntilFinished(queueEvents);
}

const BATCH_SIZE = 2; // Batched tests internally
const worker = new Worker('code-execution', async (job) => {
  const { code, language, testCases } = job.data as ExecutionJobData;
  const results: ExecutionJobResult[] = [];

  for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
    const batch = testCases.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (tc) => {
        const cacheKey = `exec:${sha256(code + language + tc.input_data)}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
          const parsed = JSON.parse(cached);
          return validateResult(tc, parsed);
        }

        const host = getNextHost();
        const startTime = Date.now();
        const execResult = await executeCode(code, language, tc.input_data, [], host);
        const executionTime = Date.now() - startTime;
        
        const resultPayload = { ...execResult, executionTime };
        await redis.setex(cacheKey, 300, JSON.stringify(resultPayload)); // Cache for 5 mins

        return validateResult(tc, resultPayload);
      })
    );
    results.push(...batchResults);
  }
  return results;
}, {
  connection: redis as any,
  concurrency: 5, // 5 simultaneous jobs across the worker
});

function validateResult(tc: TestCase, execResult: any): ExecutionJobResult {
  if (execResult.error) {
    return {
      test_case_id: tc.id,
      passed: false,
      expected_output: tc.expected_output,
      actual_output: execResult.output || '',
      error_message: execResult.error,
      execution_time: execResult.executionTime || 0,
    };
  }

  const expectedNorm = normalizeOutput(tc.expected_output);
  const actualNorm = normalizeOutput(execResult.output || '');

  return {
    test_case_id: tc.id,
    passed: expectedNorm === actualNorm,
    expected_output: tc.expected_output,
    actual_output: execResult.output || '',
    execution_time: execResult.executionTime || 0,
  };
}

const normalizeOutput = (output: string): string => {
  if (!output) return '';
  try {
    if (output.trim().startsWith('{') && (output.includes('"html"') || output.includes('"css"') || output.includes('"js"'))) {
      const parsed = JSON.parse(output);
      const html = parsed.html ? normalizeCodeString(parsed.html) : '';
      const css = parsed.css ? normalizeCodeString(parsed.css) : '';
      const js = parsed.js ? normalizeCodeString(parsed.js) : '';
      return JSON.stringify({ html, css, js });
    }
  } catch { }
  return normalizeCodeString(output);
};

const normalizeCodeString = (str: string): string => {
  if (!str) return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n').trim();
};

worker.on('failed', (job, err) => {
  logger.error(`[Queue] Job ${job?.id} failed: ${err.message}`);
});
worker.on('completed', (job) => {
  logger.info(`[Queue] Job ${job.id} completed in ${job.finishedOn! - job.processedOn!}ms`);
});

export const getQueueStats = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
};

export const shutdownQueue = async () => {
  await worker.close();
  await queue.close();
};
