import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { normalizeExecutionInput } from './inputNormalizer';

interface ExecutionResult {
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
    input?: string,
    files?: { name: string, content: string }[]
): Promise<ExecutionResult> => {
    try {
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
        const submissionData = {
            source_code: code,
            language_id: languageId,
            stdin: normalizeExecutionInput(input),
            cpu_time_limit: 20.0,
            wall_time_limit: 40.0,
            memory_limit: 3072000,
        };

        logger.info(`[CodeExecutor] Submitting code to Judge0 (Language ID: ${languageId})...`);

        const submitResponse = await axios.post(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, submissionData, { headers });
        const token = submitResponse.data.token;

        if (!token) {
            throw new Error('No submission token received from Judge0');
        }

        // Step 2: Poll for Result
        logger.info(`[CodeExecutor] Polling result for token: ${token}...`);

        let executionResult = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));

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

                if (statusId >= 3) {
                    executionResult = pollResponse.data;
                    break;
                }
            } catch (pollError: any) {
                logger.error(`[CodeExecutor] Polling request failed for token ${token}: ${pollError.message}`);
            }
        }

        if (!executionResult) {
            return {
                success: false,
                error: 'Execution Timed Out or Service Unresponsive',
                executionTime: 0
            };
        }

        const isSuccess = executionResult.status?.id === 3;
        const output = executionResult.stdout || '';
        const errorOutput = executionResult.stderr || executionResult.compile_output || (executionResult.status?.description && executionResult.status.id !== 3 ? executionResult.status.description : '');

        return {
            success: isSuccess,
            output: output,
            error: isSuccess ? undefined : errorOutput,
            executionTime: parseFloat(executionResult.time || '0'),
        };

    } catch (error: any) {
        logger.error(`[CodeExecutor] Judge0 Execution Error: ${error.message}`);
        return {
            success: false,
            error: `Execution Service Error: ${error.message}`,
        };
    }
};

// Dynamic Language Map
const LANGUAGE_MAP: Record<string, number> = {};

export const initializeJudge0Languages = async () => {
    try {
        logger.info('[CodeExecutor] Fetching available languages from Judge0...');
        const response = await axios.get(`${JUDGE0_API_URL}/languages`);
        const languages = response.data;

        if (Array.isArray(languages)) {
            languages.forEach((lang: any) => {
                const name = lang.name.toLowerCase();
                if (name.includes('python')) LANGUAGE_MAP['python'] = lang.id;
                if (name.includes('javascript') || name.includes('node')) LANGUAGE_MAP['javascript'] = lang.id;
                if (name.includes('java') && !name.includes('script')) LANGUAGE_MAP['java'] = lang.id;
                if (name === 'c' || name.startsWith('c ')) LANGUAGE_MAP['c'] = lang.id;
                if (name === 'cpp' || name.startsWith('c++ ')) LANGUAGE_MAP['cpp'] = lang.id;
            });
            logger.info(`[CodeExecutor] Judge0 Language Map initialized: ${JSON.stringify(LANGUAGE_MAP)}`);
        }
    } catch (error: any) {
        logger.error(`[CodeExecutor] Failed to initialize Judge0 languages: ${error.message}`);
    }
};

const getJudge0LanguageId = (language: string): number | null => {
    const lang = language.toLowerCase();
    if (LANGUAGE_MAP[lang]) return LANGUAGE_MAP[lang];
    if (lang === 'js' && LANGUAGE_MAP['javascript']) return LANGUAGE_MAP['javascript'];
    if (lang.includes('node') && LANGUAGE_MAP['javascript']) return LANGUAGE_MAP['javascript'];
    if (lang.includes('py') && LANGUAGE_MAP['python']) return LANGUAGE_MAP['python'];

    if (lang === 'python' || lang.includes('python')) return 71;
    if (lang === 'javascript' || lang === 'js' || lang.includes('node')) return 63;
    if (lang === 'c') return 50;
    if (lang === 'cpp' || lang === 'c++') return 54;
    if (lang === 'java') return 62;

    return null;
};

export const validateLanguage = (courseName: string, language: string): boolean => {
    const normalizedCourseName = courseName.toLowerCase().trim();
    if (normalizedCourseName.includes('html') || normalizedCourseName.includes('css') || normalizedCourseName.includes('web')) {
        if (language.toLowerCase() === 'javascript') return true;
        return language.toLowerCase() === 'html';
    }
    if (normalizedCourseName.includes('javascript') || normalizedCourseName.includes('js')) {
        return language.toLowerCase() === 'javascript';
    }
    return true;
};
