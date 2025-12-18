/**
 * Custom Application Error Class
 * 
 * Standardized error handling per consistenza nell'applicazione
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = null) {
        super(message);

        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;