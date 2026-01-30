// AI Tutor Service - Full Llama3 Integration
// Provides intelligent tutoring, hints, and conversational AI assistance

import logger from '../config/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TutorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TutorContext {
  questionTitle: string;
  questionDescription: string;
  userCode?: string;
  correctCode?: string;
  failedTestCases?: Array<{
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>;
  questionType: 'coding' | 'mcq';
  selectedAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  concepts?: any;
}

interface OllamaRequest {
  model: string;
  messages: TutorMessage[];
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaHealthResponse {
  isOnline: boolean;
  modelAvailable: boolean;
  modelName: string;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Ollama Core Functions
// ============================================================================

/**
 * Check if Ollama is running and the model is available
 */
export const checkOllamaHealth = async (): Promise<OllamaHealthResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { isOnline: false, modelAvailable: false, modelName: OLLAMA_MODEL, error: 'Ollama not responding' };
    }

    const data = await response.json() as { models: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) || [];
    const modelAvailable = models.some(m => m.includes(OLLAMA_MODEL.split(':')[0]));

    return {
      isOnline: true,
      modelAvailable,
      modelName: OLLAMA_MODEL,
      error: modelAvailable ? undefined : `Model '${OLLAMA_MODEL}' not found. Run: ollama pull ${OLLAMA_MODEL}`,
    };
  } catch (error: any) {
    return {
      isOnline: false,
      modelAvailable: false,
      modelName: OLLAMA_MODEL,
      error: 'Ollama is not running. Start with: ollama serve',
    };
  }
};

/**
 * Call Ollama API with retry logic
 */
const callOllama = async (request: OllamaRequest, retryCount = 0): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Ollama API Error:', errorText);
      throw new Error(`Ollama API failed: ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.message.content;
  } catch (error: any) {
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES && error.name !== 'AbortError') {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      logger.warn(`Ollama retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOllama(request, retryCount + 1);
    }

    logger.error('Ollama Connection Failed:', error.message);
    throw error;
  }
};

// ============================================================================
// System Prompts - Optimized for Llama3
// ============================================================================

const SYSTEM_PROMPTS = {
  coach: `You are an expert programming tutor and AI coach. Your goal is to help students learn programming concepts effectively.

Guidelines:
- Be encouraging, patient, and supportive
- Explain concepts clearly with examples when helpful
- For code questions, provide working code snippets
- Keep responses concise but comprehensive (2-4 paragraphs max)
- Use markdown formatting for code blocks
- If unsure, admit it rather than guessing

Focus areas: Programming fundamentals, algorithms, data structures, debugging, best practices.`,

  codingTutor: `You are a coding tutor helping a student understand their code and fix errors.

When analyzing code:
1. Identify the specific error or issue
2. Explain WHY it's happening (root cause)
3. Suggest how to fix it with a code example
4. Share a tip to prevent this in the future

Be encouraging - learning from mistakes is part of the process!`,

  mcqHelper: `You are helping a student with a multiple-choice question. Your role is to:

1. Help them understand the underlying concept
2. Guide their thinking WITHOUT giving away the answer
3. Provide hints that lead them to discover the answer themselves
4. If they're really stuck, explain the concept with analogies

Never directly reveal the correct answer. Help them learn!`,

  hintProvider: `You are providing a helpful hint for a coding or MCQ question.

Guidelines:
- Give a subtle nudge in the right direction
- Don't reveal the full answer
- Focus on the key concept they might be missing
- Be encouraging and supportive
- Keep hints brief (1-2 sentences)`,
};

// ============================================================================
// AI Tutor Functions
// ============================================================================

/**
 * Get contextual tutor response for session-based questions
 */
export const getTutorResponse = async (
  userMessage: string,
  context: TutorContext
): Promise<string> => {
  const { questionType, failedTestCases, userCode, questionTitle, questionDescription } = context;

  // Build context-aware system prompt
  let systemPrompt = questionType === 'coding' ? SYSTEM_PROMPTS.codingTutor : SYSTEM_PROMPTS.mcqHelper;

  // Add question context
  let contextInfo = `\n\nQuestion: "${questionTitle}"\nDescription: ${questionDescription}`;

  if (questionType === 'coding' && userCode) {
    contextInfo += `\n\nStudent's Code:\n\`\`\`\n${userCode}\n\`\`\``;
  }

  if (failedTestCases && failedTestCases.length > 0) {
    const tc = failedTestCases[0];
    contextInfo += `\n\nFailed Test Case:`;
    contextInfo += `\n- Input: ${tc.input}`;
    contextInfo += `\n- Expected: ${tc.expected}`;
    contextInfo += `\n- Got: ${tc.actual}`;
    if (tc.error) contextInfo += `\n- Error: ${tc.error}`;
  }

  if (context.explanation) {
    contextInfo += `\n\nHint (for your reference, don't reveal directly): ${context.explanation}`;
  }

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt + contextInfo },
      { role: 'user', content: userMessage }
    ],
    stream: false,
    options: { temperature: 0.7, num_predict: 500 }
  };

  try {
    return await callOllama(request);
  } catch (error) {
    // Fallback to smart static responses
    return getSmartFallbackResponse(userMessage, context);
  }
};

