"use strict";
// src/controllers/clickTrackController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementClickCount = exports.createClickTrack = exports.getClickTrackByElementId = exports.getAllClickTracks = void 0;
const ClickTrack_1 = require("../models/ClickTrack");
/**
 * Get all click tracks, sorted by clickCount descending.
 */
const getAllClickTracks = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tracks = yield ClickTrack_1.ClickTrack
            .find()
            .select('elementId clickCount clickHistory createdAt updatedAt -_id')
            .sort({ clickCount: -1 })
            .lean();
        const sanitized = tracks.map(t => {
            const history = Array.isArray(t.clickHistory) ? t.clickHistory : [];
            history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return Object.assign(Object.assign({}, t), { clickHistory: history });
        });
        res.status(200).json(sanitized);
    }
    catch (error) {
        console.error('getAllClickTracks error:', error);
        next(error);
    }
});
exports.getAllClickTracks = getAllClickTracks;
/**
 * Get a single click track by elementId.
 */
const getClickTrackByElementId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { elementId } = req.params;
        const track = yield ClickTrack_1.ClickTrack.findOne({ elementId })
            .select('elementId elementType pageUrl clickCount createdAt updatedAt -_id');
        if (!track) {
            res.status(404).json({ message: `No ClickTrack found for elementId "${elementId}"` });
            return;
        }
        res.status(200).json(track);
    }
    catch (error) {
        next(error);
    }
});
exports.getClickTrackByElementId = getClickTrackByElementId;
/**
 * Create a new click track entry.
 */
const createClickTrack = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { elementId, elementType, pageUrl } = req.body;
        const exists = yield ClickTrack_1.ClickTrack.findOne({ elementId });
        if (exists) {
            res.status(400).json({ message: `ClickTrack for elementId "${elementId}" already exists` });
            return;
        }
        const track = yield ClickTrack_1.ClickTrack.create({ elementId, elementType, pageUrl });
        res.status(201).json(track);
    }
    catch (error) {
        next(error);
    }
});
exports.createClickTrack = createClickTrack;
/**
 * Increment clickCount for a given elementId by 1.
 */
const incrementClickCount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { elementId } = req.params;
        const track = yield ClickTrack_1.ClickTrack.findOneAndUpdate({ elementId }, {
            $inc: { clickCount: 1 },
            $push: { clickHistory: { timestamp: new Date() } }
        }, { new: true, upsert: true, setDefaultsOnInsert: true }).select('elementId clickCount clickHistory -_id');
        res.status(200).json(track);
    }
    catch (error) {
        next(error);
    }
});
exports.incrementClickCount = incrementClickCount;
