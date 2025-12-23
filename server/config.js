/**
 * ============================================================================
 * FILE: config.js
 * MÔ TẢ: File cấu hình chính cho ứng dụng server
 * ============================================================================
 * 
 * File này chứa tất cả các thiết lập cấu hình cho ứng dụng, bao gồm:
 * - Thông tin kết nối cơ sở dữ liệu MySQL
 * - Các thiết lập môi trường (development/production)
 * 
 * LÝ DO TÁCH RIÊNG FILE CẤU HÌNH:
 * 1. Dễ dàng quản lý và thay đổi cấu hình mà không cần sửa code logic
 * 2. Bảo mật: Có thể gitignore file này để không commit thông tin nhạy cảm
 * 3. Linh hoạt: Dễ dàng chuyển đổi giữa môi trường dev/staging/production
 * 4. Tái sử dụng: Có thể import config ở bất kỳ đâu trong ứng dụng
 * 
 * ============================================================================
 */

/**
 * Object chứa cấu hình cho ứng dụng
 * 
 * @property {Object} db - Cấu hình kết nối database MySQL
 * @property {string} db.host - Địa chỉ host của MySQL server
 *                              "localhost" cho development, IP/domain cho production
 * @property {string} db.user - Tên đăng nhập MySQL (mặc định: "root" cho development)
 * @property {string} db.password - Mật khẩu MySQL (để trống cho development)
 * @property {string} db.database - Tên database sử dụng cho ứng dụng IoT Garden
 */
const config = {
  db: {
    host: "localhost",      // Host của MySQL server - localhost cho môi trường development
    user: "root",           // Username MySQL - 'root' là user mặc định
    password: "",           // Password MySQL - để trống cho development (không an toàn cho production!)
    database: "iot_garden", // Tên database chứa dữ liệu ứng dụng IoT Garden
  },
};

/**
 * ============================================================================
 * PHIÊN BẢN PRODUCTION (Đã comment)
 * ============================================================================
 * 
 * Phiên bản bên dưới sử dụng biến môi trường (environment variables) 
 * thông qua thư viện 'dotenv'. Đây là cách làm AN TOÀN và được KHUYẾN NGHỊ
 * cho môi trường production vì:
 * 
 * 1. Thông tin nhạy cảm không bị lộ trong source code
 * 2. Có thể thay đổi cấu hình mà không cần deploy lại code
 * 3. Mỗi môi trường (dev/staging/prod) có thể có file .env riêng
 * 
 * Cách sử dụng:
 * 1. Cài đặt dotenv: npm install dotenv
 * 2. Tạo file .env ở thư mục root với nội dung:
 *    MYSQL_HOST=your_host
 *    MYSQL_USER=your_username
 *    MYSQL_PASSWORD=your_password
 *    MYSQL_DATABASE=iot_garden
 *    MYSQL_PORT=3306
 * 3. Thêm .env vào .gitignore
 * 4. Uncomment đoạn code bên dưới và comment đoạn code ở trên
 */

// require('dotenv').config(); // Load biến môi trường từ file .env
// const config = {
//     db: {
//         host: process.env.MYSQL_HOST,         // Đọc host từ biến môi trường
//         user: process.env.MYSQL_USER,         // Đọc username từ biến môi trường
//         password: process.env.MYSQL_PASSWORD, // Đọc password từ biến môi trường
//         database: process.env.MYSQL_DATABASE, // Đọc database name từ biến môi trường
//         port: process.env.MYSQL_PORT,         // Đọc port từ biến môi trường (mặc định 3306)
//     }
// };

/**
 * Export config object để các module khác có thể sử dụng
 * 
 * Cách sử dụng trong các file khác:
 * const config = require('./config');
 * console.log(config.db.host); // "localhost"
 */
module.exports = config;