/**
 * Get initial hint for a question
 */
export const getInitialHint = async (context: TutorContext): Promise<string> => {
  const { questionTitle, questionDescription, questionType } = context;

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.hintProvider },
      {
        role: 'user',
        content: `Provide a brief, encouraging initial hint for this ${questionType} question:
        
Title: ${questionTitle}
Description: ${questionDescription}

Give a subtle hint to get them started thinking in the right direction.`
      }
    ],
    stream: false,
    options: { temperature: 0.5, num_predict: 150 }
  };

  try {
    return await callOllama(request);
  } catch (error) {
    // Fallback hints
    if (questionType === 'coding') {
      return `Let's work on "${questionTitle}" together! Start by understanding what input you'll receive and what output is expected. Break the problem into smaller steps. What's your first thought?`;
    }
    return `For this question, think about the core concept being tested. What do you already know about ${questionTitle}? Take your time to consider each option carefully.`;
  }
};

/**
 * Get response for free-form chat (AI Coach page)
 */
export const getFreeChatResponse = async (
  message: string,
  conversationHistory: TutorMessage[] = [],
  topic?: string
): Promise<string> => {
  // Build messages array with conversation history
  const messages: TutorMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.coach }
  ];

  // Add conversation history (last 10 messages for context window)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add current message
  messages.push({ role: 'user', content: message });

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.7, num_predict: 800 }
  };

  try {
    return await callOllama(request);
  } catch (error) {
    logger.error("Free chat failed:", error);
    return "I'm having trouble connecting to my AI brain right now. Please make sure Ollama is running (`ollama serve`) and try again. If the issue persists, check that llama3 model is installed (`ollama pull llama3`).";
  }
};

/**
 * Generate AI-powered hint for MCQ questions
 */
export const getMCQHint = async (
  questionTitle: string,
  questionDescription: string,
  options: string[],
  attemptCount: number
): Promise<string> => {
  // Progressive hints based on attempt count
  let hintLevel = 'subtle';
  if (attemptCount >= 3) hintLevel = 'moderate';
  if (attemptCount >= 5) hintLevel = 'detailed';

  logger.info(`[getMCQHint] Generating ${hintLevel} hint for: "${questionTitle}"`);

  const hintInstruction = {
    subtle: 'Give a very subtle hint - just a nudge in the right direction without revealing anything about the answer.',
    moderate: 'Give a moderate hint - help them understand the key concept they need to apply.',
    detailed: 'Give a more detailed hint - explain the concept clearly but still let them figure out the answer.'
  }[hintLevel];

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.hintProvider },
      {
        role: 'user',
        content: `${hintInstruction}

Question: ${questionTitle}
Description: ${questionDescription}
Options: ${options.join(', ')}

The student has attempted this ${attemptCount} time(s). Provide an appropriate hint.`
      }
    ],
    stream: false,
    options: { temperature: 0.5, num_predict: 200 }
  };

  try {
    logger.info(`[getMCQHint] Calling Ollama API...`);
    const result = await callOllama(request);
    logger.info(`[getMCQHint] Ollama returned success`);
    return result;
  } catch (error: any) {
    logger.error(`[getMCQHint] Ollama failed: ${error.message}`);
    // Fallback hints based on level
    const fallbacks = {
      subtle: 'Take a moment to re-read the question carefully. Focus on the key terms and what they mean.',
      moderate: 'Think about the core concept being tested here. Which option best aligns with that concept?',
      detailed: 'Consider eliminating options that seem obviously incorrect. Then compare the remaining options to find the most accurate answer.'
    };
    return fallbacks[hintLevel as keyof typeof fallbacks];
  }
};

/**
 * Generate AI-powered hint for coding questions
 */
