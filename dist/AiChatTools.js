"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProductById = fetchProductById;
exports.fetchAllProducts = fetchAllProducts;
exports.fetchProductsByCompany = fetchProductsByCompany;
exports.fetchCompanyById = fetchCompanyById;
exports.fetchAllCompanies = fetchAllCompanies;
exports.fetchCompaniesForUser = fetchCompaniesForUser;
exports.fetchArticleList = fetchArticleList;
exports.fetchArticleById = fetchArticleById;
exports.fetchArticleFullContentById = fetchArticleFullContentById;
exports.fetchAllArticleFullContents = fetchAllArticleFullContents;
exports.fetchMissingArticleFullContents = fetchMissingArticleFullContents;
// src/AiChatTools.ts
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("./models/Product");
const Company_1 = require("./models/Company");
const Article_1 = require("./models/Article");
/**
 * PRODUCT TOOLS
 */
function fetchProductById(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid Product ID');
        }
        const product = yield Product_1.Product.findById(id)
            .populate('companyId', 'companyName companyLogo')
            .lean();
        if (!product)
            throw new Error('Product not found');
        return product;
    });
}
function fetchAllProducts() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield Product_1.Product.find()
            .populate('companyId', 'companyName companyLogo')
            .lean();
    });
}
function fetchProductsByCompany(_a) {
    return __awaiter(this, arguments, void 0, function* ({ companyId }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            throw new Error('Invalid Company ID');
        }
        return yield Product_1.Product.find({ companyId })
            .populate('companyId', 'companyName companyLogo')
            .lean();
    });
}
/**
 * COMPANY TOOLS
 */
function fetchCompanyById(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid Company ID');
        }
        const company = yield Company_1.Company.findById(id).lean();
        if (!company)
            throw new Error('Company not found');
        return company;
    });
}
function fetchAllCompanies() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield Company_1.Company.find().lean();
    });
}
function fetchCompaniesForUser(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid User ID');
        }
        return yield Company_1.Company.find({ user: userId }).lean();
    });
}
/**
 * ARTICLE TOOLS
 */
function fetchArticleList() {
    return __awaiter(this, void 0, void 0, function* () {
        // en son eklenen maddeden başla
        return yield Article_1.Article.find().sort({ createdAt: -1 }).lean();
    });
}
function fetchArticleById(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid Article ID');
        }
        const article = yield Article_1.Article.findById(id).lean();
        if (!article)
            throw new Error('Article not found');
        return article;
    });
}
function fetchArticleFullContentById(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id }) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid Article ID');
        }
        const article = yield Article_1.Article.findById(id).lean();
        if (!article)
            throw new Error('Article not found');
        return { id: article._id, title: article.title, fullContent: article.fullContent || '' };
    });
}
function fetchAllArticleFullContents() {
    return __awaiter(this, void 0, void 0, function* () {
        const all = yield Article_1.Article.find().lean();
        return all.map(a => ({ id: a._id, fullContent: a.fullContent || '' }));
    });
}
function fetchMissingArticleFullContents() {
    return __awaiter(this, void 0, void 0, function* () {
        const missing = yield Article_1.Article.find({ fullContent: { $in: [null, ''] } }).lean();
        return missing.map(a => ({ id: a._id }));
    });
}
