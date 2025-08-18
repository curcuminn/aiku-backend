"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    mailgun: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    },
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    panel: {
        url: process.env.PANEL_URL || 'http://localhost:3001',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        expire: process.env.JWT_EXPIRE || '90d',
    },
};
