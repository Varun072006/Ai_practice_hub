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
const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

export const executeCode = async (
  code: string,
  language: string,
  input: string
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

    // Call Piston API
    const response = await axios.post(`${PISTON_API_URL}/execute`, {
      language: pistonLanguage.language,
      version: pistonLanguage.version,
      files: [
        {
          content: code
        }
      ],
      stdin: normalizeExecutionInput(input),
      run_timeout: 5000,
      compile_timeout: 5000
    });

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
    // Piston returns code 0 for success, others for error/timeout/signal
    if (run.code === 0) {
      return {
        success: true,
        output: run.stdout,
        executionTime: 0 // Piston doesn't always return precise exec time in simple view, assume fast enough or parse if needed
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
    logger.error(`[CodeExecutor] Piston API Verification Error: ${error.message}`);
    return {
      success: false,
      error: `Execution Service Error: ${error.message || 'Remote sandbox unavailable'}`,
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
  };

  const normalizedCourseName = courseName.toLowerCase().trim();

  // Flexible matching for HTML/CSS courses
  if (normalizedCourseName.includes('html') || normalizedCourseName.includes('css') || normalizedCourseName.includes('web')) {
    return language.toLowerCase() === 'html';
  }

  const expectedLanguage = courseLanguageMap[normalizedCourseName];

  if (!expectedLanguage) {
    // Fallback: Default to python for unknown courses if not C
    return false;
  }

  return language.toLowerCase() === expectedLanguage.toLowerCase();
};
