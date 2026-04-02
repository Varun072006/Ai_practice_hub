import axios from 'axios';
import logger from '../config/logger';
import { normalizeExecutionInput } from './inputNormalizer';
import { getNextHost, reportSuccess, reportFailure, getAllHosts } from './pistonLoadBalancer';

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

// Map from generic language names to Piston language/version
const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
  python:     { language: 'python', version: '3.10.0' },
  javascript: { language: 'node',   version: '18.15.0' },
  c:          { language: 'c',      version: '10.2.0' },
  cpp:        { language: 'c++',    version: '10.2.0' },
  java:       { language: 'java',   version: '15.0.2' },
};

// Dynamic map populated directly from the Piston cluster API
const RUNTIME_MAP: Record<string, { language: string; version: string }> = {};

const MAX_OUTPUT_SIZE = 64 * 1024; // 64KB Output limit to protect backend

export const executeCode = async (
  code: string,
  language: string,
  input?: string,
  _files?: { name: string; content: string }[],
  pistonHost?: string
): Promise<ExecutionResult> => {
  const lang = getPistonLanguage(language);
  if (!lang) {
    return { success: false, error: `Unsupported language: ${language}` };
  }

  const submissionData = {
    language: lang.language,
    version: lang.version,
    files: [{ content: code && code.trim() ? code : '# empty' }],
    stdin: normalizeExecutionInput(input) ?? '',
    run_timeout: 5000,
    compile_timeout: 10000,
    memory_limit: 134217728,
  };

const maxAttempts = pistonHost ? 1 : getAllHosts().length;
  let lastErrorMsg = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const host = pistonHost || getNextHost();
    try {
      logger.debug(`[CodeExecutor] Submitting to Piston at ${host} (Attempt ${attempt}/${maxAttempts})`);

      const response = await axios.post(
        `${host}/api/v2/execute`,
        submissionData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
        }
      );

      const { run, compile } = response.data;
      reportSuccess(host);

      if (compile && compile.code !== 0 && compile.code !== null) {
        return {
          success: false,
          error: `Compilation Error: \n${truncateOutput(compile.stderr || compile.output || 'Compilation failed')}`,
          executionTime: 0,
        };
      }

      let stdout = run?.stdout || '';
      const stderr = run?.stderr || '';
      const exitCode = run?.code;
      const signal = run?.signal;

      stdout = truncateOutput(stdout);
      const isSuccess = exitCode === 0 && !signal;

      let error: string | undefined;
      if (!isSuccess) {
        if (signal === 'SIGKILL') {
          error = 'Time Limit Exceeded: Your code took too long to run.';
        } else if (signal === 'SIGSEGV') {
          error = 'Runtime Error: Segmentation fault.';
        } else if (signal) {
          error = `Runtime Error: Process killed by signal ${signal}.`;
        } else if (stderr) {
          error = stderr;
        } else if (run?.message) {
          error = run.message;
        } else {
          error = `Runtime Error: Process exited with code ${exitCode}.`;
        }
        error = truncateOutput(error || '');
      }

      return {
        success: isSuccess,
        output: stdout,
        error,
        executionTime: 0,
      };
    } catch (err: any) {
      reportFailure(host);
      lastErrorMsg = err.message;

      const isNetworkError = err.code === 'ECONNABORTED' || err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND' || err.message?.includes('timeout') || err.message?.includes('network');
      
      logger.warn(`[CodeExecutor] Piston error on ${host} (Attempt ${attempt}): ${err.message}`);
      
      // If it's the last attempt or not a network/connection error, break and fail
      if (attempt === maxAttempts || (!isNetworkError && !err.response?.status.toString().startsWith('5'))) {
        break;
      }
      // Otherwise, loop will retry with getNextHost()
    }
  }

  if (lastErrorMsg.includes('timeout') || lastErrorMsg.includes('ECONNABORTED')) {
    return { success: false, error: 'Execution Timed Out: The execution cluster did not respond in time.' };
  }
  return { success: false, error: `Execution Service Error: Cluster unavailable (${lastErrorMsg})` };
};

