/**
 * ============================================================================
 * FILE: config.js
 * MÔ TẢ: File cấu hình chính cho ứng dụng server
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
    host: "localhost", // Host của MySQL server - localhost cho môi trường development
    user: "root", // Username MySQL - 'root' là user mặc định
    password: "", // Password MySQL - để trống cho development (không an toàn cho production!)
    database: "iot_garden", // Tên database chứa dữ liệu ứng dụng IoT Garden
  },
};

/**
 * Export config object để các module khác có thể sử dụng
 *
 * Cách sử dụng trong các file khác:
 * const config = require('./config');
 * console.log(config.db.host); // "localhost"
 */
module.exports = config;