export const getCodingHint = async (
  questionTitle: string,
  questionDescription: string,
  userCode: string | null,
  testCases: Array<{ input: string; expected: string }>,
  attemptCount: number,
  questionType: string = 'coding'
): Promise<string> => {
  // Progressive hints based on attempt count
  let hintLevel = 'subtle';
  if (attemptCount >= 2) hintLevel = 'moderate';
  if (attemptCount >= 4) hintLevel = 'detailed';

  const hintInstruction = {
    subtle: 'Give a very subtle hint - just a nudge about the approach without revealing the solution.',
    moderate: 'Give a moderate hint - explain the key concept or algorithm pattern they should consider.',
    detailed: 'Give a more detailed hint - provide a step-by-step approach to solving this problem, but do not write the full code.'
  }[hintLevel];

  const isHtmlCss = questionType === 'html-css-challenge' || questionType === 'html-css';

  const systemPrompt = isHtmlCss
    ? `You are an expert HTML/CSS tutor helping a student. Provide helpful hints about HTML structure, CSS styling, layout techniques (flexbox, grid), and responsive design. Never write the complete solution.`
    : SYSTEM_PROMPTS.hintProvider;

  let userPrompt = `${hintInstruction}

Question: ${questionTitle}
Description: ${questionDescription}`;

  if (testCases && testCases.length > 0) {
    userPrompt += `\n\nSample Test Case:
Input: ${testCases[0].input}
Expected Output: ${testCases[0].expected}`;
  }

  if (userCode) {
    userPrompt += `\n\nStudent's current code (if any):
\`\`\`
${userCode.slice(0, 500)}
\`\`\``;
  }

  userPrompt += `\n\nThe student has attempted this ${attemptCount} time(s). Provide an appropriate ${hintLevel} hint.`;

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: { temperature: 0.5, num_predict: 250 }
  };

  try {
    return await callOllama(request);
  } catch (error) {
    // Fallback hints based on level and type
    if (isHtmlCss) {
      const fallbacks = {
        subtle: 'Think about the HTML structure first. What elements do you need? How should they be nested?',
        moderate: 'Consider using CSS Flexbox or Grid for layout. Make sure your selectors target the right elements.',
        detailed: 'Break the design into sections: header, content, footer. Style each section separately. Use semantic HTML elements like <header>, <main>, <section>.'
      };
      return fallbacks[hintLevel as keyof typeof fallbacks];
    }

    const fallbacks = {
      subtle: 'Read the problem carefully and identify the input/output format. What data structure might be helpful?',
      moderate: 'Think about the algorithm step by step. Consider edge cases like empty input or single elements.',
      detailed: 'Break the problem into smaller parts: 1) Parse the input, 2) Process the data, 3) Format the output. Test with the sample cases first.'
    };
    return fallbacks[hintLevel as keyof typeof fallbacks];
  }
};

/**
 * Generate comprehensive performance analysis for a completed session
 */
export const generatePerformanceAnalysis = async (
  sessionType: string,
  courseTitle: string,
  levelTitle: string,
  score: number,
  questions: any[]
): Promise<{ analysis: string; suggestions: string[]; nextSteps: string }> => {

  logger.info(`[Performance Analysis] Generating analysis for ${sessionType} session. Score: ${score}%`);

  const isPass = score >= (sessionType === 'mcq' ? 60 : 70);

  // Format question data for the prompt
  const questionsContext = questions.map((q, idx) => {
    const status = q.is_correct ? 'CORRECT' : 'INCORRECT';
    let details = '';

    if (sessionType === 'mcq') {
      details = `Topic: ${q.concepts || 'General'}`;
    } else {
      details = `Topic: ${q.concepts || 'Coding'}. Time taken: ${q.time_taken || 'N/A'}s`;
    }

    return `Q${idx + 1}: ${q.title} - ${status} (${details})`;
  }).join('\n');

  const systemPrompt = `You are a supportive and expert AI coding tutor. 
Your goal is to analyze a student's practice session results and provide constructive, personalized feedback.
Analyze their performance to identify:
1. Strengths (what they understood well)
2. Weaknesses (topics they struggled with)
3. Specific actionable advice for improvement

Output your response in valid JSON format ONLY with this structure:
{
  "analysis": "A brief 2-3 sentence summary of their performance, highlighting key observations.",
  "suggestions": ["Bulleted list of 3-4 specific, actionable tips to improve based on their mistakes"],
  "nextSteps": "One clear recommendation for what to do next (e.g., specific topic to review or challenge to try)"
}`;

  const userPrompt = `Analyze this ${sessionType} practice session for the course "${courseTitle}" - ${levelTitle}.
  
result: ${isPass ? 'PASSED' : 'FAILED'}
Score: ${score}%

Question Breakdown:
${questionsContext}

Based on this data, provide a performance review.`;

  const request: OllamaRequest = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: { temperature: 0.6, num_predict: 500 } // Slightly higher temp for more natural advice
  };

  try {
    const jsonStr = await callOllama(request);

    // Attempt to parse JSON response
    try {
      // Find JSON block if wrapped in markdown
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : jsonStr;
      return JSON.parse(cleanJson);
    } catch (parseError) {
      logger.warn('[Performance Analysis] Failed to parse JSON response, falling back to raw text parsing');
      return {
        analysis: jsonStr.split('\n')[0] || "Here is your performance analysis.",
        suggestions: ["Review the questions you missed", "Practice similar problems", "Check the documentation"],
        nextSteps: "Continue practicing to improve your score."
      };
    }
  } catch (error: any) {
    logger.error(`[Performance Analysis] Service failed: ${error.message}`);
    // Fallback if AI fails
    return {
      analysis: isPass
        ? "Great job! You've demonstrated a good understanding of the core concepts."
        : "You're making progress, but there are a few areas that need more review.",
      suggestions: [
        "Review the detailed explanations for any incorrect answers",
        "Try the practice questions again to reinforce your learning",
        "Check the course materials for topics you found difficult"
      ],
      nextSteps: isPass ? "You're ready to move on to the next level!" : "Review the material and try again."
    };
  }
};

