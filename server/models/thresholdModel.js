/**
 * ============================================================================
 * FILE: models/thresholdModel.js
 * MÔ TẢ: Model quản lý ngưỡng tưới tự động
 * ============================================================================
 */

const db = require('./db');
// Lazy load mqttModel to avoid circular dependency
// const mqttModel = require('./mqttModel'); // Moved to function level
const deviceModel = require('./deviceModel');

// Helper: publish threshold config to device via MQTT (retain)
const publishThresholdConfig = async (deviceId, threshold) => {
  try {
    // Lazy load mqttModel to avoid circular dependency
    const mqttModel = require('./mqttModel');
    
    const device = await deviceModel.getDeviceById(deviceId);
    if (!device || !device.device_MQTT_ID) {
      console.warn(`[ThresholdModel] Device ${deviceId} not found or missing MQTT ID`);
      return;
    }
    const mqttId = device.device_MQTT_ID;
    // Build payload with threshold_on and threshold_off
    // threshold_on: Ngưỡng thấp (T_low) để KÍCH HOẠT bơm
    // threshold_off: Ngưỡng cao (T_high) để NGẮT bơm
    // Chỉ sử dụng độ ẩm đất (không gửi nhiệt độ và độ ẩm không khí)
    
    // Get pump value - handle both threshold_Pump (database column) and pump (from request)
    // Handle empty string, null, undefined
    const pumpValue = (threshold.threshold_Pump && threshold.threshold_Pump.trim()) 
                      || (threshold.pump && threshold.pump.trim()) 
                      || 'V1';
    
    const configPayload = {
      enable_auto: threshold.threshold_Enabled === 1 || threshold.threshold_Enabled === true,
      threshold_on: threshold.threshold_SoilMoisture_Min ?? null,  // Ngưỡng thấp - KÍCH HOẠT bơm
      threshold_off: threshold.threshold_SoilMoisture_Max ?? null, // Ngưỡng cao - NGẮT bơm
      duration: threshold.threshold_Duration ?? 10,
      pump: pumpValue  // V1, V2, or ALL
    };
    
    // Debug log to check pump value
    console.log(`[ThresholdModel] [${new Date().toISOString()}] Threshold object pump field:`, {
      threshold_Pump: threshold.threshold_Pump,
      pump: threshold.pump,
      pumpValue: pumpValue,
      configPayload_pump: configPayload.pump
    });
    
    const topic = `IOTGARDEN${mqttId}/config`;
    const message = JSON.stringify(configPayload);
    // Log the outgoing MQTT publish details for debugging
    const publishOptions = { qos: 0, retain: true };
    const ts = new Date().toISOString();
    
    console.log(`[ThresholdModel] ========== MQTT PUBLISH TO ESP32 ==========`);
    console.log(`[ThresholdModel] [${ts}] Device Info:`, {
      deviceId: deviceId,
      mqttId: mqttId,
      device_Name: device?.device_Name || 'N/A'
    });
    console.log(`[ThresholdModel] [${ts}] Topic: ${topic}`);
    console.log(`[ThresholdModel] [${ts}] Payload (JSON):`, message);
    console.log(`[ThresholdModel] [${ts}] Payload (Parsed):`, JSON.stringify(configPayload, null, 2));
    console.log(`[ThresholdModel] [${ts}] Publish Options:`, publishOptions);
    console.log(`[ThresholdModel] [${ts}] Message length: ${message.length} bytes`);

    // Use getClient() to get the current client instance (handles initialization timing)
    // Check if mqttModel is available and has getClient method
    let mqttClient = null;
    
    console.log(`[ThresholdModel] [${ts}] Checking MQTT client availability...`);
    console.log(`[ThresholdModel] [${ts}] mqttModel exists:`, !!mqttModel);
    console.log(`[ThresholdModel] [${ts}] mqttModel.getClient type:`, typeof (mqttModel?.getClient));
    console.log(`[ThresholdModel] [${ts}] mqttModel.client exists:`, !!mqttModel?.client);
    
    if (mqttModel) {
      if (typeof mqttModel.getClient === 'function') {
        try {
          mqttClient = mqttModel.getClient();
          console.log(`[ThresholdModel] [${ts}] Got client via getClient():`, mqttClient ? 'exists' : 'null');
        } catch (err) {
          console.error(`[ThresholdModel] [${ts}] Error calling getClient():`, err);
        }
      }
      
      // Fallback to direct client property
      if (!mqttClient && mqttModel.client) {
        mqttClient = mqttModel.client;
        console.log(`[ThresholdModel] [${ts}] Got client via mqttModel.client:`, mqttClient ? 'exists' : 'null');
      }
    }
    
    if (!mqttClient) {
      console.error(`[ThresholdModel] [${ts}] ❌ MQTT client not available!`);
      console.error(`[ThresholdModel] [${ts}] Full mqttModel object keys:`, mqttModel ? Object.keys(mqttModel) : 'N/A');
      console.error(`[ThresholdModel] [${ts}] Skipping publish. Payload was:`, message);
      console.error(`[ThresholdModel] [${ts}] Topic:`, topic);
      console.error(`[ThresholdModel] [${ts}] Note: MQTT client may still be initializing. Check server logs for "Connected to Ohstem MQTT Broker"`);
      return;
    }
    
    const isConnected = mqttClient.connected;
    console.log(`[ThresholdModel] [${ts}] MQTT Client Status:`, {
      connected: isConnected,
      readyState: mqttClient.stream?.readyState || 'N/A',
      clientType: typeof mqttClient
    });
    
    if (!isConnected) {
      console.warn(`[ThresholdModel] [${ts}] ⚠️  MQTT client not connected! Will attempt to publish anyway (may queue).`);
    }
    
    mqttClient.publish(topic, message, publishOptions, (err) => {
      const callbackTs = new Date().toISOString();
      if (err) {
        console.error(`[ThresholdModel] [${callbackTs}] ❌ Error publishing config to ${topic}:`, err);
        console.error(`[ThresholdModel] [${callbackTs}] Error details:`, {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
      } else {
        console.log(`[ThresholdModel] [${callbackTs}] ✓ Successfully published config to ESP32`);
        console.log(`[ThresholdModel] [${callbackTs}] Topic: ${topic}`);
        console.log(`[ThresholdModel] [${callbackTs}] Message: ${message}`);
        // Log payload structure to verify pump field
        console.log(`[ThresholdModel] [${callbackTs}] Config payload structure:`, JSON.stringify(configPayload, null, 2));
        console.log(`[ThresholdModel] [${callbackTs}] ========== MQTT PUBLISH COMPLETED ==========`);
      }
    });
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
      console.log('[ThresholdModel] upsertThreshold called for deviceId=', deviceId, 'threshold=', threshold);
      db.query(checkQuery, [deviceId], (err, results) => {
        if (err) {
          console.error('[ThresholdModel] Error checking existing threshold:', err);
          reject(err);
          return;
        }

        if (results.length > 0) {
          // Update
          // Try to update with threshold_Pump, but handle if column doesn't exist
          let updateQuery = `
            UPDATE tbl_watering_threshold 
            SET threshold_Temp_Min = ?,
                threshold_Temp_Max = ?,
                threshold_Humidity_Min = ?,
                threshold_Humidity_Max = ?,
                threshold_SoilMoisture_Min = ?,
                threshold_SoilMoisture_Max = ?,
                threshold_Enabled = ?,
                threshold_Duration = ?
          `;
          // Add threshold_Pump if provided, otherwise skip
          const hasPump = threshold.threshold_Pump !== undefined && threshold.threshold_Pump !== null;
          if (hasPump) {
            updateQuery += `, threshold_Pump = ?`;
          }
          updateQuery += ` WHERE threshold_DeviceID = ?`;
          const updateParams = [
            threshold.threshold_Temp_Min,
            threshold.threshold_Temp_Max,
            threshold.threshold_Humidity_Min,
            threshold.threshold_Humidity_Max,
            threshold.threshold_SoilMoisture_Min,
            threshold.threshold_SoilMoisture_Max,
            threshold.threshold_Enabled ? 1 : 0,
            threshold.threshold_Duration || 10
          ];
          if (hasPump) {
            updateParams.push(threshold.threshold_Pump);
          }
          updateParams.push(deviceId);
          console.log('[ThresholdModel] Executing UPDATE with params:', updateParams);
          db.query(updateQuery, updateParams, (err, result) => {
            if (err) {
              // Check if error is due to missing threshold_Pump column
              if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage && err.sqlMessage.includes('threshold_Pump')) {
                console.warn('[ThresholdModel] Column threshold_Pump does not exist. Update without pump column and publish with pump from request.');
                // Retry UPDATE without threshold_Pump column
                const updateQueryWithoutPump = `
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
                const updateParamsWithoutPump = [
                  threshold.threshold_Temp_Min,
                  threshold.threshold_Temp_Max,
                  threshold.threshold_Humidity_Min,
                  threshold.threshold_Humidity_Max,
                  threshold.threshold_SoilMoisture_Min,
                  threshold.threshold_SoilMoisture_Max,
                  threshold.threshold_Enabled ? 1 : 0,
                  threshold.threshold_Duration || 10,
                  deviceId
                ];
                db.query(updateQueryWithoutPump, updateParamsWithoutPump, (err2, result2) => {
                  if (err2) {
                    console.error('[ThresholdModel] Error updating threshold (without pump):', err2);
                    reject(err2);
                  } else {
                    // Publish with pump from request object (not from database)
                    publishThresholdConfig(deviceId, threshold).catch(() => {});
                    console.log('[ThresholdModel] Update success (without pump column), affectedRows:', result2.affectedRows);
                    resolve(result2);
                  }
                });
              } else {
                console.error('[ThresholdModel] Error updating threshold:', err);
                reject(err);
              }
            } else {
              // Fetch updated threshold from database to ensure all fields including threshold_Pump are included
              const selectQuery = `SELECT * FROM tbl_watering_threshold WHERE threshold_DeviceID = ? LIMIT 1`;
              db.query(selectQuery, [deviceId], (err2, rows) => {
                if (err2) {
                  console.error('[ThresholdModel] Error fetching threshold after update:', err2);
                  // Still publish with provided threshold object as fallback
                  publishThresholdConfig(deviceId, threshold).catch(() => {});
                  console.log('[ThresholdModel] Update success, affectedRows:', result.affectedRows);
                  resolve(result);
                  return;
                }
                const updatedThreshold = rows && rows.length > 0 ? rows[0] : threshold;
                // Ensure pump is included from original threshold object if database doesn't have it
                if (!updatedThreshold.threshold_Pump && threshold.threshold_Pump) {
                  updatedThreshold.threshold_Pump = threshold.threshold_Pump;
                } else if (!updatedThreshold.threshold_Pump && threshold.pump) {
                  updatedThreshold.threshold_Pump = threshold.pump;
                }
                // Publish updated config asynchronously (do not block)
                publishThresholdConfig(deviceId, updatedThreshold).catch(() => {});
                console.log('[ThresholdModel] Update success, affectedRows:', result.affectedRows);
                resolve(result);
              });
            }
          });
        } else {
          // Insert
          // Try to insert with threshold_Pump, but handle if column doesn't exist
          const hasPump = threshold.threshold_Pump !== undefined && threshold.threshold_Pump !== null;
          let insertQuery = `
            INSERT INTO tbl_watering_threshold 
            (threshold_DeviceID, threshold_Temp_Min, threshold_Temp_Max, 
             threshold_Humidity_Min, threshold_Humidity_Max, 
             threshold_SoilMoisture_Min, threshold_SoilMoisture_Max, 
             threshold_Enabled, threshold_Duration
          `;
          if (hasPump) {
            insertQuery += `, threshold_Pump) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          } else {
            insertQuery += `) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          }
          
          const insertParams = [
            deviceId,
            threshold.threshold_Temp_Min,
            threshold.threshold_Temp_Max,
            threshold.threshold_Humidity_Min,
            threshold.threshold_Humidity_Max,
            threshold.threshold_SoilMoisture_Min,
            threshold.threshold_SoilMoisture_Max,
            threshold.threshold_Enabled ? 1 : 0,
            threshold.threshold_Duration || 10
          ];
          if (hasPump) {
            insertParams.push(threshold.threshold_Pump);
          }
          
          console.log('[ThresholdModel] Executing INSERT with params:', insertParams);
          db.query(insertQuery, insertParams, (err, result) => {
            if (err) {
              // Check if error is due to missing threshold_Pump column
              if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage && err.sqlMessage.includes('threshold_Pump')) {
                console.warn('[ThresholdModel] Column threshold_Pump does not exist. Insert without pump column and publish with pump from request.');
                // Retry INSERT without threshold_Pump column
                const insertQueryWithoutPump = `
                  INSERT INTO tbl_watering_threshold 
                  (threshold_DeviceID, threshold_Temp_Min, threshold_Temp_Max, 
                   threshold_Humidity_Min, threshold_Humidity_Max, 
                   threshold_SoilMoisture_Min, threshold_SoilMoisture_Max, 
                   threshold_Enabled, threshold_Duration)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const insertParamsWithoutPump = [
                  deviceId,
                  threshold.threshold_Temp_Min,
                  threshold.threshold_Temp_Max,
                  threshold.threshold_Humidity_Min,
                  threshold.threshold_Humidity_Max,
                  threshold.threshold_SoilMoisture_Min,
                  threshold.threshold_SoilMoisture_Max,
                  threshold.threshold_Enabled ? 1 : 0,
                  threshold.threshold_Duration || 10
                ];
                db.query(insertQueryWithoutPump, insertParamsWithoutPump, (err2, result2) => {
                  if (err2) {
                    console.error('[ThresholdModel] Error inserting threshold (without pump):', err2);
                    reject(err2);
                  } else {
                    // Publish with pump from request object (not from database)
                    publishThresholdConfig(deviceId, threshold).catch(() => {});
                    console.log('[ThresholdModel] Insert success (without pump column), insertId:', result2.insertId);
                    resolve(result2);
                  }
                });
              } else {
                console.error('[ThresholdModel] Error inserting threshold:', err);
                reject(err);
              }
            } else {
              // Fetch inserted threshold from database to ensure all fields including threshold_Pump are included
              const selectQuery = `SELECT * FROM tbl_watering_threshold WHERE threshold_DeviceID = ? LIMIT 1`;
              db.query(selectQuery, [deviceId], (err2, rows) => {
                if (err2) {
                  console.error('[ThresholdModel] Error fetching threshold after insert:', err2);
                  // Still publish with provided threshold object as fallback
                  publishThresholdConfig(deviceId, threshold).catch(() => {});
                  console.log('[ThresholdModel] Insert success, insertId:', result.insertId);
                  resolve(result);
                  return;
                }
                const insertedThreshold = rows && rows.length > 0 ? rows[0] : threshold;
                // Ensure pump is included from original threshold object if database doesn't have it
                if (!insertedThreshold.threshold_Pump && threshold.threshold_Pump) {
                  insertedThreshold.threshold_Pump = threshold.threshold_Pump;
                } else if (!insertedThreshold.threshold_Pump && threshold.pump) {
                  insertedThreshold.threshold_Pump = threshold.pump;
                }
                // Publish inserted config asynchronously
                publishThresholdConfig(deviceId, insertedThreshold).catch(() => {});
                console.log('[ThresholdModel] Insert success, insertId:', result.insertId);
                resolve(result);
              });
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
        if (err) {
          reject(err);
          return;
        }
        // After update, fetch the threshold row to publish config to device
        const selectQuery = `SELECT * FROM tbl_watering_threshold WHERE threshold_DeviceID = ? LIMIT 1`;
        db.query(selectQuery, [deviceId], (err2, rows) => {
          if (err2) {
            // resolve the update result but log error for publish
            console.error('[ThresholdModel] Error fetching threshold after toggle:', err2);
            resolve(result);
            return;
          }
          const thresholdRow = rows && rows.length > 0 ? rows[0] : null;
          if (thresholdRow) {
            // Publish updated config (do not block)
            publishThresholdConfig(deviceId, thresholdRow).catch(() => {});
          }
          resolve(result);
        });
      });
    });
  }
};

module.exports = Threshold;
// Export helper for external use
module.exports.publishThresholdConfig = publishThresholdConfig;
