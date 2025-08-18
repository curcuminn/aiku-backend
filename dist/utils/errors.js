"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
class BadRequestError extends CustomError {
    constructor(message) {
        super(message, 400);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends CustomError {
    constructor(message) {
        super(message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends CustomError {
    constructor(message) {
        super(message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends CustomError {
    constructor(message) {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends CustomError {
    constructor(message) {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends CustomError {
    constructor(message = 'Internal Server Error') {
        super(message, 500);
    }
}
exports.InternalServerError = InternalServerError;
