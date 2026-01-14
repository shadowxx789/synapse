/**
 * Error Service - Centralized error handling with retry logic
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Network error detection
 * - User-friendly error messages (Chinese)
 * - Error categorization
 */

// ============================================================================
// Types
// ============================================================================

export type ErrorCategory =
    | 'network'      // 网络连接问题
    | 'auth'         // 认证/权限问题
    | 'validation'   // 输入验证问题
    | 'not_found'    // 资源不存在
    | 'conflict'     // 冲突 (如重复数据)
    | 'rate_limit'   // 请求过于频繁
    | 'server'       // 服务器错误
    | 'unknown';     // 未知错误

export interface AppError {
    code: string;
    message: string;
    category: ErrorCategory;
    originalError?: unknown;
    retryable: boolean;
}

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryCondition?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
}

// ============================================================================
// Error Messages (Chinese)
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
    // Network errors
    'network/offline': '网络连接已断开，请检查网络设置',
    'network/timeout': '请求超时，请稍后重试',
    'network/failed': '网络请求失败，请检查网络连接',

    // Auth errors
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/invalid-email': '邮箱格式不正确',
    'auth/weak-password': '密码强度太弱，请使用至少6位密码',
    'auth/user-disabled': '该账号已被禁用',
    'auth/user-not-found': '账号不存在',
    'auth/wrong-password': '密码错误',
    'auth/invalid-credential': '邮箱或密码错误',
    'auth/too-many-requests': '登录尝试次数过多，请稍后再试',
    'auth/requires-recent-login': '请重新登录后再试',
    'auth/session-expired': '登录已过期，请重新登录',

    // Firestore errors
    'firestore/permission-denied': '没有权限执行此操作',
    'firestore/not-found': '请求的数据不存在',
    'firestore/already-exists': '数据已存在',
    'firestore/resource-exhausted': '请求过于频繁，请稍后再试',
    'firestore/unavailable': '服务暂时不可用，请稍后再试',

    // Pairing errors
    'pairing/invalid-code': '配对码无效或已过期',
    'pairing/self-pair': '不能与自己配对',
    'pairing/role-mismatch': '需要一个执行者和一个支持者配对',
    'pairing/already-paired': '已经配对，请先解除当前配对',

    // Message errors
    'message/encryption-failed': '消息加密失败',
    'message/decryption-failed': '消息解密失败',
    'message/send-failed': '消息发送失败，请重试',

    // Generic errors
    'unknown': '操作失败，请重试',
    'validation/required': '请填写必填项',
    'validation/invalid': '输入格式不正确',
};

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return true;
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('offline') ||
            message.includes('internet') ||
            message.includes('connection') ||
            message.includes('timeout') ||
            message.includes('fetch')
        );
    }
    return false;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
    if (isNetworkError(error)) return true;

    const errorCode = getErrorCode(error);
    const retryableCodes = [
        'firestore/unavailable',
        'firestore/resource-exhausted',
        'auth/too-many-requests',
        'network/timeout',
        'network/failed',
    ];

    return retryableCodes.includes(errorCode);
};

/**
 * Extract error code from various error types
 */
export const getErrorCode = (error: unknown): string => {
    if (error && typeof error === 'object') {
        if ('code' in error && typeof error.code === 'string') {
            return error.code;
        }
        if ('name' in error && typeof error.name === 'string') {
            return error.name;
        }
    }
    if (isNetworkError(error)) {
        return 'network/failed';
    }
    return 'unknown';
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
    const code = getErrorCode(error);

    // Check for exact match
    if (ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
    }

    // Check for prefix match (e.g., 'auth/something' -> check 'auth' prefix)
    const prefix = code.split('/')[0];
    const prefixMessage = Object.entries(ERROR_MESSAGES).find(
        ([key]) => key.startsWith(prefix + '/')
    );
    if (prefixMessage) {
        // Return generic message for that category
        if (prefix === 'auth') return '认证失败，请重试';
        if (prefix === 'firestore') return '数据操作失败，请重试';
        if (prefix === 'network') return '网络错误，请检查连接';
    }

    // Check if error has a message property
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: string }).message;
        // Don't expose technical error messages to users
        if (message.length < 100 && !message.includes('Error:')) {
            return message;
        }
    }

    return ERROR_MESSAGES['unknown'];
};

/**
 * Categorize an error
 */
export const categorizeError = (error: unknown): ErrorCategory => {
    const code = getErrorCode(error);

    if (isNetworkError(error)) return 'network';
    if (code.startsWith('auth/')) return 'auth';
    if (code.startsWith('validation/')) return 'validation';
    if (code.includes('not-found') || code.includes('not_found')) return 'not_found';
    if (code.includes('already-exists') || code.includes('conflict')) return 'conflict';
    if (code.includes('rate') || code.includes('exhausted')) return 'rate_limit';
    if (code.includes('server') || code.includes('internal')) return 'server';

    return 'unknown';
};

/**
 * Create a standardized AppError
 */
export const createAppError = (error: unknown): AppError => {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    const category = categorizeError(error);
    const retryable = isRetryableError(error);

    return {
        code,
        message,
        category,
        originalError: error,
        retryable,
    };
};

// ============================================================================
// Retry Logic
// ============================================================================

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryCondition: isRetryableError,
    onRetry: () => {},
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;
    let delay = opts.initialDelayMs;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt >= opts.maxRetries || !opts.retryCondition(error)) {
                throw error;
            }

            // Call onRetry callback
            opts.onRetry(attempt + 1, error);

            // Wait before retrying
            await sleep(delay);

            // Increase delay for next retry (exponential backoff)
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        }
    }

    throw lastError;
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = '请求超时'
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
    ]);
}

/**
 * Combine retry and timeout
 */
export async function withRetryAndTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 30000,
    retryOptions?: RetryOptions
): Promise<T> {
    return withRetry(() => withTimeout(fn, timeoutMs), retryOptions);
}

// ============================================================================
// Error Service
// ============================================================================

export const errorService = {
    isNetworkError,
    isRetryableError,
    getErrorCode,
    getErrorMessage,
    categorizeError,
    createAppError,
    withRetry,
    withTimeout,
    withRetryAndTimeout,

    /**
     * Check if device is online
     */
    isOnline(): boolean {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            return navigator.onLine;
        }
        return true; // Assume online if we can't detect
    },

    /**
     * Format error for logging (with full details)
     */
    formatForLogging(error: unknown): string {
        const appError = createAppError(error);
        return JSON.stringify({
            code: appError.code,
            category: appError.category,
            message: appError.message,
            retryable: appError.retryable,
            stack: error instanceof Error ? error.stack : undefined,
        }, null, 2);
    },
};

export default errorService;
