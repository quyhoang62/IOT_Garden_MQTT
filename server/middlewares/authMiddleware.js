/**
 * ============================================================================
 * FILE: middlewares/authMiddleware.js
 * MÔ TẢ: Middleware xác thực JWT token cho các protected routes
 * ============================================================================
 * 
 * Middleware này kiểm tra và xác thực JWT token từ request header.
 * Được sử dụng để bảo vệ các routes yêu cầu đăng nhập.
 * 
 * LUỒNG XÁC THỰC:
 * 1. Client gửi request với header: Authorization: Bearer <token>
 * 2. Middleware extract token từ header
 * 3. Verify token với secret key
 * 4. Nếu hợp lệ: decode payload và gắn vào req.user, gọi next()
 * 5. Nếu không hợp lệ: trả về 401 Unauthorized
 * 
 * CÁCH SỬ DỤNG TRONG ROUTES:
 * const authMiddleware = require('../middlewares/authMiddleware');
 * router.get('/protected-route', authMiddleware, controller.someFunction);
 * 
 * ============================================================================
 */

/**
 * Import thư viện jsonwebtoken để verify JWT token
 */
const jwt = require('jsonwebtoken');

/**
 * Secret key để verify JWT token
 * 
 * QUAN TRỌNG: Secret này PHẢI GIỐNG với secret trong authController.js
 * Nếu khác nhau, token sẽ không verify được
 * 
 * BẢO MẬT:
 * - Trong production, sử dụng secret phức tạp và lưu trong biến môi trường
 * - Ví dụ: const secret = process.env.JWT_SECRET || 'fallback_secret';
 * - Secret tốt nên có ít nhất 32 ký tự ngẫu nhiên
 */
const secret = 'doge'; // Recommended secret is `h#J8$2kL@9!z`, but who the fuck care

/**
 * ============================================================================
 * FUNCTION: authenticate
 * MÔ TẢ: Middleware function xác thực JWT token
 * ============================================================================
 * 
 * @param {Object} req - Express request object
 * @param {string} req.headers.authorization - Header chứa Bearer token
 * @param {Object} res - Express response object
 * @param {Function} next - Callback để chuyển sang middleware/route handler tiếp theo
 * 
 * SAU KHI VERIFY THÀNH CÔNG, req.user sẽ chứa:
 * {
 *   "id": <number>,        // ID của user trong database
 *   "username": <string>,  // Username của user
 *   "iat": <number>,       // Issued At - Thời điểm token được tạo (Unix timestamp)
 *   "exp": <number>        // Expiration - Thời điểm token hết hạn (Unix timestamp)
 * }
 * 
 * RESPONSE KHI LỖI:
 * - Status 401: { error: "Unauthorized" }
 *   Xảy ra khi:
 *   + Không có token trong header
 *   + Token không hợp lệ (sai format, sai signature)
 *   + Token đã hết hạn (exp < current time)
 */
function authenticate(req, res, next) {
    /**
     * Bước 1: Lấy token từ Authorization header
     * 
     * Format chuẩn: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * - "Bearer " là prefix theo chuẩn OAuth 2.0
     * - Phần còn lại là JWT token
     */
    let token = req.headers.authorization;
    
    /**
     * Bước 2: Loại bỏ prefix "Bearer " nếu có
     * 
     * slice(7) cắt bỏ 7 ký tự đầu ("Bearer ") để lấy token thực
     * Ví dụ: "Bearer abc123" -> "abc123"
     */
    if (token && token.startsWith('Bearer ')) {
        // Remove bearer from string
        token = token.slice(7, token.length);
    }
    // console.log('Got token: ', token);
    
    /**
     * Bước 3: Kiểm tra token có tồn tại không
     * 
     * Nếu không có token -> request chưa đăng nhập
     * Trả về 401 Unauthorized
     */
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    /**
     * Bước 4: Verify và decode token
     * 
     * jwt.verify(token, secret, callback)
     * - Kiểm tra signature có khớp với secret không
     * - Kiểm tra token có hết hạn không (exp)
     * - Decode payload nếu hợp lệ
     * 
     * @param {Error|null} err - Lỗi nếu token không hợp lệ
     * @param {Object} decoded - Payload đã decode nếu token hợp lệ
     * 
     * Các loại lỗi có thể xảy ra:
     * - JsonWebTokenError: Token format sai hoặc signature không khớp
     * - TokenExpiredError: Token đã hết hạn
     * - NotBeforeError: Token chưa active (nbf claim)
     */
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            // Token không hợp lệ hoặc đã hết hạn
            console.error(err);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        /**
         * Bước 5: Gắn user info vào request object
         * 
         * decoded chứa payload của JWT:
         * - id: User ID
         * - username: Username
         * - iat: Issued At timestamp
         * - exp: Expiration timestamp
         * 
         * Các route handlers sau có thể truy cập thông tin user qua req.user
         */
        req.user = decoded;
        console.log("This is user id: ", req.user.id);
        
        /**
         * Bước 6: Gọi next() để chuyển sang middleware/handler tiếp theo
         * 
         * Nếu không gọi next(), request sẽ bị treo (hanging)
         */
        next();
    });
};

/**
 * Export middleware function
 * 
 * Cách sử dụng:
 * const authenticate = require('../middlewares/authMiddleware');
 * 
 * // Bảo vệ single route
 * router.get('/profile', authenticate, (req, res) => {
 *   res.json({ userId: req.user.id });
 * });
 * 
 * // Bảo vệ tất cả routes trong router
 * router.use(authenticate);
 * router.get('/route1', handler1);
 * router.get('/route2', handler2);
 */
module.exports = authenticate;