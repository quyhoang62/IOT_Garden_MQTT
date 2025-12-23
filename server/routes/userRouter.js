/**
 * ============================================================================
 * FILE: routes/userRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến User (CRUD operations)
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints REST API cho quản lý users.
 * Thực hiện đầy đủ các thao tác CRUD (Create, Read, Update, Delete).
 * 
 * BASE PATH: /api/v1/users (được mount trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬──────────────────────────────┬──────────────────────────────────────┐
 * │ Method │ Endpoint                     │ Mô tả                                │
 * ├────────┼──────────────────────────────┼──────────────────────────────────────┤
 * │ GET    │ /api/v1/users/test           │ Test route                           │
 * │ GET    │ /api/v1/users/getall         │ Lấy tất cả users                     │
 * │ GET    │ /api/v1/users/:id            │ Lấy user theo ID                     │
 * │ GET    │ /api/v1/users/getname/:name  │ Lấy user theo username               │
 * │ GET    │ /api/v1/users/garden/data    │ Lấy garden data của user 🔒          │
 * │ POST   │ /api/v1/users/create         │ Tạo user mới                         │
 * │ PUT    │ /api/v1/users/:id            │ Cập nhật user                        │
 * │ DELETE │ /api/v1/users/:id            │ Xóa user                             │
 * └────────┴──────────────────────────────┴──────────────────────────────────────┘
 * 
 * 🔒 = Yêu cầu JWT token trong header Authorization
 * 
 * ============================================================================
 */

/**
 * Import Express và tạo Router instance
 */
const express = require('express');
const router = express.Router();

/**
 * Import userController chứa logic xử lý cho mỗi route
 */
const userController = require('../controllers/userController')

/**
 * Import authMiddleware để bảo vệ các routes cần authentication
 */
const authMiddleware = require('../middlewares/authMiddleware')


/**
 * ============================================================================
 * ROUTE: GET /api/v1/users/test
 * MÔ TẢ: Endpoint test để kiểm tra router hoạt động
 * ============================================================================
 * 
 * @response {Object} { users: ["userOne", "userTwo", "userThree"] }
 */
router.get('/test', (req, res) => {
    res.json({"users": ["userOne", "userTwo", "userThree"]});
});

/**
 * ============================================================================
 * ROUTE: GET /api/v1/users/getall
 * MÔ TẢ: Lấy danh sách tất cả users
 * ============================================================================
 * 
 * RESPONSE:
 * - Thành công (200): { users: [{user1}, {user2}, ...] }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * CẢNH BÁO: Route này có thể trả về nhiều data
 * Trong production nên thêm pagination
 */
router.get('/getall', userController.getAllUsers);


/**
 * ============================================================================
 * ROUTE: GET /api/v1/users/:id
 * MÔ TẢ: Lấy thông tin user theo ID
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của user (number)
 * 
 * RESPONSE:
 * - Thành công (200): { user_ID, user_Name, user_Username, ... }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: GET /api/v1/users/5
 */
router.get('/:id', userController.getUserById);

/**
 * ============================================================================
 * ROUTE: POST /api/v1/users/create
 * MÔ TẢ: Tạo user mới (không qua authentication flow)
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "user_Name": "John Doe",
 *   "user_Username": "johndoe",
 *   "user_Password": "hashedpassword"
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User added successfully", id: <insertId> }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý: Route này KHÔNG hash password
 * Nên sử dụng /api/v1/signup để đăng ký user mới
 */
router.post('/create', userController.createUser);

/**
 * ============================================================================
 * ROUTE: DELETE /api/v1/users/:id
 * MÔ TẢ: Xóa user theo ID
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của user cần xóa (number)
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User deleted successfully" }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: DELETE /api/v1/users/5
 */
router.delete('/:id', userController.deleteUser);

/**
 * ============================================================================
 * ROUTE: PUT /api/v1/users/:id
 * MÔ TẢ: Cập nhật thông tin user
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của user cần cập nhật (number)
 * 
 * REQUEST BODY:
 * {
 *   "user_Name": "New Name",
 *   "user_Username": "newusername",
 *   "user_Password": "newpassword",
 *   "user_Address": "New Address",
 *   "user_Email": "new@email.com",
 *   "user_Phone": "0123456789"
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User updated successfully" }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: PUT /api/v1/users/5
 */
router.put('/:id', userController.updateUser)

/**
 * ============================================================================
 * ROUTE: GET /api/v1/users/getname/:name
 * MÔ TẢ: Tìm user theo username
 * ============================================================================
 * 
 * URL PARAMS:
 * - :name - Username cần tìm (string)
 * 
 * RESPONSE:
 * - Thành công (200): { user_ID, user_Name, user_Username, ... }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: GET /api/v1/users/getname/johndoe
 */
router.get('/getname/:name', userController.getUserByUsername);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/users/garden/data 🔒
 * MÔ TẢ: Lấy thông tin vườn và dữ liệu cảm biến của user đang đăng nhập
 * ============================================================================
 * 
 * AUTHENTICATION: Yêu cầu JWT token trong header
 * Header: Authorization: Bearer <token>
 * 
 * MIDDLEWARE CHAIN:
 * 1. authMiddleware: Verify JWT token và gắn user info vào req.user
 * 2. userController.getUserGardenData: Lấy garden và sensor data
 * 
 * RESPONSE:
 * - Thành công (200):
 *   {
 *     "garden": { garden_ID, garden_Name, ... },
 *     "sensorData": [{ soil_moisture_Time, dht_Temp, ... }]
 *   }
 * - Không có garden (404): { error: "Garden not found" }
 * - Không có token (401): { error: "Unauthorized" }
 * 
 * USE CASE: Dashboard hiển thị thông tin vườn của user
 */
router.get('/garden/data', authMiddleware, userController.getUserGardenData)


/**
 * Export router để mount trong server.js
 */
module.exports = router;

/**
 * ============================================================================
 * REFERENCE: MySQL Query Result Object
 * ============================================================================
 * 
 * Khi thực hiện INSERT/UPDATE/DELETE, MySQL trả về result object:
 * {
 *   fieldCount: 0,        // Số fields trong result set (0 cho INSERT/UPDATE/DELETE)
 *   affectedRows: 1,      // Số rows bị ảnh hưởng
 *   insertId: 1,          // ID của row vừa INSERT (auto-increment)
 *   serverStatus: 2,      // Status code của server
 *   warningCount: 0,      // Số warnings
 *   message: '',          // Message từ server
 *   protocol41: true,     // Protocol version
 *   changedRows: 0        // Số rows thực sự thay đổi (UPDATE)
 * }
 */
