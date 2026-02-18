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

export const executeCode = async (
    code: string,
    language: string,
    input?: string,
    files?: { name: string, content: string }[]
): Promise<ExecutionResult> => {
    try {
        let result: ExecutionResult;

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
};
