export enum CarrierErrorCode {
    // Authentication errors
    AUTH_FAILED = 'AUTH_FAILED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',

    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_ADDRESS = 'INVALID_ADDRESS',
    INVALID_PACKAGE = 'INVALID_PACKAGE',

    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',

    // API errors
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    CARRIER_ERROR = 'CARRIER_ERROR',

    // Response errors
    INVALID_RESPONSE = 'INVALID_RESPONSE',

    // General
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class CarrierError extends Error {
    public readonly code: CarrierErrorCode;
    public readonly carrier?: string;
    public readonly statusCode?: number;
    public readonly details?: Record<string, unknown>;
    public readonly retryable: boolean;

    constructor(
        message: string,
        code: CarrierErrorCode,
        options?: {
            carrier?: string;
            statusCode?: number;
            details?: Record<string, unknown>;
            retryable?: boolean;
            cause?: Error;
        }
    ) {
        super(message);
        this.name = 'CarrierError';
        this.code = code;
        this.carrier = options?.carrier;
        this.statusCode = options?.statusCode;
        this.details = options?.details;
        this.retryable = options?.retryable ?? false;

        if (options?.cause) {
            this.details = { ...this.details, originalError: options.cause.message };
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            carrier: this.carrier,
            statusCode: this.statusCode,
            details: this.details,
            retryable: this.retryable,
        };
    }
}
