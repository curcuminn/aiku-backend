"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const panelUserController_1 = require("../controllers/panelUserController");
const router = express_1.default.Router();
router.get('/', panelUserController_1.getPanelUsers);
router.post('/', panelUserController_1.createPanelUser);
router.post('/signin', panelUserController_1.loginPanelUser);
exports.default = router;
