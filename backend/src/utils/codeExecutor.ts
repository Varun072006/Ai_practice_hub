import axios from 'axios';
import { normalizeExecutionInput } from './inputNormalizer';
import logger from '../config/logger';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

// Configuration for Judge0 API (Internal Docker Service)
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://judge0-server:2358';

export const executeCode = async (
  code: string,
  language: string,
  input: string,
  files?: { name: string, content: string }[]
): Promise<ExecutionResult> => {
  try {
    // HTML/CSS is rendered on client-side, no execution needed
    if (language.toLowerCase() === 'html') {
      return {
        success: true,
        output: code,
        executionTime: 0
      };
    }

    // Map internal language names to Judge0 language IDs
    const languageId = getJudge0LanguageId(language);
    if (!languageId) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    // Prepare headers for Internal Judge0
    const headers = {
      'content-type': 'application/json',
    };

    // Step 1: Submit Code
    // Judge0 CE supports 'source_code' and 'language_id'.
    // For input, use 'stdin'.
    const submissionData = {
      source_code: code,
      language_id: languageId,
      stdin: normalizeExecutionInput(input),
      cpu_time_limit: 20.0,   // Further increase for Node.js on WSL2
      wall_time_limit: 40.0,  // Further increase for Node.js on WSL2
      memory_limit: 3072000,  // Further increase address space for Node.js V8
    };

    logger.info(`[CodeExecutor] Submitting code to Judge0 (Language ID: ${languageId})...`);

    const submitResponse = await axios.post(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, submissionData, { headers });
    const token = submitResponse.data.token;

    if (!token) {
      throw new Error('No submission token received from Judge0');
    }

    // Step 2: Poll for Result
    logger.info(`[CodeExecutor] Polling result for token: ${token}...`);

    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 60 seconds (to match increased limits)

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const pollResponse = await axios.get(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,status,compile_output,time`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const statusId = pollResponse.data.status?.id;

        if (statusId) {
          logger.info(`[CodeExecutor] Submission Status ID: ${statusId} (${pollResponse.data.status?.description})`);
        }

        // Status IDs: 1 (In Queue), 2 (Processing), 3 (Accepted), >3 (Error/Wrong Answer etc.)
        if (statusId >= 3) {
          result = pollResponse.data;
          break;
        }
      } catch (pollError: any) {
        logger.error(`[CodeExecutor] Polling request failed for token ${token}: ${pollError.message}`);
        if (pollError.response) {
          logger.error(`[CodeExecutor] Poll Error Response Data: ${JSON.stringify(pollError.response.data)}`);
        }
      }
    }

    if (!result) {
      return {
        success: false,
        error: 'Execution Timed Out or Service Unresponsive',
        executionTime: 0
      };
    }

    // Process Result
    // Status ID 3 means Accepted (Success)
    const isSuccess = result.status?.id === 3;
    const output = result.stdout || '';
    const errorOutput = result.stderr || result.compile_output || (result.status?.description && result.status.id !== 3 ? result.status.description : '');

    return {
      success: isSuccess,
      output: output,
      error: isSuccess ? undefined : errorOutput,
      executionTime: parseFloat(result.time || '0'),
    };

  } catch (error: any) {
    logger.error(`[CodeExecutor] Judge0 Execution Error: ${error.message}`);
    if (error.response) {
      logger.error(`[CodeExecutor] Response Data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      error: `Execution Service Error: ${error.message}`,
    };
  }
};

// Dynamic Language Map
const LANGUAGE_MAP: Record<string, number> = {};

/**
 * Initialize Judge0 Language Map
 * Fetches available languages from Judge0 and populates the map.
 */
export const initializeJudge0Languages = async () => {
  try {
    logger.info('[CodeExecutor] Fetching available languages from Judge0...');
    const response = await axios.get(`${JUDGE0_API_URL}/languages`);
    const languages = response.data;

    if (Array.isArray(languages)) {
      languages.forEach((lang: any) => {
        const name = lang.name.toLowerCase();
        // Map common names to IDs
        if (name.includes('python')) LANGUAGE_MAP['python'] = lang.id;
        if (name.includes('javascript') || name.includes('node')) LANGUAGE_MAP['javascript'] = lang.id;
        if (name.includes('java') && !name.includes('script')) LANGUAGE_MAP['java'] = lang.id;
        if (name === 'c' || name.startsWith('c ')) LANGUAGE_MAP['c'] = lang.id;
        if (name === 'c++' || name.startsWith('c++ ')) LANGUAGE_MAP['cpp'] = lang.id;
        if (name === 'c++' || name.startsWith('c++ ')) LANGUAGE_MAP['c++'] = lang.id;
      });
      logger.info(`[CodeExecutor] Judge0 Language Map initialized: ${JSON.stringify(LANGUAGE_MAP)}`);
    }
  } catch (error: any) {
    logger.error(`[CodeExecutor] Failed to initialize Judge0 languages: ${error.message}`);
    logger.warn('[CodeExecutor] Fallback to hardcoded language IDs');
  }
};

/**
 * Helper to map internal language keys to Judge0 Language IDs
 * Uses dynamic map if available, otherwise falls back to defaults.
 */
const getJudge0LanguageId = (language: string): number | null => {
  const lang = language.toLowerCase();

  // 1. Try Dynamic Map
  if (LANGUAGE_MAP[lang]) {
    return LANGUAGE_MAP[lang];
  }

  // 2. Try partial match in Dynamic Map if direct match failed
  // (e.g. if user sends 'js' but map has 'javascript')
  if (lang === 'js' && LANGUAGE_MAP['javascript']) return LANGUAGE_MAP['javascript'];
  if (lang.includes('node') && LANGUAGE_MAP['javascript']) return LANGUAGE_MAP['javascript'];
  if (lang.includes('py') && LANGUAGE_MAP['python']) return LANGUAGE_MAP['python'];

  // 3. Fallback to hardcoded (standard Judge0 IDs)
  if (lang === 'python' || lang.includes('python')) return 71; // Python (3.8.1)
  if (lang === 'javascript' || lang === 'js' || lang.includes('node')) return 63; // JavaScript (Node.js 12.14.0)
  if (lang === 'c') return 50; // C (GCC 9.2.0)
  if (lang === 'cpp' || lang === 'c++') return 54; // C++ (GCC 9.2.0)
  if (lang === 'java') return 62; // Java (OpenJDK 13.0.1)

  return null;
};

// Kept for compatibility but matches Judge0 logic
export const validateLanguage = (courseName: string, language: string): boolean => {
  const normalizedCourseName = courseName.toLowerCase().trim();

  // HTML/CSS Validation
  if (normalizedCourseName.includes('html') || normalizedCourseName.includes('css') || normalizedCourseName.includes('web')) {
    if (language.toLowerCase() === 'javascript') return true;
    return language.toLowerCase() === 'html';
  }

  // JS Validation
  if (normalizedCourseName.includes('javascript') || normalizedCourseName.includes('js')) {
    return language.toLowerCase() === 'javascript';
  }

  // Others logic remains similar, simplified for new executor
  return true;
};
