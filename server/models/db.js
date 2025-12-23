/**
 * ============================================================================
 * FILE: models/db.js
 * MÔ TẢ: Module kết nối cơ sở dữ liệu MySQL
 * ============================================================================
 * 
 * File này chịu trách nhiệm:
 * 1. Thiết lập kết nối đến MySQL database
 * 2. Export connection object để các model khác sử dụng
 * 
 * Đây là file CƠ SỞ cho tất cả các thao tác database trong ứng dụng.
 * Tất cả các model (userModel, gardenModel, sensorModel...) đều import
 * connection từ file này để thực hiện query.
 * 
 * KIẾN TRÚC:
 * config.js --> db.js --> các Model files --> các Controller files
 * 
 * ============================================================================
 */

/**
 * Load biến môi trường từ file .env (nếu có)
 * Thư viện dotenv cho phép đọc các biến môi trường từ file .env
 * và đưa vào process.env
 */
require('dotenv').config();

/**
 * Import thư viện mysql2
 * 
 * mysql2 là phiên bản cải tiến của mysql với các ưu điểm:
 * - Hỗ trợ Promise API
 * - Performance tốt hơn
 * - Hỗ trợ prepared statements
 * - Tương thích ngược với mysql package
 * 
 * Tài liệu: https://www.npmjs.com/package/mysql2
 */
const mysql = require('mysql2');

/**
 * Import cấu hình database từ config.js
 * config.db chứa: host, user, password, database
 */
const config = require('../config')

/**
 * Tạo kết nối đến MySQL database
 * 
 * mysql.createConnection() tạo một connection object với các thông tin:
 * - host: Địa chỉ server MySQL (localhost hoặc IP)
 * - user: Tên đăng nhập MySQL
 * - password: Mật khẩu MySQL
 * - database: Tên database sẽ sử dụng
 * 
 * Connection này được sử dụng trong toàn bộ vòng đời của ứng dụng
 * 
 * LƯU Ý: Trong production, nên sử dụng Connection Pool thay vì single connection
 * để xử lý nhiều request đồng thời hiệu quả hơn:
 * const pool = mysql.createPool(config.db);
 * 
 * @type {mysql.Connection}
 */
const connection = mysql.createConnection(config.db);

/**
 * Thực hiện kết nối đến database
 * 
 * connection.connect() là phương thức bất đồng bộ (asynchronous)
 * Callback function được gọi khi kết nối hoàn tất hoặc có lỗi
 * 
 * @param {Error|null} err - Object lỗi nếu kết nối thất bại, null nếu thành công
 * 
 * Các lỗi thường gặp:
 * - ECONNREFUSED: MySQL server không chạy hoặc sai host/port
 * - ER_ACCESS_DENIED_ERROR: Sai username hoặc password
 * - ER_BAD_DB_ERROR: Database không tồn tại
 * - ETIMEDOUT: Timeout khi kết nối (thường do firewall)
 */
connection.connect((err)=>{
    if (err){
        // Ghi log lỗi khi không thể kết nối database
        // Đây là lỗi nghiêm trọng - ứng dụng không thể hoạt động nếu không có database
        console.log('Error connecting to database:', err);
    } else {
        // Thông báo kết nối thành công
        console.log('Connected to database');
    }
});

/**
 * Export connection object để các module khác sử dụng
 * 
 * Cách sử dụng trong các model:
 * const db = require('./db');
 * db.query('SELECT * FROM tbl_user', (err, results) => { ... });
 * 
 * Các phương thức quan trọng của connection:
 * - query(sql, values, callback): Thực thi SQL query
 * - execute(sql, values, callback): Thực thi prepared statement
 * - end(): Đóng kết nối
 * - destroy(): Đóng kết nối ngay lập tức (không chờ query hoàn tất)
 */
module.exports = connection;