// ============================================================================
// Fallback Responses (when Ollama is unavailable)
// ============================================================================

const getSmartFallbackResponse = (userMessage: string, context: TutorContext): string => {
  const { questionType, failedTestCases, questionTitle } = context;

  // Check for common error patterns
  if (questionType === 'coding' && failedTestCases && failedTestCases.length > 0) {
    const firstFailure = failedTestCases[0];

    if (firstFailure.error) {
      const error = firstFailure.error.toLowerCase();

      if (error.includes('nonetype') || error.includes('null')) {
        return `I see you're getting a null/None error: "${firstFailure.error}"\n\nThis typically means you're trying to access a property or method on a variable that doesn't have a value. Check:\n1. Are all your variables properly initialized?\n2. Are you handling edge cases (empty inputs, etc.)?\n3. Is there a function that might return None/null?`;
      }

      if (error.includes('index') || error.includes('out of range')) {
        return `You're getting an index error: "${firstFailure.error}"\n\nThis happens when you try to access an element that doesn't exist. Consider:\n1. Is your loop going beyond the array/list length?\n2. Are you using the correct index (0-based vs 1-based)?\n3. What happens with empty inputs?`;
      }

      if (error.includes('syntax')) {
        return `There's a syntax error in your code: "${firstFailure.error}"\n\nDouble-check:\n1. Matching brackets, parentheses, and quotes\n2. Proper indentation (especially in Python)\n3. Missing colons or semicolons\n4. Correct function/variable names`;
      }

      if (error.includes('type')) {
        return `You have a type mismatch: "${firstFailure.error}"\n\nThis means you're mixing incompatible types. Check:\n1. Are you trying to add/concatenate different types?\n2. Did you forget to convert a string to a number (or vice versa)?\n3. Are function arguments the correct type?`;
      }

      return `I see an error: "${firstFailure.error}"\n\nLet's debug this:\n1. Read the error message carefully - it usually points to the line with the issue\n2. Add print statements to check variable values\n3. Test with simple inputs first\n\nWhat specific part of the error message is unclear?`;
    }

    if (firstFailure.expected !== firstFailure.actual) {
      return `Your code produces "${firstFailure.actual}" but should output "${firstFailure.expected}" for input "${firstFailure.input}".\n\nLet's analyze:\n1. Walk through your logic step by step with this input\n2. Check your algorithm handles this specific case\n3. Look for off-by-one errors or edge cases\n\nWould you like to walk through your approach?`;
    }
  }

  if (questionType === 'mcq') {
    return `For this question about "${questionTitle}", let me help you think through it:\n\n1. What's the key concept being tested?\n2. Can you eliminate any obviously wrong options?\n3. For the remaining options, which one most accurately answers the question?\n\nWhat's your current thinking?`;
  }

  return `I'd love to help with "${questionTitle}"!\n\nLet's break this down:\n1. What do you understand about the problem so far?\n2. What have you tried?\n3. Where are you getting stuck?\n\nShare your thoughts and I'll guide you in the right direction.`;
};
