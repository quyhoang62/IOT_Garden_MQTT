/**
 * ============================================================================
 * FILE: models/userModel.js
 * MÔ TẢ: Model xử lý các thao tác database liên quan đến User
 * ============================================================================
 * 
 * File này implement Data Access Layer cho bảng tbl_user.
 * Sử dụng Promise-based API để dễ dàng sử dụng với async/await.
 * 
 * BẢNG DATABASE: tbl_user
 * ┌─────────────────┬──────────────┬─────────────────────────────────────────┐
 * │ Column          │ Type         │ Mô tả                                   │
 * ├─────────────────┼──────────────┼─────────────────────────────────────────┤
 * │ user_ID         │ INT (PK)     │ ID tự động tăng, khóa chính             │
 * │ user_Name       │ VARCHAR      │ Họ tên đầy đủ của user                  │
 * │ user_Username   │ VARCHAR      │ Tên đăng nhập (unique)                  │
 * │ user_Password   │ VARCHAR      │ Mật khẩu đã hash (bcrypt)               │
 * │ user_Address    │ VARCHAR      │ Địa chỉ (optional)                      │
 * │ user_Email      │ VARCHAR      │ Email (optional)                        │
 * │ user_Phone      │ VARCHAR      │ Số điện thoại (optional)                │
 * └─────────────────┴──────────────┴─────────────────────────────────────────┘
 * 
 * KIẾN TRÚC:
 * Controller -> Model (file này) -> db.js -> MySQL Database
 * 
 * ============================================================================
 */

/**
 * Import database connection từ db.js
 * db object có method query() để thực hiện SQL queries
 */
const db = require("./db");

/**
 * User Model Object
 * Chứa tất cả các phương thức CRUD cho bảng tbl_user
 * 
 * Pattern: Module Pattern với Object chứa các methods
 * Mỗi method trả về Promise để hỗ trợ async/await
 */
