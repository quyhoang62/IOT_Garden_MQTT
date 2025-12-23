/**
 * ============================================================================
 * FILE: controllers/authController.js
 * MÔ TẢ: Controller xử lý xác thực người dùng (Authentication)
 * ============================================================================
 * 
 * File này chịu trách nhiệm xử lý tất cả các chức năng liên quan đến:
 * 1. Đăng nhập (Login) - Xác thực username/password
 * 2. Đăng ký (Sign Up) - Tạo tài khoản mới
 * 3. Lấy thông tin user đang đăng nhập
 * 
 * LUỒNG XÁC THỰC (Authentication Flow):
 * 1. User gửi credentials (username + password)
 * 2. Server kiểm tra credentials với database
 * 3. Nếu hợp lệ, server tạo JWT token và gửi về client
 * 4. Client lưu token và gửi kèm trong các request sau
 * 5. Server verify token để xác thực request
 * 
 * BẢO MẬT:
 * - Password được mã hóa bằng bcrypt trước khi lưu vào database
 * - JWT token có thời hạn (expiration) để hạn chế rủi ro
 * 
 * ============================================================================
 */

/**
 * Import thư viện jsonwebtoken
 * 
 * JWT (JSON Web Token) là tiêu chuẩn mở để tạo access token
 * Cấu trúc JWT: Header.Payload.Signature
 * - Header: Loại token và thuật toán mã hóa
 * - Payload: Dữ liệu user (id, username, thời gian hết hạn)
 * - Signature: Chữ ký số để xác minh tính toàn vẹn
 * 
 * Tài liệu: https://jwt.io/
 */
const jwt = require('jsonwebtoken')

/**
 * Import thư viện bcrypt
 * 
 * bcrypt là thư viện mã hóa password sử dụng thuật toán Blowfish
 * Ưu điểm:
 * - Có salt tự động (chống rainbow table attack)
 * - Có cost factor (có thể tăng độ khó khi CPU nhanh hơn)
 * - Không thể reverse (one-way hash)
 * 
 * Tài liệu: https://www.npmjs.com/package/bcrypt
 */
const bcrypt = require('bcrypt')

/**
 * Import userModel để truy vấn thông tin user từ database
 */
const userModel = require('../models/userModel')

/**
 * Import gardenController để tạo vườn mặc định khi đăng ký
 */
const gardenController = require('../controllers/gardenController')

/**
 * Secret key để ký và verify JWT token
 * 
 * CẢNH BÁO BẢO MẬT:
 * - Trong production, PHẢI sử dụng secret phức tạp hơn
 * - PHẢI lưu trong biến môi trường (process.env.JWT_SECRET)
 * - KHÔNG được commit secret vào git
 * 
 * Ví dụ secret tốt: 'h#J8$2kL@9!zQw3R' hoặc sử dụng crypto để generate
 */
const secret = 'doge';

/**
 * ============================================================================
 * FUNCTION: loginAuthenticate
 * MÔ TẢ: Xử lý đăng nhập người dùng
 * ============================================================================
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Body của request
 * @param {string} req.body.username - Tên đăng nhập
 * @param {string} req.body.password - Mật khẩu (plain text)
 * @param {boolean} req.body.rememberMe - Tùy chọn ghi nhớ đăng nhập
 * 
 * @param {Object} res - Express response object
 * 
 * LUỒNG XỬ LÝ:
 * 1. Nhận username, password từ request body
 * 2. Tìm user trong database theo username
 * 3. So sánh password với hash trong database (dùng bcrypt)
 * 4. Nếu đúng, tạo JWT token và trả về client
 * 5. Nếu sai, trả về lỗi 401 Unauthorized
 * 
 * RESPONSE:
 * - Thành công: { token: "eyJhbGciOiJIUzI1NiIs..." }
 * - Thất bại: { error: "Unauthorized" } (401)
 *           hoặc { error: "Internal Server Error" } (500)
 */
