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

// Helper to dynamically get Judge0 URL to avoid dotenv loading order issues
const getJudge0ApiUrl = () => process.env.JUDGE0_API_URL || 'http://judge0-server:2358';

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

        // Submission data with tight, production-safe limits
        const submissionData = {
            source_code: code,
            language_id: languageId,
            stdin: normalizeExecutionInput(input),
            cpu_time_limit: 5.0,       // 5 seconds CPU (plenty for student code)
            wall_time_limit: 15.0,     // 15 seconds wall clock
            memory_limit: 256000,      // 256 MB (aligned with worker MAX)
        };

        logger.info(`[CodeExecutor] Submitting code to Judge0 (Language ID: ${languageId})...`);

        // Try synchronous mode first (wait=true) — Judge0 returns result directly
        try {
            const syncResponse = await axios.post(
                `${getJudge0ApiUrl()}/submissions?base64_encoded=false&wait=true`,
                submissionData,
                { headers, timeout: 30000 }  // 30s axios timeout (Judge0 sync mode)
            );

            const result = syncResponse.data;
            const statusId = result.status?.id;

            if (statusId && statusId >= 3) {
                logger.info(`[CodeExecutor] Sync result: Status ${statusId} (${result.status?.description})`);
                const isSuccess = statusId === 3;
                return {
                    success: isSuccess,
                    output: result.stdout || '',
                    error: isSuccess ? undefined : (result.stderr || result.compile_output || result.status?.description || ''),
                    executionTime: parseFloat(result.time || '0'),
                };
            }

            // If status < 3 (still processing), fall through to polling with the token
            if (result.token) {
                return await pollForResult(result.token, headers);
            }
        } catch (syncError: any) {
            // Sync mode timed out or failed — fall back to async submission + polling
            logger.warn(`[CodeExecutor] Sync mode failed (${syncError.message}), falling back to async...`);
        }

        // Fallback: Async submission + polling
        const submitResponse = await axios.post(
            `${getJudge0ApiUrl()}/submissions?base64_encoded=false&wait=false`,
            submissionData,
            { headers, timeout: 10000 }
        );
        const token = submitResponse.data.token;

        if (!token) {
            throw new Error('No submission token received from Judge0');
        }

        return await pollForResult(token, headers);

    } catch (error: any) {
        logger.error(`[CodeExecutor] Judge0 Execution Error: ${error.message}`);
        return {
            success: false,
            error: `Execution Service Error: ${error.message}`,
        };
    }
};

// Polling fallback with shorter interval and fewer attempts
const pollForResult = async (token: string, headers: Record<string, string>): Promise<ExecutionResult> => {
    logger.info(`[CodeExecutor] Polling result for token: ${token}...`);

    let executionResult = null;
    const maxAttempts = 20;    // 20 attempts max (was 120)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));  // 1s interval (was 500ms)

        try {
            const pollResponse = await axios.get(
                `${getJudge0ApiUrl()}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,status,compile_output,time`,
                { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 5000 }
            );

            const statusId = pollResponse.data.status?.id;
            if (statusId) {
                logger.info(`[CodeExecutor] Poll ${attempt + 1}: Status ${statusId} (${pollResponse.data.status?.description})`);
            }

            if (statusId >= 3) {
                executionResult = pollResponse.data;
                break;
            }
        } catch (pollError: any) {
            logger.error(`[CodeExecutor] Poll failed for token ${token}: ${pollError.message}`);
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
};


// Dynamic Language Map
const LANGUAGE_MAP: Record<string, number> = {};

export const initializeJudge0Languages = async () => {
    try {
        logger.info('[CodeExecutor] Fetching available languages from Judge0...');
        const response = await axios.get(`${getJudge0ApiUrl()}/languages`);
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
