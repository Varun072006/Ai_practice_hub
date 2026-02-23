import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { normalizeExecutionInput } from './inputNormalizer';

interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
}

<<<<<<< HEAD
// Configuration for Judge0 API (Internal Docker Service)
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://judge0-server:2358';

=======
>>>>>>> 1c38e9fa66f1cb512045609d06b48f07a9104762
export const executeCode = async (
    code: string,
    language: string,
    input?: string,
    files?: { name: string, content: string }[]
): Promise<ExecutionResult> => {
    try {
        let result: ExecutionResult;

<<<<<<< HEAD
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
=======
        if (language.toLowerCase() === 'python') {
            result = await executePythonCode(code, input);
        } else if (language.toLowerCase() === 'c') {
            result = await executeCCode(code, input);
        } else if (language.toLowerCase() === 'html') {
            // For HTML, "execution" just means returning the code so it can be compared
            // The frontend handles visual rendering
            result = {
                success: true,
                output: code,
                executionTime: 0,
            };
        } else {
            return {
                success: false,
                error: `Unsupported language: ${language}`,
            };
        }

        return result;
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Execution failed',
        };
    }
};

const executePythonCode = async (code: string, input?: string): Promise<ExecutionResult> => {
    const scriptName = `script_${uuidv4()}.py`;
    const scriptPath = path.join(os.tmpdir(), scriptName);
    const EXECUTION_TIMEOUT = 10000; // 10 seconds timeout

    try {
        await fs.writeFile(scriptPath, code);

        return new Promise((resolve) => {
            const startTime = Date.now();
            const pythonProcess = spawn('python', [scriptPath]);

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            // Set timeout to kill process if it takes too long
            const timeout = setTimeout(() => {
                if (!isResolved && pythonProcess && !pythonProcess.killed) {
                    pythonProcess.kill('SIGKILL');
                    isResolved = true;
                    const executionTime = Date.now() - startTime;

                    // Cleanup
                    fs.unlink(scriptPath).catch(() => { });

                    resolve({
                        success: false,
                        error: 'Time Limit Exceeded: Code execution exceeded 10 seconds',
                        output: stdout.replace(/\r\n/g, '\n'),
                        executionTime,
                    });
                }
            }, EXECUTION_TIMEOUT);

            // Handle input - normalize escaped characters before execution
            if (input) {
                const normalizedInput = normalizeExecutionInput(input);
                pythonProcess.stdin.write(normalizedInput);
                pythonProcess.stdin.end();
            }

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', async (code) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                const executionTime = Date.now() - startTime;

                // Cleanup
                try {
                    await fs.unlink(scriptPath);
                } catch (e) {
                    // Ignore cleanup error
                }

                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout.replace(/\r\n/g, '\n'),
                        executionTime,
                    });
                } else {
                    resolve({
                        success: false,
                        // If stderr is empty, use stdout (some errors go to stdout) or generic message
                        error: stderr || stdout || 'Process exited with error',
                        output: stdout.replace(/\r\n/g, '\n'), // Return stdout even on error (partial output)
                        executionTime,
                    });
                }
            });

            pythonProcess.on('error', (err) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                fs.unlink(scriptPath).catch(() => { });

                resolve({
                    success: false,
                    error: `Failed to spawn python: ${err.message}`,
                });
            });
        });
    } catch (error: any) {
        return {
            success: false,
            error: `Internal Error: ${error.message}`,
        };
    }
};

const executeCCode = async (code: string, input?: string): Promise<ExecutionResult> => {
    const id = uuidv4();
    const sourceFile = path.join(os.tmpdir(), `${id}.c`);
    const outputFile = path.join(os.tmpdir(), `${id}.exe`);

    try {
        // Write source code
        await fs.writeFile(sourceFile, code);

        // Compile
        await new Promise<void>((resolve, reject) => {
            const gcc = spawn('gcc', [sourceFile, '-o', outputFile]);
            let stderr = '';

            gcc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            gcc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Compilation Error:\n${stderr}`));
                }
            });

            gcc.on('error', (err) => {
                reject(new Error(`Failed to run GCC. Is it installed? ${err.message}`));
            });
        });

        // Run the compiled executable
        const EXECUTION_TIMEOUT = 10000; // 10 seconds timeout

        return new Promise((resolve) => {
            const startTime = Date.now();
            const process = spawn(outputFile);

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            // Set timeout to kill process if it takes too long
            const timeout = setTimeout(() => {
                if (!isResolved && process && !process.killed) {
                    process.kill('SIGKILL');
                    isResolved = true;
                    const executionTime = Date.now() - startTime;

                    // Cleanup files
                    fs.unlink(sourceFile).catch(() => { });
                    fs.unlink(outputFile).catch(() => { });

                    resolve({
                        success: false,
                        error: 'Time Limit Exceeded: Code execution exceeded 10 seconds',
                        output: stdout.replace(/\r\n/g, '\n'),
                        executionTime,
                    });
                }
            }, EXECUTION_TIMEOUT);

            // Normalize escaped characters before execution
            if (input) {
                const normalizedInput = normalizeExecutionInput(input);
                process.stdin.write(normalizedInput);
                process.stdin.end();
            }

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', async (code) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                const executionTime = Date.now() - startTime;

                // Cleanup files
                try {
                    await fs.unlink(sourceFile);
                    await fs.unlink(outputFile);
                } catch (e) { /* ignore */ }

                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout.replace(/\r\n/g, '\n'),
                        executionTime,
                    });
                } else {
                    resolve({
                        success: false,
                        error: stderr || stdout || 'Runtime Error',
                        output: stdout.replace(/\r\n/g, '\n'),
                        executionTime,
                    });
                }
            });

            process.on('error', (err) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                fs.unlink(sourceFile).catch(() => { });
                fs.unlink(outputFile).catch(() => { });

                resolve({
                    success: false,
                    error: `Execution failed: ${err.message}`,
                });
            });
        });

    } catch (error: any) {
        // Cleanup source file if compilation failed
        try {
            await fs.unlink(sourceFile);
        } catch (e) { /* ignore */ }

        return {
            success: false,
            error: error.message || 'Compilation/Execution failed',
        };
    }
};

export const validateLanguage = (courseName: string, language: string): boolean => {
    // Normalize keys to lowercase for case-insensitive lookup
    const courseLanguageMap: { [key: string]: string } = {
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
>>>>>>> 1c38e9fa66f1cb512045609d06b48f07a9104762
};