const loginAuthenticate = (req, res) => {
    // Log để debug
    console.log('Received login')
    
    /**
     * Destructuring để lấy username, password, rememberMe từ request body
     * ES6 syntax: const {a, b} = obj tương đương với:
     * const a = obj.a; const b = obj.b;
     */
    const {username, password, rememberMe} = req.body;
    console.log('Received body with: ', username, password)
    
    /**
     * Bước 1: Tìm user trong database theo username
     * getUserByUsername trả về Promise
     */
    userModel.getUserByUsername(username)
    .then(user => {
        /**
         * Bước 2: Kiểm tra user có tồn tại không
         * Nếu không tìm thấy user -> trả về 401 Unauthorized
         */
        if (!user) {
            console.log('Nah, not user')
            return res.status(401).json({error: 'Unauthorized'});
        }
        console.log('Got user')
        
        /**
         * Bước 3: So sánh password người dùng nhập với hash trong database
         * 
         * bcrypt.compare(plainPassword, hashedPassword, callback)
         * - Tự động extract salt từ hash
         * - Hash password nhập vào với cùng salt
         * - So sánh 2 hash
         * 
         * @param {Error|null} err - Lỗi nếu có
         * @param {boolean} result - true nếu password khớp, false nếu không
         */
        bcrypt.compare(password, user.user_Password, (err, result) => {
            console.log('Comparing...')
            
            // Nếu có lỗi hoặc password không khớp
            if (err || !result) {
                console.log('Different password')
                return res.status(401).json({ error: 'Unauthorized'});
            }
            
            /**
             * Bước 4: Tạo JWT token
             * 
             * Thời hạn token:
             * - rememberMe = true: 30 ngày (người dùng muốn duy trì đăng nhập)
             * - rememberMe = false: 1 giờ (tự động logout sau 1 giờ)
             */
            const expiresIn = rememberMe ? '30d' : '1h';
            
            /**
             * jwt.sign(payload, secret, options)
             * 
             * Payload chứa:
             * - id: ID của user (để identify user trong các request sau)
             * - username: Tên đăng nhập
             * 
             * Options:
             * - expiresIn: Thời gian hết hạn của token
             */
            const token = jwt.sign(
                {id: user.user_ID, username: user.user_Username}, 
                secret, 
                {expiresIn}
            );
            
            // Trả về token cho client
            res.json({token});
            console.log('Compare finish')
        });
        
    })
    .catch(error => {
        // Xử lý lỗi database hoặc lỗi không mong muốn
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
    });
}

/**
 * ============================================================================
 * FUNCTION: signUpAuthenticate
 * MÔ TẢ: Xử lý đăng ký tài khoản mới
 * ============================================================================
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Body của request
 * @param {string} req.body.name - Họ tên người dùng
 * @param {string} req.body.username - Tên đăng nhập (phải unique)
 * @param {string} req.body.password - Mật khẩu (plain text, sẽ được hash)
 * 
 * @param {Object} res - Express response object
 * 
 * LUỒNG XỬ LÝ:
 * 1. Kiểm tra username đã tồn tại chưa
 * 2. Hash password bằng bcrypt
 * 3. Tạo user mới trong database
 * 4. Tạo garden mặc định cho user
 * 5. Tạo JWT token và trả về client
 * 
 * RESPONSE:
 * - Thành công: { token: "eyJhbGciOiJIUzI1NiIs..." }
 * - Username đã tồn tại: { error: "Username already exists" } (400)
 * - Lỗi server: { error: "Internal Server Error" } (500)
 */
