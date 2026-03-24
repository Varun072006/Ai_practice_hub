import { executeCode, validateLanguage } from '../utils/codeExecutor';
import { addEvaluationJob, waitForJob, ExecutionJobData, ExecutionJobResult } from './codeExecutionQueue';
import logger from '../config/logger';

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  expected_output: string;
  actual_output: string;
  error_message?: string;
  execution_time?: number;
}

export const evaluateCode = async (
  code: string,
  language: string,
  testCases: Array<{ id: string; input_data: string; expected_output: string }>,
  courseName: string,
  priority: 'submit' | 'run' = 'submit'
): Promise<TestCaseResult[]> => {
  if (!validateLanguage(courseName, language)) {
    throw new Error(`Invalid language for ${courseName} course.`);
  }

  if (testCases.length === 0) return [];

  try {
    const jobData: ExecutionJobData = { code, language, testCases, courseName, priority };
    logger.info(`[CodeExecution] Submitting job with ${testCases.length} test cases (Priority: ${priority})`);

    const job = await addEvaluationJob(jobData);
    const results = await waitForJob<ExecutionJobResult[]>(job);
    return results;
  } catch (error: any) {
    logger.error(`[CodeExecution] Queue evaluation failed: ${error.message}`);
    throw error;
  }
};



