/**
 * ============================================================================
 * FILE: models/thresholdModel.js
 * MÔ TẢ: Model quản lý ngưỡng tưới tự động
 * ============================================================================
 */

const db = require('./db');
const mqttModel = require('./mqttModel');
const deviceModel = require('./deviceModel');

// Helper: publish threshold config to device via MQTT (retain)
const publishThresholdConfig = async (deviceId, threshold) => {
  try {
    const device = await deviceModel.getDeviceById(deviceId);
    if (!device || !device.device_MQTT_ID) return;
    const mqttId = device.device_MQTT_ID;
    const configPayload = {
      min_soil: threshold.threshold_SoilMoisture_Min ?? null,
      max_soil: threshold.threshold_SoilMoisture_Max ?? null,
      max_temp: threshold.threshold_Temp_Max ?? null,
      duration: threshold.threshold_Duration ?? 10
    };
    const topic = `IOTGARDEN${mqttId}/config`;
    const message = JSON.stringify(configPayload);
    if (mqttModel.client) {
      mqttModel.client.publish(topic, message, { qos: 0, retain: true }, (err) => {
        if (err) {
          console.error(`[ThresholdModel] Error publishing config to ${topic}:`, err);
        } else {
          console.log(`[ThresholdModel] Published config to ${topic}: ${message} (retain=true)`);
        }
      });
    } else {
      console.warn('[ThresholdModel] MQTT client not initialized, skipping publish');
    }
  } catch (err) {
    console.error('[ThresholdModel] publishThresholdConfig error:', err);
  }
};

const Threshold = {
  /**
   * Lấy ngưỡng theo Device ID
   */
  getThresholdByDeviceId: function(deviceId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM tbl_watering_threshold WHERE threshold_DeviceID = ?`;
      db.query(query, [deviceId], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  },

  /**
   * Thêm hoặc cập nhật ngưỡng
   */
  upsertThreshold: function(deviceId, threshold) {
    return new Promise((resolve, reject) => {
      // Kiểm tra đã tồn tại chưa
      const checkQuery = `SELECT threshold_ID FROM tbl_watering_threshold WHERE threshold_DeviceID = ?`;
      db.query(checkQuery, [deviceId], (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        if (results.length > 0) {
          // Update
          const updateQuery = `
            UPDATE tbl_watering_threshold 
            SET threshold_Temp_Min = ?,
                threshold_Temp_Max = ?,
                threshold_Humidity_Min = ?,
                threshold_Humidity_Max = ?,
                threshold_SoilMoisture_Min = ?,
                threshold_SoilMoisture_Max = ?,
                threshold_Enabled = ?,
                threshold_Duration = ?
            WHERE threshold_DeviceID = ?
          `;
          db.query(updateQuery, [
            threshold.threshold_Temp_Min,
            threshold.threshold_Temp_Max,
            threshold.threshold_Humidity_Min,
            threshold.threshold_Humidity_Max,
            threshold.threshold_SoilMoisture_Min,
            threshold.threshold_SoilMoisture_Max,
            threshold.threshold_Enabled ? 1 : 0,
            threshold.threshold_Duration || 10,
            deviceId
          ], (err, result) => {
            if (err) reject(err);
            else {
              // Publish updated config asynchronously (do not block)
              publishThresholdConfig(deviceId, threshold).catch(() => {});
              resolve(result);
            }
          });
        } else {
          // Insert
          const insertQuery = `
            INSERT INTO tbl_watering_threshold 
            (threshold_DeviceID, threshold_Temp_Min, threshold_Temp_Max, 
             threshold_Humidity_Min, threshold_Humidity_Max, 
             threshold_SoilMoisture_Min, threshold_SoilMoisture_Max, 
             threshold_Enabled, threshold_Duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(insertQuery, [
            deviceId,
            threshold.threshold_Temp_Min,
            threshold.threshold_Temp_Max,
            threshold.threshold_Humidity_Min,
            threshold.threshold_Humidity_Max,
            threshold.threshold_SoilMoisture_Min,
            threshold.threshold_SoilMoisture_Max,
            threshold.threshold_Enabled ? 1 : 0,
            threshold.threshold_Duration || 10
          ], (err, result) => {
            if (err) reject(err);
            else {
              // Publish inserted config asynchronously
              publishThresholdConfig(deviceId, threshold).catch(() => {});
              resolve(result);
            }
          });
        }
      });
    });
  },

  /**
   * Bật/tắt tưới tự động
   */
  toggleAutoWatering: function(deviceId, enabled) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE tbl_watering_threshold 
        SET threshold_Enabled = ?
        WHERE threshold_DeviceID = ?
      `;
      db.query(query, [enabled ? 1 : 0, deviceId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
};

module.exports = Threshold;
