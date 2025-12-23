/**
 * ============================================================================
 * FILE: models/scheduleModel.js
 * MÔ TẢ: Model quản lý lịch tưới tự động
 * ============================================================================
 */

const db = require('./db');

const Schedule = {
  /**
   * Lấy tất cả lịch tưới theo Device ID
   */
  getSchedulesByDeviceId: function(deviceId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, d.device_MQTT_ID 
        FROM tbl_irrigation_schedule s
        LEFT JOIN tbl_device d ON s.schedule_DeviceID = d.device_ID
        WHERE s.schedule_DeviceID = ? 
        ORDER BY s.schedule_Time ASC
      `;
      db.query(query, [deviceId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  /**
   * Lấy lịch tưới theo ID
   */
  getScheduleById: function(scheduleId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM tbl_irrigation_schedule WHERE schedule_ID = ?`;
      db.query(query, [scheduleId], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  },

  /**
   * Tạo lịch tưới mới
   */
  createSchedule: function(scheduleData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO tbl_irrigation_schedule 
        (schedule_DeviceID, schedule_Pump, schedule_Days, 
         schedule_Time, schedule_Hour24, schedule_Minute, schedule_Duration, schedule_Status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        scheduleData.deviceId,
        scheduleData.pump,
        scheduleData.days,
        scheduleData.time,
        scheduleData.hour24,
        scheduleData.minute,
        scheduleData.duration,
        scheduleData.status || 1
      ];
      console.log('[SCHEDULE MODEL] Executing query:', query);
      console.log('[SCHEDULE MODEL] With values:', values);
      db.query(query, values, (err, results) => {
        if (err) {
          console.error('[SCHEDULE MODEL] Database error:', err);
          console.error('[SCHEDULE MODEL] Error code:', err.code);
          console.error('[SCHEDULE MODEL] Error message:', err.message);
          reject(err);
        } else {
          console.log('[SCHEDULE MODEL] Insert successful, insertId:', results.insertId);
          resolve({ id: results.insertId, ...scheduleData });
        }
      });
    });
  },

  /**
   * Cập nhật lịch tưới
   */
  updateSchedule: function(scheduleId, scheduleData) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE tbl_irrigation_schedule 
        SET schedule_Pump = ?,
            schedule_Days = ?,
            schedule_Time = ?,
            schedule_Hour24 = ?,
            schedule_Minute = ?,
            schedule_Duration = ?,
            schedule_Status = ?
        WHERE schedule_ID = ?
      `;
      const values = [
        scheduleData.pump,
        scheduleData.days,
        scheduleData.time,
        scheduleData.hour24,
        scheduleData.minute,
        scheduleData.duration,
        scheduleData.status,
        scheduleId
      ];
      db.query(query, values, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  /**
   * Xóa lịch tưới
   */
  deleteSchedule: function(scheduleId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM tbl_irrigation_schedule WHERE schedule_ID = ?`;
      db.query(query, [scheduleId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  /**
   * Lấy tất cả lịch tưới đang active để thực thi
   */
  getActiveSchedules: function() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, d.device_MQTT_ID 
        FROM tbl_irrigation_schedule s
        LEFT JOIN tbl_device d ON s.schedule_DeviceID = d.device_ID
        WHERE s.schedule_Status = 1
        ORDER BY s.schedule_Hour24 ASC, s.schedule_Minute ASC
      `;
      db.query(query, [], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  /**
   * Toggle status của lịch (Active/Paused)
   */
  toggleScheduleStatus: function(scheduleId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE tbl_irrigation_schedule 
        SET schedule_Status = NOT schedule_Status
        WHERE schedule_ID = ?
      `;
      db.query(query, [scheduleId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
};

module.exports = Schedule;

