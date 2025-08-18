"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const blogController_1 = require("../controllers/blogController");
const auth_1 = require("../middleware/auth");
const optionalAuth_1 = require("../middleware/optionalAuth");
const router = (0, express_1.Router)();
// **Tüm Blogları Getirme (örn: GET /api/blog/all)**
router.get('/all', optionalAuth_1.optionalAuth, blogController_1.getAllBlogs);
// **Kullanıcının Bloglarını Getirme (örn: GET /api/blog/user)**
router.get('/user', auth_1.protect, blogController_1.getBlogsByUser);
// **Belirtilen ID'ye Sahip Blogu Getirme (örn: GET /api/blog/:id)**
router.get('/:id', blogController_1.getBlogById);
// **Blog Oluşturma (örn: POST /api/blog)**
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('title', 'Başlık zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('fullContent', 'İçerik zorunludur').not().isEmpty(),
    // coverPhoto opsiyonel olduğu için burada kontrol yok
], blogController_1.createBlog);
// **Blog Güncelleme (örn: PUT /api/blog/:id)**
router.put('/:id', auth_1.protect, blogController_1.updateBlog);
// **Blog Silme (örn: DELETE /api/blog/:id)**
router.delete('/:id', auth_1.protect, blogController_1.deleteBlog);
exports.default = router;
