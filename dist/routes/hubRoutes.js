"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const HubController_1 = require("../controllers/HubController");
const auth_1 = require("../middleware/auth");
const optionalAuth_1 = require("../middleware/optionalAuth");
const router = (0, express_1.Router)();
// Middleware to validate and return errors as JSON
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// **Get All Hubs**
router.get('/all', optionalAuth_1.optionalAuth, HubController_1.getAllHubs);
// **Get Hubs Belonging to the Logged-in User**
router.get('/user', auth_1.protect, HubController_1.getHubsByUser);
// **Get a Specific Hub by ID**
router.get('/:id', HubController_1.getHubById);
// **Create New Hub**
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('name', 'Hub name is required').notEmpty(),
    (0, express_validator_1.check)('type', 'Hub type is required').notEmpty(),
    (0, express_validator_1.check)('address', 'Address is required').notEmpty(),
    (0, express_validator_1.check)('website')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid website URL'),
    (0, express_validator_1.check)('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage('Please enter a valid email address'),
    (0, express_validator_1.check)('applicationUrl')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid application URL'),
], validate, HubController_1.createHub);
// **Update Hub**
router.put('/:id', auth_1.protect, [
    (0, express_validator_1.check)('website')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid website URL'),
    (0, express_validator_1.check)('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage('Please enter a valid email address'),
    (0, express_validator_1.check)('applicationUrl')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid application URL'),
], validate, HubController_1.updateHub);
// **Delete Hub**
router.delete('/:id', auth_1.protect, HubController_1.deleteHub);
exports.default = router;
