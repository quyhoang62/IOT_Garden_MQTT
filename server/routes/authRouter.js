/**
 * ============================================================================
 * FILE: routes/authRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến Authentication (Xác thực)
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints cho:
 * 1. Đăng nhập (Login)
 * 2. Đăng ký (Sign Up)
 * 3. Lấy thông tin user đang đăng nhập
 * 
 * BASE PATH: /api/v1 (được mount trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬─────────────────┬──────────────────────────────────────────────────┐
 * │ Method │ Endpoint        │ Mô tả                                            │
 * ├────────┼─────────────────┼──────────────────────────────────────────────────┤
 * │ GET    │ /api/v1/test    │ Test route (development only)                    │
 * │ POST   │ /api/v1/login   │ Đăng nhập và nhận JWT token                      │
 * │ POST   │ /api/v1/signup  │ Đăng ký tài khoản mới                            │
 * │ GET    │ /api/v1/user    │ Lấy thông tin user (yêu cầu auth) 🔒             │
 * └────────┴─────────────────┴──────────────────────────────────────────────────┘
 * 
 * 🔒 = Yêu cầu JWT token trong header Authorization
 * 
 * ============================================================================
 */

/**
 * Import Express framework
 */
const express = require('express')

/**
 * Tạo Router instance
 * Router là một mini-app chỉ xử lý routing
 * Có thể mount vào app chính với prefix path
 */
const router = express.Router()

/**
 * Import authController chứa logic xử lý authentication
 */
const authController = require('../controllers/authController')

/**
 * Import middleware xác thực JWT token
 * Dùng để bảo vệ các routes yêu cầu đăng nhập
 */
const authenticate = require('../middlewares/authMiddleware')

/**
 * ============================================================================
 * ROUTE: GET /api/v1/test
 * MÔ TẢ: Endpoint test để kiểm tra router hoạt động
 * ============================================================================
 * 
 * Endpoint đơn giản để:
 * - Kiểm tra server đang chạy
 * - Test kết nối từ frontend
 * - Debug trong quá trình phát triển
 * 
 * @response {Object} { value: "Hallo" }
 */
router.get('/test', (req, res) => {
    res.json({value: 'Hallo'});
})

/**
 * ============================================================================
 * ROUTE: POST /api/v1/login
 * MÔ TẢ: Đăng nhập và nhận JWT token
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "username": "string",    // Tên đăng nhập
 *   "password": "string",    // Mật khẩu
 *   "rememberMe": boolean    // Ghi nhớ đăng nhập (optional)
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { token: "eyJhbGciOiJIUzI1NiIs..." }
 * - Sai credentials (401): { error: "Unauthorized" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * NOTES:
 * - Token có thời hạn 1h (hoặc 30d nếu rememberMe = true)
 * - Client lưu token và gửi trong header cho các request sau
 */
router.post('/login', authController.loginAuthenticate);

/**
 * ============================================================================
 * ROUTE: POST /api/v1/signup
 * MÔ TẢ: Đăng ký tài khoản mới
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "name": "string",        // Họ tên đầy đủ
 *   "username": "string",    // Tên đăng nhập (unique)
 *   "password": "string"     // Mật khẩu (sẽ được hash)
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { token: "eyJhbGciOiJIUzI1NiIs..." }
 * - Username đã tồn tại (400): { error: "Username already exists" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * SIDE EFFECTS:
 * - Tạo user mới trong tbl_user
 * - Tạo garden mặc định cho user trong tbl_garden
 */
router.post('/signup', authController.signUpAuthenticate);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/user 🔒
 * MÔ TẢ: Lấy thông tin user đang đăng nhập
 * ============================================================================
 * 
 * AUTHENTICATION: Yêu cầu JWT token trong header
 * Header: Authorization: Bearer <token>
 * 
 * MIDDLEWARE CHAIN:
 * 1. authenticate: Verify JWT token và gắn user info vào req.user
 * 2. authController.getUserInfo: Trả về req.user
 * 
 * RESPONSE:
 * - Thành công (200):
 *   {
 *     "id": 1,
 *     "username": "johndoe",
 *     "iat": 1699999999,
 *     "exp": 1700086399
 *   }
 * - Không có token (401): { error: "Unauthorized" }
 * - Token không hợp lệ (401): { error: "Unauthorized" }
 * 
 * USE CASE:
 * - Frontend kiểm tra user đã đăng nhập chưa
 * - Lấy user ID để gọi các API khác
 */
router.get('/user', authenticate, authController.getUserInfo);


/**
 * Export router để mount trong server.js
 * 
 * Cách sử dụng trong server.js:
 * const authRouter = require('./routes/authRouter');
 * app.use('/api/v1', authRouter);
 */
module.exports = router;