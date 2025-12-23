/**
 * ============================================================================
 * FILE: controllers/userController.js
 * MÔ TẢ: Controller xử lý các thao tác liên quan đến User (CRUD)
 * ============================================================================
 * 
 * File này implement các chức năng quản lý người dùng theo mô hình CRUD:
 * - Create: Tạo user mới
 * - Read: Lấy thông tin user (tất cả, theo ID, theo username)
 * - Update: Cập nhật thông tin user
 * - Delete: Xóa user
 * 
 * Ngoài ra còn có chức năng lấy dữ liệu vườn của user.
 * 
 * KIẾN TRÚC MVC:
 * Route (userRouter) -> Controller (userController) -> Model (userModel) -> Database
 * 
 * ============================================================================
 */

/**
 * Import User model để thao tác với database
 * User model chứa các phương thức CRUD cho bảng tbl_user
 */
const User = require('../models/userModel')

/**
 * Import gardenModel để lấy thông tin vườn của user
 */
const gardenModel = require('../models/gardenModel')

/**
 * Import sensorModel để lấy dữ liệu cảm biến của vườn
 */
const sensorModel = require('../models/sensorModel')

/**
 * ============================================================================
 * FUNCTION: getAllUsers
 * MÔ TẢ: Lấy danh sách tất cả users trong hệ thống
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/users/getall
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { users: [{user1}, {user2}, ...] }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý BẢO MẬT: Trong production, nên giới hạn các fields trả về
 * và thêm pagination để tránh trả về quá nhiều dữ liệu
 */
const getAllUsers = (req, res) => {
    // Gọi phương thức getAllUsers từ User model
    // Phương thức này thực hiện query: SELECT * FROM tbl_user
    User.getAllUsers()
    .then(users => {
        // Trả về danh sách users dưới dạng JSON
        res.json({users});
    })
    .catch(err => {
        // Log lỗi để debug và trả về response lỗi
        console.log('Error retrieving data from database', err);
        res.status(500).json({ error: 'Internal Server Error'});
    });
};

/**
 * ============================================================================
 * FUNCTION: getUserById
 * MÔ TẢ: Lấy thông tin chi tiết của một user theo ID
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/users/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của user cần tìm (từ URL parameter)
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { user_ID, user_Name, user_Username, ... }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const getUserById = (req, res) => {
    // Lấy id từ URL parameter (ví dụ: /users/5 -> id = 5)
    const id = req.params.id;
    console.log(`Finding id = ${id}`);
    
    // Query database để tìm user theo ID
    User.getUserById(id)
    .then(user => {
        if (!user) {
            // User không tồn tại -> trả về 404
            res.status(404).json({ error: 'User not found' });
        } else {
            // Tìm thấy user -> trả về thông tin
            res.json(user);
        }
    })
    .catch(err => {
        console.log('Error getting user:', err);
        res.status(500).json({ error: 'Internal Server Error'});
    });

}

/**
 * ============================================================================
 * FUNCTION: createUser
 * MÔ TẢ: Tạo user mới trong hệ thống
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /api/v1/users/create
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Thông tin user mới
 * @param {string} req.body.user_Name - Họ tên
 * @param {string} req.body.user_Username - Tên đăng nhập
 * @param {string} req.body.user_Password - Mật khẩu
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User added successfully", id: <insertId> }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý: Function này tạo user trực tiếp, không hash password
 * Nên sử dụng signUpAuthenticate trong authController để đăng ký
 */
const createUser = (req, res) => {
    // Lấy thông tin user từ request body
    const user = req.body;
    
    // Gọi model để insert user vào database
    User.createUser(user)
    .then(result => {
        // Trả về ID của user mới được tạo
        res.json({ message: 'User added successfully', id: result.insertId});
    })
    .catch(err => {
        console.log('Error adding user:', err);
        res.status(500).json({error: 'Internal Server Error'});
    });
}

/**
 * ============================================================================
 * FUNCTION: deleteUser
 * MÔ TẢ: Xóa một user khỏi hệ thống
 * ============================================================================
 * 
 * HTTP Method: DELETE
 * Endpoint: /api/v1/users/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của user cần xóa
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User deleted successfully" }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý: Cần xem xét xóa cascade các dữ liệu liên quan
 * (gardens, sensors, conditions) trước khi xóa user
 */
