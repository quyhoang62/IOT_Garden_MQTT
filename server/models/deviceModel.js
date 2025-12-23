/**
 * ============================================================================
 * FILE: models/deviceModel.js
 * MÔ TẢ: Model quản lý thiết bị ESP32
 * ============================================================================
 */

const db = require('./db');

const Device = {
  /**
   * Lấy tất cả devices
   */
  getAllDevices: function() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT d.*
        FROM tbl_device d
        ORDER BY d.device_ID ASC
      `;
      db.query(query, [], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  /**
   * Lấy device theo ID
   */
  getDeviceById: function(deviceId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT d.*
        FROM tbl_device d
        WHERE d.device_ID = ?
      `;
      db.query(query, [deviceId], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  },

  /**
   * Lấy device theo MQTT ID
   */
  getDeviceByMQTTId: function(mqttId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT d.*
        FROM tbl_device d
        WHERE d.device_MQTT_ID = ?
      `;
      db.query(query, [mqttId], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  },

  // Bỏ getDevicesByGardenId - không còn garden


  /**
   * Thêm device mới
   */
  addDevice: function(device) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO tbl_device 
        (device_Name, device_MQTT_ID, device_Status, device_Location, device_Description, device_Email)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(query, [
        device.device_Name,
        device.device_MQTT_ID,
        device.device_Status || 'ACTIVE',
        device.device_Location || null,
        device.device_Description || null,
        device.device_Email || null
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  /**
   * Cập nhật device
   */
  updateDevice: function(deviceId, device) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE tbl_device 
        SET device_Name = ?,
            device_MQTT_ID = ?,
            device_Status = ?,
            device_Location = ?,
            device_Description = ?,
            device_Email = ?
        WHERE device_ID = ?
      `;
      db.query(query, [
        device.device_Name,
        device.device_MQTT_ID,
        device.device_Status,
        device.device_Location || null,
        device.device_Description || null,
        device.device_Email || null,
        deviceId
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  /**
   * Xóa device
   */
  deleteDevice: function(deviceId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM tbl_device WHERE device_ID = ?`;
      db.query(query, [deviceId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  /**
   * Kiểm tra MQTT ID đã tồn tại chưa
   */
  checkMQTTIdExists: function(mqttId, excludeDeviceId = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT COUNT(*) as count FROM tbl_device WHERE device_MQTT_ID = ?`;
      const params = [mqttId];
      
      if (excludeDeviceId) {
        query += ` AND device_ID != ?`;
        params.push(excludeDeviceId);
      }
      
      db.query(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results[0].count > 0);
      });
    });
  }
};

module.exports = Device;
