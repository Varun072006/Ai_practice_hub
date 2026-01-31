// Analysis Service - Isolated Logic for Performance Analysis
// This service handles results page AI analysis with structured output

import logger from '../config/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AnalysisInput {
    sessionType: string;
    courseTitle: string;
    levelTitle: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    questions: Array<{
        title: string;
        concepts?: string;
        isCorrect: boolean;
        timeTaken?: number;
    }>;
}

export interface AnalysisResult {
    analysis: string;
    suggestions: string[];
    nextSteps: string;
    strengths?: string[];
    weaknesses?: string[];
}

// ============================================================================
// Configuration - Analysis Specific
// ============================================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const ANALYSIS_TIMEOUT = 60000; // 60 seconds for analysis
const ANALYSIS_TEMPERATURE = 0.6; // Balanced - insightful but consistent
const ANALYSIS_MAX_TOKENS = 500;

// ============================================================================
// Analysis-Specific System Prompts
// ============================================================================

const ANALYSIS_PROMPTS = {
    passed: `You are a data analyst reviewing a student's practice session results.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation, just JSON.

Your analysis style:
- Be specific about what topics they did well on
- Suggest ONE advanced topic to explore next
- Keep suggestions actionable and focused
- Be encouraging but substantive

JSON format required:
{
    "analysis": "2-3 sentences analyzing their strong performance",
    "suggestions": ["4 specific tips for continued improvement"],
    "nextSteps": "One specific advanced topic or skill to tackle next"
}`,

    failed: `You are a data analyst reviewing a student's practice session results.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation, just JSON.

Your analysis style:
- Identify SPECIFIC topics where they struggled (from wrong answers)
- Provide targeted improvement suggestions
- Be encouraging but honest about areas to review
- Focus on remediation, not criticism

JSON format required:
{
    "analysis": "2-3 sentences analyzing their performance, mentioning specific weak areas",
    "suggestions": ["4 specific tips targeting their mistakes"],
    "nextSteps": "One specific topic to review based on their errors"
}`
};

// ============================================================================
// Core Analysis Function
// ============================================================================

/**
 * Generate performance analysis using structured data input
 * Produces structured output for consistent UI rendering
 */
export const generateSessionAnalysis = async (input: AnalysisInput): Promise<AnalysisResult> => {
    const { sessionType, courseTitle, levelTitle, score, questions, correctCount, totalQuestions } = input;

    const isPassing = score >= (sessionType === 'mcq' ? 60 : 70);

    logger.info(`[Analysis Service] Generating analysis for ${sessionType} session. Score: ${score}%, Pass: ${isPassing}`);

    // Build structured data prompt (not conversational)
    const incorrectQuestions = questions.filter(q => !q.isCorrect);
    const correctQuestions = questions.filter(q => q.isCorrect);

    // Extract topics from questions (properly typed)
    const weakTopics: string[] = incorrectQuestions
        .map(q => q.concepts)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
        .slice(0, 3);

    const strongTopics: string[] = correctQuestions
        .map(q => q.concepts)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
        .slice(0, 3);

    const dataPrompt = `SESSION DATA:
- Course: "${courseTitle}" - ${levelTitle}
- Type: ${sessionType.toUpperCase()}
- Result: ${isPassing ? 'PASSED' : 'FAILED'}
- Score: ${score}% (${correctCount}/${totalQuestions})

QUESTION BREAKDOWN:
${questions.map((q, i) =>
        `Q${i + 1}: "${q.title}" - ${q.isCorrect ? '✓ CORRECT' : '✗ WRONG'}${q.concepts ? ` [Topic: ${q.concepts}]` : ''}`
    ).join('\n')}

${incorrectQuestions.length > 0 ? `
WRONG ANSWERS (Focus on these):
${incorrectQuestions.map(q => `- "${q.title}"${q.concepts ? ` (${q.concepts})` : ''}`).join('\n')}
` : ''}

${weakTopics.length > 0 ? `Weak Topics: ${weakTopics.join(', ')}` : ''}
${strongTopics.length > 0 ? `Strong Topics: ${strongTopics.join(', ')}` : ''}

Generate analysis JSON now:`;

    try {
        const jsonResponse = await callAnalysisInference(
            isPassing ? ANALYSIS_PROMPTS.passed : ANALYSIS_PROMPTS.failed,
            dataPrompt
        );

        // Parse and validate response
        const parsed = parseAnalysisResponse(jsonResponse, isPassing, score, weakTopics);
        logger.info(`[Analysis Service] Successfully generated analysis`);
        return parsed;

    } catch (error: any) {
        logger.error(`[Analysis Service] Inference failed: ${error.message}`);
        return getAnalysisFallback(isPassing, score, weakTopics, courseTitle);
    }
};