const User = {
  /**
   * ============================================================================
   * METHOD: getAllUsers
   * MÔ TẢ: Lấy danh sách tất cả users trong database
   * ============================================================================
   * 
   * @returns {Promise<Array>} - Promise resolve với array chứa tất cả users
   * 
   * SQL: SELECT * FROM tbl_user
   * 
   * CẢNH BÁO: Trong production với nhiều users, nên thêm:
   * - Pagination (LIMIT, OFFSET)
   * - Không SELECT * mà chỉ select các fields cần thiết
   * - Loại bỏ password khỏi kết quả
   */
  getAllUsers: function () {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM tbl_user", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  /**
   * ============================================================================
   * METHOD: getUserById
   * MÔ TẢ: Lấy thông tin một user theo ID
   * ============================================================================
   * 
   * @param {number} id - ID của user cần tìm
   * @returns {Promise<Object|undefined>} - Promise resolve với user object hoặc undefined
   * 
   * SQL: SELECT * FROM tbl_user WHERE user_ID = ?
   * 
   * LƯU Ý: 
   * - Trả về rows[0] vì chỉ có 1 user với ID đó (hoặc không có)
   * - Nếu không tìm thấy, trả về undefined
   */
  getUserById: function (id) {
    // return db.query('SELECT * FROM tbl_user WHERE user_ID = ?', [id], callback);
    return new Promise((resolve, reject) => {
      /**
       * Parameterized query để tránh SQL Injection
       * ? sẽ được thay thế bằng giá trị id một cách an toàn
       */
      db.query("SELECT * FROM tbl_user WHERE user_ID = ?", id, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Trả về user đầu tiên (hoặc undefined nếu không có)
          resolve(rows[0]);
        }
      });
    });
  },

  /**
   * ============================================================================
   * METHOD: deleteUser
   * MÔ TẢ: Xóa một user khỏi database
   * ============================================================================
   * 
   * @param {number} id - ID của user cần xóa
   * @returns {Promise<number>} - Promise resolve với số rows bị ảnh hưởng
   * 
   * SQL: DELETE FROM tbl_user WHERE user_ID = ?
   * 
   * RETURN VALUE:
   * - 1: Xóa thành công 1 user
   * - 0: Không có user nào bị xóa (ID không tồn tại)
   * 
   * CẢNH BÁO: Cần xử lý cascade delete cho:
   * - tbl_garden (garden_OwnerID)
   * - Và các bảng liên quan khác
   */
  deleteUser: function (id) {
    // return db.query('DELETE FROM tbl_user WHERE user_ID = ?', [id], callback);
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM tbl_user WHERE user_ID = ?",
        [id],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            // result.affectedRows: Số rows bị ảnh hưởng bởi DELETE
            resolve(result.affectedRows);
          }
        }
      );
    });
  },

  /**
   * ============================================================================
   * METHOD: updateUser
   * MÔ TẢ: Cập nhật thông tin user
   * ============================================================================
   * 
   * @param {number} id - ID của user cần cập nhật
   * @param {Object} user - Object chứa thông tin mới
   * @param {string} user.user_Name - Họ tên mới
   * @param {string} user.user_Username - Username mới
   * @param {string} user.user_Password - Password mới (đã hash)
   * @param {string} user.user_Address - Địa chỉ mới
   * @param {string} user.user_Email - Email mới
   * @param {string} user.user_Phone - Số điện thoại mới
   * @returns {Promise<number>} - Promise resolve với số rows bị ảnh hưởng
   * 
   * SQL: UPDATE tbl_user SET ... WHERE user_ID = ?
   * 
   * LƯU Ý:
   * - Tất cả fields đều được update, kể cả null
   * - Nên validate dữ liệu trước khi gọi method này
   */
  updateUser: function (id, user) {
    // return db.query('UPDATE tbl_user SET user_Name = ?, user_Username = ?, user_Password = ?, user_Address = ?, user_Email = ?, user_Phone = ? WHERE user_ID = ?', [user.user_Name, user.user_Username, user.user_Password, user.user_Address, user.user_Email, user.user_Phone, id], callback);
    return new Promise((resolve, reject) => {
      /**
       * UPDATE query với multiple SET clauses
       * Thứ tự parameters phải khớp với thứ tự ? trong query
       */
      db.query(
        "UPDATE tbl_user SET user_Name = ?, user_Username = ?, user_Password = ?, user_Address = ?, user_Email = ?, user_Phone = ? WHERE user_ID = ?",
        [
          user.user_Name,      // SET user_Name = ?
          user.user_Username,  // SET user_Username = ?
          user.user_Password,  // SET user_Password = ?
          user.user_Address,   // SET user_Address = ?
          user.user_Email,     // SET user_Email = ?
          user.user_Phone,     // SET user_Phone = ?
          id,                  // WHERE user_ID = ?
        ],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            // Trả về số rows bị ảnh hưởng
            resolve(result.affectedRows);
          }
        }
      );
    });
  },

  /**
   * ============================================================================
   * METHOD: getUserByUsername
   * MÔ TẢ: Tìm user theo username
   * ============================================================================
   * 
   * @param {string} name - Username cần tìm
   * @returns {Promise<Object|undefined>} - Promise resolve với user object hoặc undefined
   * 
   * SQL: SELECT * FROM tbl_user WHERE user_Username = ?
   * 
   * USE CASES:
   * - Kiểm tra username đã tồn tại khi đăng ký
   * - Tìm user khi đăng nhập
   * 
   * LƯU Ý: Username là unique trong database
   */
  getUserByUsername: function (name) {
    // return db.query('SELECT * FROM tbl_user WHERE user_Username = ?', callback);
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM tbl_user WHERE user_Username = ?",
        [name],
        (err, rows) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            // Trả về user đầu tiên (hoặc undefined)
            resolve(rows[0]);
          }
        }
      );
    });
  },

  /**
   * ============================================================================
   * METHOD: createUser
   * MÔ TẢ: Tạo user mới trong database
   * ============================================================================
   * 
   * @param {string} name - Họ tên user
   * @param {string} username - Tên đăng nhập (unique)
   * @param {string} hash - Mật khẩu đã hash bằng bcrypt
   * @returns {Promise<number>} - Promise resolve với ID của user mới (insertId)
   * 
   * SQL: INSERT INTO tbl_user (user_Name, user_Username, user_Password) VALUES (?, ?, ?)
   * 
   * ĐƯỢC GỌI TỪ: authController.signUpAuthenticate()
   * 
   * LƯU Ý:
   * - Password PHẢI được hash trước khi gọi method này
   * - Không bao giờ lưu plain text password
   * - insertId là ID tự động tăng được MySQL generate
   */
  createUser: function (name, username, hash, email = null) {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO tbl_user (user_Name, user_Username, user_Password, user_Email, user_Role) VALUES (?, ?, ?, ?, 'USER')",
        [name, username, hash, email],
        (err, result) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            // console.log(result);
            // result.insertId: ID của row vừa được insert
            resolve(result.insertId);
          }
        }
      );
    });
  },
};

/**
 * Export User model để các controllers sử dụng
 * 
 * Cách sử dụng:
 * const User = require('../models/userModel');
 * const user = await User.getUserById(1);
 */
module.exports = User;
