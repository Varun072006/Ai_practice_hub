// MCQ Hint Service - Isolated Logic for MCQ Hints
// This service handles MCQ hint generation with attempt-aware prompts and stateless calls

import logger from '../config/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MCQHintRequest {
    questionTitle: string;
    questionDescription: string;
    options: string[];
    attemptCount: number;
    previousHints?: string[];
}

export interface MCQHintResponse {
    hint: string;
    hintLevel: 'conceptual' | 'elimination' | 'reasoning';
}

// ============================================================================
// Configuration - MCQ Specific
// ============================================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const MCQ_TIMEOUT = 45000; // 45 seconds - shorter for hints
const MCQ_TEMPERATURE = 0.8; // Higher for creative, varied hints
const MCQ_MAX_TOKENS = 200; // Concise hints

// ============================================================================
// MCQ-Specific System Prompts (Attempt-Aware)
// ============================================================================

const MCQ_PROMPTS = {
    conceptual: `You are an expert tutor helping a student with their FIRST attempt at a multiple-choice question.

Your role:
- Explain the UNDERLYING CONCEPT being tested
- Give a conceptual foundation to help them think
- Do NOT mention any specific option
- Do NOT give away the answer
- Keep it to 2-3 sentences max

Focus on: "What is this question really testing?"`,

    elimination: `You are an expert tutor helping a student who has already tried once.

Your role:
- Help them use ELIMINATION strategy
- Suggest what types of answers are usually wrong
- Guide them to identify obviously incorrect options
- Do NOT reveal which option is correct
- Keep it to 2-3 sentences max

Focus on: "How can you eliminate wrong choices?"`,

    reasoning: `You are an expert tutor helping a student who has tried multiple times.

Your role:
- Walk through the LOGICAL REASONING needed
- Explain how to evaluate each option systematically
- Give a more detailed analytical approach
- Still avoid directly revealing the answer
- Keep it to 3-4 sentences max

Focus on: "Let's reason through this step by step."`
};

// ============================================================================
// Core MCQ Hint Function
// ============================================================================

/**
 * Generate MCQ hint using isolated, stateless logic
 * Each call is independent - no conversation history
 */
export const generateMCQHint = async (request: MCQHintRequest): Promise<MCQHintResponse> => {
    const { questionTitle, questionDescription, options, attemptCount, previousHints = [] } = request;

    // Determine hint level based on attempt count
    let hintLevel: 'conceptual' | 'elimination' | 'reasoning';
    if (attemptCount <= 1) {
        hintLevel = 'conceptual';
    } else if (attemptCount === 2) {
        hintLevel = 'elimination';
    } else {
        hintLevel = 'reasoning';
    }

    logger.info(`[MCQ Hint Service] Generating ${hintLevel} hint for: "${questionTitle}" (attempt ${attemptCount})`);

    // Build the user prompt with question context
    let userPrompt = `Question: "${questionTitle}"
Description: ${questionDescription}

Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;

    // Add previous hints to avoid repetition
    if (previousHints.length > 0) {
        userPrompt += `\n\nIMPORTANT - Do NOT repeat these hints that were already given:
${previousHints.map((h, i) => `- Hint ${i + 1}: "${h.slice(0, 100)}..."`).join('\n')}

Provide a DIFFERENT perspective or approach.`;
    }

    userPrompt += `\n\nProvide your ${hintLevel} hint now. Be specific to THIS question.`;

    try {
        const hint = await callMCQInference(
            MCQ_PROMPTS[hintLevel],
            userPrompt
        );

        logger.info(`[MCQ Hint Service] Successfully generated ${hintLevel} hint`);
        return { hint, hintLevel };

    } catch (error: any) {
        logger.error(`[MCQ Hint Service] Inference failed: ${error.message}`);

        // Return attempt-specific fallback
        const fallback = getMCQFallback(hintLevel, questionTitle);
        return { hint: fallback, hintLevel };
    }
};

// ============================================================================
// MCQ-Specific Inference Call (Stateless)
// ============================================================================

/**
 * Call Ollama with MCQ-specific configuration
 * Stateless: Only system + user message, no history
 */
const callMCQInference = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MCQ_TIMEOUT);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: false,
                options: {
                    temperature: MCQ_TEMPERATURE,
                    num_predict: MCQ_MAX_TOKENS
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API failed: ${response.statusText}`);
        }

        const data = await response.json() as { message: { content: string } };
        return data.message.content;

    } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// ============================================================================
// MCQ-Specific Fallbacks
// ============================================================================

const getMCQFallback = (hintLevel: 'conceptual' | 'elimination' | 'reasoning', questionTitle: string): string => {
    const fallbacks = {
        conceptual: `Think about the core concept being tested in "${questionTitle}". What fundamental principle or definition does this relate to? Understanding the 'why' will help you identify the correct answer.`,

        elimination: `Try the elimination approach: Look at each option and ask "Is this definitely wrong?" Cross out options that don't make logical sense or contradict what you know. This narrows down your choices.`,

        reasoning: `Let's reason through this systematically: 1) What does the question actually ask? 2) What would make each option true or false? 3) Which option best fits the question's requirements? Take your time with each step.`
    };

    return fallbacks[hintLevel];
};

// ============================================================================
// Health Check for MCQ Service
// ============================================================================

export const checkMCQServiceHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch {
        return false;
    }
};
