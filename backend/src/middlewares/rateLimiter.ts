import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use userId when authenticated (critical: all college students share same IP)
        const userId = (req as any).user?.userId || (req as any).user?.id;
        return userId || req.ip || 'anonymous';
    },
});

/**
 * Auth rate limiter (stricter)
 * 10 login attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Practice submission rate limiter
 * 30 submissions per minute per user
 */
export const practiceSubmitLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
        error: 'Too many practice submissions. Please slow down.',
        retryAfter: '1 minute',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        // Use user ID if authenticated, otherwise IP
        const userId = (req as any).user?.userId || (req as any).user?.id;
        return userId || req.ip || 'anonymous';
    },
});

/**
 * Analytics rate limiter
 * 20 requests per minute per user
 */
export const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: {
        error: 'Too many analytics requests. Please wait.',
        retryAfter: '1 minute',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Code execution rate limiter (strictest)
 * 10 code runs per minute per user
 */
export const codeExecutionLimiter = rateLimit({
    windowMs: 2000, // 2 seconds
    max: 1,
    message: {
        error: 'Please wait before running code again.',
        retryAfter: '2 seconds',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        return userId || req.ip || 'anonymous';
    },
});

const activeUsers = new Set();

export const executionLock = (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId || req.ip;

    if (activeUsers.has(userId)) {
        return res.status(429).json({
            error: "Wait for current execution to finish"
        });
    }

    activeUsers.add(userId);

    let cleaned = false;
    const cleanup = () => {
        if (!cleaned) { cleaned = true; activeUsers.delete(userId); }
    };
    res.on("finish", cleanup);
    res.on("close", cleanup);

    next();
};

let activeExecutions = 0;
const MAX_EXECUTIONS = 10;

export const globalExecutionGuard = (req: Request, res: Response, next: NextFunction) => {
    if (activeExecutions >= MAX_EXECUTIONS) {
        return res.status(503).json({
            error: "Server busy, try again shortly"
        });
    }

    activeExecutions++;

    let cleaned = false;
    const cleanup = () => {
        if (!cleaned) { cleaned = true; activeExecutions--; }
    };
    res.on("finish", cleanup);
    res.on("close", cleanup);

    next();
};