const deleteUser = (req, res) => {
    const id = req.params.id;
    
    User.deleteUser(id)
    .then( result => {
        // result = số rows bị ảnh hưởng (affectedRows)
        if (result === 1) {
            // Xóa thành công 1 user
            res.json({message: 'User deleted successfully'});
        } else {
            // Không có user nào bị xóa -> user không tồn tại
            res.status(404).json({error: 'User not found'});
        }
    })
    .catch (err => {
        console.log('Error deleting user: ', err);
        res.status(500).json({error: 'Internal Server Error'});
    });
}

/**
 * ============================================================================
 * FUNCTION: updateUser
 * MÔ TẢ: Cập nhật thông tin của một user
 * ============================================================================
 * 
 * HTTP Method: PUT
 * Endpoint: /api/v1/users/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của user cần cập nhật
 * @param {Object} req.body - Thông tin mới của user
 * @param {string} req.body.user_Name - Họ tên mới
 * @param {string} req.body.user_Username - Username mới
 * @param {string} req.body.user_Password - Password mới
 * @param {string} req.body.user_Address - Địa chỉ mới
 * @param {string} req.body.user_Email - Email mới
 * @param {string} req.body.user_Phone - Số điện thoại mới
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "User updated successfully" }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const updateUser = (req, res) => {
    const id = req.params.id;
    const user = req.body;
    
    User.updateUser(id, user)
    .then(result => {
        // Kiểm tra số rows bị ảnh hưởng
        if (result.affectedRows === 0) {
            // Không có row nào được update -> user không tồn tại
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json({ message: 'User updated successfully' });
        }
    })
    .catch(err => {
        console.log('Error updating user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });
}

/**
 * ============================================================================
 * FUNCTION: getUserByUsername
 * MÔ TẢ: Tìm user theo username
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/users/getname/:name
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.name - Username cần tìm
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { user_ID, user_Name, user_Username, ... }
 * - Không tìm thấy (404): { error: "User not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const getUserByUsername = (req, res) => {
    const name = req.params.name;
    
    User.getUserByUsername(name)
    .then(user => {
        if (!user) {
            res.status(404).json({error: 'User not found'});
        } else {
            res.json(user)
        }
    })
    .catch(err => {
        console.log('Error getting user:', err);
        res.status(500).json({error: 'Internal Server Error'});
    });
}

/**
 * ============================================================================
 * FUNCTION: getUserGardenData
 * MÔ TẢ: Lấy thông tin vườn và dữ liệu cảm biến của user đang đăng nhập
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/users/garden/data
 * 
 * YÊU CẦU: Route này cần authMiddleware để xác thực user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User info từ JWT token (được gắn bởi authMiddleware)
 * @param {number} req.user.id - ID của user đang đăng nhập
 * @param {Object} res - Express response object
 * 
 * LUỒNG XỬ LÝ:
 * 1. Lấy userId từ req.user (đã được decode từ JWT)
 * 2. Tìm garden của user theo ownerId
 * 3. Lấy dữ liệu sensor của garden đó
 * 4. Trả về cả garden và sensorData
 * 
 * RESPONSE:
 * - Thành công (200): { garden: {...}, sensorData: [...] }
 * - Không có vườn (404): { error: "Garden not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const getUserGardenData = (req, res) => {
    // Lấy userId từ token đã decode
    // req.user được gắn bởi authMiddleware
    const userId = req.user.id;

    // Bước 1: Tìm garden của user
    gardenModel.getGardenByOwnerId(userId)
    .then((garden) => {
        if (!garden) {
            // User chưa có garden
            res.status(404).json({error: 'Garden not found'});
        } else {
            // Bước 2: Lấy dữ liệu sensor của garden
            sensorModel.getSensorDataByGardenId(garden.garden_ID)
            .then((sensorData) => {
                // Trả về cả thông tin garden và dữ liệu sensor
                res.json({garden, sensorData});
            }).catch((err) => {
                console.log('Error getting sensor data:', err);
                res.status(500).json({error: 'Internal Server Error'});
            });
        }
    }).catch((err) => {
        console.log('Error getting garden:', err);
        res.status(500).json({ error: 'Internal Server Error' });        
    });
}

/**
 * Export các controller functions để sử dụng trong routes
 */
module.exports = {
    getAllUsers,        // Lấy tất cả users
    getUserById,        // Lấy user theo ID
    createUser,         // Tạo user mới
    deleteUser,         // Xóa user
    updateUser,         // Cập nhật user
    getUserByUsername,  // Tìm user theo username
    getUserGardenData,  // Lấy dữ liệu vườn của user
};