const signUpAuthenticate = (req, res) => {
    console.log('Received signup')
    
    // Lấy thông tin đăng ký từ request body
    const {name, username, password, email} = req.body;
    console.log(name, username, password, email)
    
    /**
     * Bước 1: Kiểm tra username đã tồn tại trong database chưa
     * Điều này đảm bảo tính unique của username
     */
    userModel.getUserByUsername(username)
    .then((existingUser) => {
        // Nếu đã có user với username này -> báo lỗi
        if (existingUser) {
            console.log('Username already exists')
            return res.status(400).json({error: 'Username already exists'})
        }
        
        /**
         * Bước 2: Hash password trước khi lưu vào database
         * 
         * bcrypt.hash(plainPassword, saltRounds, callback)
         * - saltRounds = 10: Số vòng lặp để generate salt
         *   Càng cao càng an toàn nhưng càng chậm
         *   10 là giá trị cân bằng giữa security và performance
         * 
         * QUAN TRỌNG: KHÔNG BAO GIỜ lưu plain password vào database!
         */
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.log(err);
                return res.status(500).json({error: 'Internal Server Error'});
            }
            console.log('Hashing...')
            
            /**
             * Bước 3: Tạo user mới trong database
             * Lưu hash thay vì plain password
             * Email được lưu vào user_Email và dùng làm notification_email
             */
            userModel.createUser(name, username, hash, email)
            .then(id => {
                console.log('Creating garden')
                
                /**
                 * Bước 4: Tạo garden mặc định cho user mới
                 * Mỗi user khi đăng ký sẽ có 1 garden mặc định
                 * để có thể bắt đầu sử dụng ngay
                 */
                return gardenController.createDefaultGarden(id)
                .then(() => {
                    /**
                     * Bước 5: Tạo notification settings mặc định với email đăng ký
                     * Email đăng ký = email nhận cảnh báo
                     */
                    const db = require('../models/db');
                    const insertQuery = `
                      INSERT INTO tbl_notification_settings 
                      (user_id, notification_email, email_watering, email_temperature, 
                       email_humidity, email_soil_moisture, email_daily_report)
                      VALUES (?, ?, 0, 0, 0, 0, 0)
                    `;
                    
                    db.query(insertQuery, [id, email || null], (err) => {
                      if (err) {
                        console.error('Error creating notification settings:', err);
                        // Không fail signup nếu lỗi notification settings
                      } else {
                        console.log('Notification settings created for user:', id);
                      }
                    });
                    
                    /**
                     * Bước 6: Tạo JWT token cho user mới
                     * Token không có expiresIn -> không hết hạn (không khuyến khích)
                     */
                    const token = jwt.sign({id, username}, secret);
                    res.json({token});
                });
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({error: 'Internal Server Error'});
            });
            console.log('User created')
        })
    })
    .catch((error) => {
        // Xử lý lỗi khi kiểm tra username
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    });
};

/**
 * ============================================================================
 * FUNCTION: getUserInfo
 * MÔ TẢ: Lấy thông tin user đang đăng nhập
 * ============================================================================
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User info được gắn bởi authMiddleware sau khi verify token
 * @param {number} req.user.id - ID của user
 * @param {string} req.user.username - Username của user
 * @param {number} req.user.iat - Issued At - Thời điểm token được tạo (Unix timestamp)
 * @param {number} req.user.exp - Expiration - Thời điểm token hết hạn (Unix timestamp)
 * 
 * @param {Object} res - Express response object
 * 
 * LƯU Ý: Route sử dụng function này PHẢI có authMiddleware
 * để đảm bảo req.user đã được populate
 * 
 * RESPONSE:
 * {
 *   "id": 1,
 *   "username": "johndoe",
 *   "iat": 1699999999,
 *   "exp": 1700086399
 * }
 */
const getUserInfo = (req, res) => {
    // req.user được gắn bởi authMiddleware
    // Chứa payload đã decode từ JWT token
    res.json(req.user);
}

/**
 * Export các functions để sử dụng trong routes
 * 
 * Cách sử dụng trong authRouter.js:
 * const authController = require('../controllers/authController');
 * router.post('/login', authController.loginAuthenticate);
 */
module.exports = {
    loginAuthenticate,   // Xử lý đăng nhập
    signUpAuthenticate,  // Xử lý đăng ký
    getUserInfo          // Lấy thông tin user
}