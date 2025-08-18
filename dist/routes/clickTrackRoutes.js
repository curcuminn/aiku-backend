"use strict";
// src/routes/clickTrackRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clickTrackController_1 = require("../controllers/clickTrackController");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/click
 * @desc    Retrieve all click track entries, sorted by click count
 */
router.get('/', clickTrackController_1.getAllClickTracks);
/**
 * @route   GET /api/click/:elementId
 * @desc    Retrieve a single click track by its elementId
 */
router.get('/:elementId', clickTrackController_1.getClickTrackByElementId);
/**
 * @route   POST /api/click
 * @desc    Create a new click track entry
 * @body    { elementId: string, elementType: 'button'|'link', pageUrl?: string }
 */
router.post('/', clickTrackController_1.createClickTrack);
/**
 * @route   PATCH /api/click/:elementId/click
 * @desc    Increment the clickCount for a given elementId
 */
router.patch('/:elementId/click', clickTrackController_1.incrementClickCount);
exports.default = router;