function truncateOutput(text: string): string {
  if (!text) return '';
  if (text.length > MAX_OUTPUT_SIZE) {
    return text.slice(0, MAX_OUTPUT_SIZE) + '\n[Output truncated — exceeded 64KB]';
  }
  return text;
}

function getPistonLanguage(language: string): { language: string; version: string } | null {
  const lang = language.toLowerCase().trim();

  // Try dynamic map first
  if (RUNTIME_MAP[lang]) return RUNTIME_MAP[lang];

  // Aliases fallback
  if (lang === 'js' || lang.includes('node')) return PISTON_LANGUAGES['javascript'] || null;
  if (lang.includes('py')) return PISTON_LANGUAGES['python'] || null;
  if (lang === 'c++') return PISTON_LANGUAGES['cpp'] || null;

  return PISTON_LANGUAGES[lang] || null;
}

export const initializePistonLanguages = async (): Promise<void> => {
  const host = getNextHost();
  try {
    logger.info(`[CodeExecutor] Checking installed packages on Piston at ${host}...`);
    const packagesResponse = await axios.get(`${host}/api/v2/packages`, { timeout: 10000 });
    const installedPackages = packagesResponse.data;

    const installedLookup = new Set(
      installedPackages.map((pkg: any) => `${pkg.language}-${pkg.version}`)
    );

    const toInstall = Object.values(PISTON_LANGUAGES).filter(
      (lang) => !installedLookup.has(`${lang.language}-${lang.version}`)
    );

    // Dynamic Installation of missing runtimes
    for (const lang of toInstall) {
      logger.info(`[Piston] Installing missing language: ${lang.language} ${lang.version}...`);
      try {
        await axios.post(`${host}/api/v2/packages`, {
          language: lang.language,
          version: lang.version,
        }, { timeout: 120000 }); 
        logger.info(`[Piston] Successfully installed ${lang.language} ${lang.version}`);
      } catch (err: any) {
        logger.error(`[Piston] Failed to install ${lang.language} ${lang.version}: ${err.message}`);
        throw err;
      }
    }

    // Populate Runtime Map
    const response = await axios.get(`${host}/api/v2/runtimes`, { timeout: 5000 });
    const runtimes = response.data;

    if (Array.isArray(runtimes)) {
      for (const rt of runtimes) {
        const name = rt.language?.toLowerCase();
        if (!name) continue;

        if (name.includes('python')) RUNTIME_MAP['python'] = { language: rt.language, version: rt.version };
        if (name === 'node' || name.includes('javascript')) RUNTIME_MAP['javascript'] = { language: rt.language, version: rt.version };
        if (name === 'java') RUNTIME_MAP['java'] = { language: rt.language, version: rt.version };
        if (name === 'c' && !name.includes('c++')) RUNTIME_MAP['c'] = { language: rt.language, version: rt.version };
        if (name === 'c++') RUNTIME_MAP['cpp'] = { language: rt.language, version: rt.version };
      }
      logger.info(`[CodeExecutor] Piston Runtime Map initialized.`);
    }
  } catch (err: any) {
    logger.error(`[CodeExecutor] Failed to initialize Piston languages: ${err.message}`);
    throw err;
  }
};

export async function warmupPiston(): Promise<void> {
  const hosts = getAllHosts();
  const warmupCode: Record<string, string> = {
    python: 'print(1)',
    javascript: 'console.log(1)',
    c: '#include<stdio.h>\nint main(){printf("1");return 0;}',
    cpp: '#include<iostream>\nint main(){std::cout<<1;return 0;}',
    java: 'public class Main{public static void main(String[]a){System.out.print(1);}}',
  };

  logger.info(`[Warmup] Starting Piston cold-start warmup on ${hosts.length} host(s)...`);

  for (const host of hosts) {
    for (const [langKey, code] of Object.entries(warmupCode)) {
      const lang = PISTON_LANGUAGES[langKey];
      if (!lang) continue;
      try {
        await axios.post(`${host}/api/v2/execute`, {
          language: lang.language,
          version: lang.version,
          files: [{ content: code }],
          run_timeout: 5000,
        }, { timeout: 10000 });
      } catch {
        // Best effort
      }
    }
  }

  logger.info('[Warmup] Piston warmup complete.');
}

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
