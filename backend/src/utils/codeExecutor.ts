import axios from 'axios';
import { normalizeExecutionInput } from './inputNormalizer';
import logger from '../config/logger';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

// Configuration for Piston API
// In production, this should be an environment variable pointing to a self-hosted instance
// Configuration for Piston API
// In production, this should be an environment variable pointing to a self-hosted instance
const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const PISTON_API_KEY = process.env.PISTON_API_KEY;

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

    // Map internal language names to Piston runtimes
    const pistonLanguage = getPistonLanguage(language);
    if (!pistonLanguage) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    // Retry logic for Piston API (handling 429 Rate Limits)
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const headers: any = {};
        if (PISTON_API_KEY) {
          headers['Authorization'] = PISTON_API_KEY;
          headers['x-api-key'] = PISTON_API_KEY; // Some instances use this
        }

        // Call Piston API
        const response = await axios.post(`${PISTON_API_URL}/execute`, {
          language: pistonLanguage.language,
          version: pistonLanguage.version,
          files: files && files.length > 0 ? files : [
            {
              content: code
            }
          ],
          stdin: normalizeExecutionInput(input),
          run_timeout: 5000,
          compile_timeout: 5000
        }, { headers });

        const { run, compile } = response.data;

        // Check for compilation errors first (if applicable)
        if (compile && compile.code !== 0) {
          return {
            success: false,
            error: compile.stderr || compile.output || 'Compilation Error',
            output: compile.stdout, // Sometimes partial output exists
            executionTime: 0
          };
        }

        // Check runtime result
        if (run.code === 0) {
          return {
            success: true,
            output: run.stdout,
            executionTime: 0
          };
        } else {
          return {
            success: false,
            error: run.stderr || run.stdout || (run.signal ? `Process terminated by signal: ${run.signal}` : 'Runtime Error'),
            output: run.stdout,
            executionTime: 0
          };
        }

      } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isUnauthorized = error.response?.status === 401;

        if (isRateLimit && attempts < maxAttempts) {
          logger.warn(`[CodeExecutor] Piston 429 Rate Limit. Retrying attempt ${attempts}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Backoff: 1s, 2s
          continue;
        }

        if (error.response?.status === 400) {
          logger.error(`[CodeExecutor] Piston API Bad Request (400). Response: ${JSON.stringify(error.response.data)}`);
        }

        if (isUnauthorized) {
          logger.error(`[CodeExecutor] Piston API Unauthorized (401). URL: ${PISTON_API_URL}. Check PISTON_API_KEY.`);
        }

        logger.error(`[CodeExecutor] Piston API Verification Error: ${error.message} (URL: ${PISTON_API_URL})`);
        return {
          success: false,
          error: `Execution Service Error: ${error.message || 'Remote sandbox unavailable'}`,
        };
      }
    }

    return {
      success: false,
      error: 'Execution Service Error: Rate limit exceeded after retries',
    };
  } catch (error: any) {
    logger.error(`[CodeExecutor] Top-level Error: ${error.message}`);
    return {
      success: false,
      error: `Execution Service Error: ${error.message}`,
    };
  }
};

/**
 * Helper to map internal language keys to Piston language/version pairs
 */
const getPistonLanguage = (language: string): { language: string, version: string } | null => {
  const lang = language.toLowerCase();
  if (lang === 'python') return { language: 'python', version: '3.10.0' };
  if (lang === 'c') return { language: 'c', version: '10.2.0' }; // GCC
  if (lang === 'javascript' || lang === 'js' || lang === 'nodejs') return { language: 'javascript', version: '18.15.0' };
  // Add more as needed
  return null;
};

// Kept for compatibility but now just a wrapper for the mapping check
export const validateLanguage = (courseName: string, language: string): boolean => {
  // Normalize keys to lowercase for case-insensitive lookup
  const courseLanguageMap: Record<string, string> = {
    'python': 'python',
    'c programming': 'c',
    'machine learning': 'python',
    'data science': 'python',
    'fundamentals of data science': 'python',
    'deep learning': 'python',
    'cloud computing': 'python',
    'artificial intelligence': 'python',
    'html/css': 'html',
    'web development': 'html',
    'frontend development': 'html',
    'javascript': 'javascript',
    'js': 'javascript',
  };

  const normalizedCourseName = courseName.toLowerCase().trim();

  // Flexible matching for HTML/CSS courses
  if (normalizedCourseName.includes('html') || normalizedCourseName.includes('css') || normalizedCourseName.includes('web')) {
    // If specifically asking for JS execution (e.g. running scripts), allow it
    if (language.toLowerCase() === 'javascript') return true;
    return language.toLowerCase() === 'html';
  }

  // Flexible matching for JavaScript courses
  if (normalizedCourseName.includes('javascript') || normalizedCourseName.includes('js')) {
    return language.toLowerCase() === 'javascript';
  }

  const expectedLanguage = courseLanguageMap[normalizedCourseName];

  if (!expectedLanguage) {
    // Fallback: Default to python for unknown courses if not C
    // BUT check if requested language is valid first
    if (language.toLowerCase() === 'javascript') return true;
    return language.toLowerCase() === 'python';
  }

  return language.toLowerCase() === expectedLanguage.toLowerCase();
};
