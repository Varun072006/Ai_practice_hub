import { executeCode, validateLanguage } from '../utils/codeExecutor';
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
  courseName: string
): Promise<TestCaseResult[]> => {
  // Validate language
  if (!validateLanguage(courseName, language)) {
    throw new Error(`Invalid language for ${courseName} course. Expected: ${courseName === 'Python' ? 'python' : 'c'}`);
  }

  // Execute test cases with limited concurrency (max 2 at a time)
  // This prevents flooding Judge0's worker queue while staying fast
  const MAX_CONCURRENCY = 2;

  const executeOne = async (testCase: { id: string; input_data: string; expected_output: string }): Promise<TestCaseResult> => {
    try {
      const startTime = Date.now();

      // Execute code with test case input (with timeout handled by Judge0 config)
      const executionResult = await executeCode(code, language, testCase.input_data);
      const executionTime = Date.now() - startTime;

      // If there's an error, test case fails
      if (executionResult.error) {
        return {
          test_case_id: testCase.id,
          passed: false,
          expected_output: testCase.expected_output,
          actual_output: executionResult.output || '',
          error_message: executionResult.error,
          execution_time: executionTime,
        };
      }

      // Normalize outputs for comparison
      const expectedOutput = normalizeOutput(testCase.expected_output);
      const actualOutput = normalizeOutput(executionResult.output || '');

      // Strict comparison - must match exactly after normalization
      const passed = expectedOutput === actualOutput;

      return {
        test_case_id: testCase.id,
        passed,
        expected_output: testCase.expected_output,
        actual_output: executionResult.output || '',
        error_message: undefined,
        execution_time: executionTime,
      };
    } catch (error: any) {
      return {
        test_case_id: testCase.id,
        passed: false,
        expected_output: testCase.expected_output,
        actual_output: '',
        error_message: error.message || 'Execution error',
      };
    }
  };

  const results = await runWithConcurrency(testCases, executeOne, MAX_CONCURRENCY);
  return results;
};

// Run async tasks with a concurrency limit
async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}


const normalizeOutput = (output: string): string => {
  if (!output) return '';

  // Try to parse as JSON first (for HTML/CSS submissions)
  try {
    // Only attempt if it looks like a JSON object containing code structure
    if (output.trim().startsWith('{') && (output.includes('"html"') || output.includes('"css"') || output.includes('"js"'))) {
      const parsed = JSON.parse(output);
      // Normalize each component
      const html = parsed.html ? normalizeCodeString(parsed.html) : '';
      const css = parsed.css ? normalizeCodeString(parsed.css) : '';
      const js = parsed.js ? normalizeCodeString(parsed.js) : '';

      // Return a standard combined string for comparison
      return JSON.stringify({ html, css, js });
    }
  } catch (e) {
    // Not valid JSON or strictly structured, fall back to normal string normalization
  }

  return normalizeCodeString(output);
};

const normalizeCodeString = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim()) // Trim both ends to ignore indentation differences
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n')
    .trim();
};