// ============================================================================
// Analysis-Specific Inference Call
// ============================================================================

const callAnalysisInference = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT);

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
                    temperature: ANALYSIS_TEMPERATURE,
                    num_predict: ANALYSIS_MAX_TOKENS
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
// Response Parsing with Validation
// ============================================================================

const parseAnalysisResponse = (
    jsonStr: string,
    isPassing: boolean,
    score: number,
    weakTopics: string[]
): AnalysisResult => {
    try {
        // Try to extract JSON from response (handle markdown wrapping)
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!parsed.analysis || typeof parsed.analysis !== 'string') {
            throw new Error('Missing or invalid analysis field');
        }

        // Ensure suggestions is an array
        let suggestions = parsed.suggestions;
        if (!Array.isArray(suggestions)) {
            suggestions = [suggestions || 'Review the material and practice again'];
        }
        suggestions = suggestions.filter((s: any) => typeof s === 'string' && s.length > 0);
        if (suggestions.length === 0) {
            suggestions = ['Review the concepts covered in this session'];
        }

        // Ensure nextSteps exists
        const nextSteps = typeof parsed.nextSteps === 'string' && parsed.nextSteps.length > 0
            ? parsed.nextSteps
            : isPassing
                ? 'Continue to the next level to build on your knowledge!'
                : 'Review the topics you missed and try again.';

        return {
            analysis: parsed.analysis,
            suggestions: suggestions.slice(0, 4), // Max 4 suggestions
            nextSteps,
            strengths: parsed.strengths,
            weaknesses: parsed.weaknesses
        };

    } catch (parseError: any) {
        logger.warn(`[Analysis Service] JSON parse failed: ${parseError.message}, using text fallback`);

        // Try to extract meaningful text from response
        const cleanText = jsonStr.replace(/```json|```/g, '').trim();
        if (cleanText.length > 20) {
            return {
                analysis: cleanText.split('\n')[0].slice(0, 200),
                suggestions: [
                    'Review the questions you got wrong',
                    'Practice similar problems',
                    'Check the explanations for each answer'
                ],
                nextSteps: isPassing ? 'Great job! Move on to the next topic.' : 'Review and try again.'
            };
        }

        throw parseError;
    }
};

// ============================================================================
// Analysis-Specific Fallbacks
// ============================================================================

const getAnalysisFallback = (
    isPassing: boolean,
    score: number,
    weakTopics: string[],
    courseTitle: string
): AnalysisResult => {
    if (isPassing) {
        return {
            analysis: `Great work! You scored ${score}% and demonstrated solid understanding of ${courseTitle} concepts. ${score >= 80 ? 'Excellent performance!' : 'You met the passing threshold.'}`,
            suggestions: [
                'Review explanations for any questions you missed',
                'Try more challenging problems to deepen understanding',
                'Practice applying these concepts in real scenarios',
                'Consider exploring advanced topics in this area'
            ],
            nextSteps: 'You\'re ready to progress to the next level!'
        };
    }

    const topicMention = weakTopics.length > 0
        ? `Focus especially on: ${weakTopics.slice(0, 2).join(', ')}.`
        : 'Review the core concepts covered in this section.';

    return {
        analysis: `You scored ${score}%, which is below the passing threshold. Don't be discouraged - this is part of the learning process. ${topicMention}`,
        suggestions: [
            'Carefully review the explanations for questions you got wrong',
            'Revisit the course material for topics you found challenging',
            'Take notes on key concepts and definitions',
            'Try the practice session again after reviewing'
        ],
        nextSteps: 'Review the material and attempt this level again when ready.'
    };
};

// ============================================================================
// Health Check
// ============================================================================

export const checkAnalysisServiceHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch {
        return false;
    }
};
