/**
 * ============================================================================
 * FILE: controllers/thresholdController.js
 * MÔ TẢ: Controller quản lý ngưỡng tưới tự động
 * ============================================================================
 */

const thresholdModel = require('../models/thresholdModel');
const deviceModel = require('../models/deviceModel');
const mqttModel = require('../models/mqttModel');
const emailService = require('../services/emailService');

/**
 * Lấy ngưỡng theo Device ID hoặc theo device_MQTT_ID
 */
const getThreshold = async (req, res) => {
  try {
    const deviceIdentifier = req.params.deviceId;
    // Resolve device by numeric ID or MQTT ID
    let device = null;
    if (!isNaN(Number(deviceIdentifier))) {
      device = await deviceModel.getDeviceById(deviceIdentifier);
    } else {
      device = await deviceModel.getDeviceByMQTTId(deviceIdentifier);
    }

    const deviceId = device ? device.device_ID : null;
    const threshold = deviceId ? await thresholdModel.getThresholdByDeviceId(deviceId) : null;

    if (!threshold) {
      // Trả về default nếu chưa có
      return res.json({
        threshold_DeviceID: deviceId ? parseInt(deviceId) : null,
        threshold_Temp_Min: null,
        threshold_Temp_Max: null,
        threshold_Humidity_Min: null,
        threshold_Humidity_Max: null,
        threshold_SoilMoisture_Min: null,
        threshold_SoilMoisture_Max: null,
        threshold_Enabled: false,
        threshold_Duration: 10
      });
    }
    res.json(threshold);
  } catch (error) {
    console.error('Error getting threshold:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Cập nhật ngưỡng
 */
const updateThreshold = async (req, res) => {
  try {
    const deviceIdentifier = req.params.deviceId;
    const threshold = req.body;

    // Resolve device
    let device = null;
    if (!isNaN(Number(deviceIdentifier))) {
      device = await deviceModel.getDeviceById(deviceIdentifier);
    } else {
      device = await deviceModel.getDeviceByMQTTId(deviceIdentifier);
    }

    if (!device || !device.device_ID) {
      return res.status(400).json({ error: 'Device not found' });
    }

    await thresholdModel.upsertThreshold(device.device_ID, threshold);
    res.json({ message: 'Threshold updated successfully' });
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Bật/tắt tưới tự động
 */
const toggleAutoWatering = async (req, res) => {
  try {
    const deviceIdentifier = req.params.deviceId;
    const { enabled } = req.body;

    // Resolve device
    let device = null;
    if (!isNaN(Number(deviceIdentifier))) {
      device = await deviceModel.getDeviceById(deviceIdentifier);
    } else {
      device = await deviceModel.getDeviceByMQTTId(deviceIdentifier);
    }

    if (!device || !device.device_ID) {
      return res.status(400).json({ error: 'Device not found' });
    }

    await thresholdModel.toggleAutoWatering(device.device_ID, enabled);
    // After toggle, fetch latest threshold and explicitly publish config (ensures payload includes enable_auto)
    try {
      const latest = await thresholdModel.getThresholdByDeviceId(device.device_ID);
      if (latest) {
        // publish via model helper
        await thresholdModel.publishThresholdConfig(device.device_ID, latest).catch(() => {});
        console.log(`[thresholdController] Published config after toggle for device ${device.device_ID}`);
      }
    } catch (pubErr) {
      console.error('[thresholdController] Error publishing config after toggle:', pubErr);
    }

    res.json({ message: `Auto watering ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error toggling auto watering:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/update-config
 * Body: { deviceId, threshold_on, threshold_off, duration }
 * Accepts deviceId as either internal device_ID or device_MQTT_ID
 * Supports backward compatibility with min_soil and max_soil
 * Chỉ sử dụng độ ẩm đất (không dùng nhiệt độ và độ ẩm không khí)
 */
const updateConfig = async (req, res) => {
  try {
    // Log immediately to see what we receive
    console.log('[updateConfig] ========== REQUEST RECEIVED ==========');
    console.log('[updateConfig] Request method:', req.method);
    console.log('[updateConfig] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[updateConfig] Raw req.body type:', typeof req.body);
    console.log('[updateConfig] Raw req.body:', req.body);
    console.log('[updateConfig] Full request body (stringified):', JSON.stringify(req.body, null, 2));
    
    // Support both new format (threshold_on, threshold_off) and old format (min_soil, max_soil)
    // Access req.body directly to ensure we get the data
    const deviceIdentifier = req.body?.deviceId || req.body?.deviceIdentifier;
    const threshold_on = req.body?.threshold_on;
    const threshold_off = req.body?.threshold_off;
    const min_soil = req.body?.min_soil;  // backward compatibility
    const max_soil = req.body?.max_soil;  // backward compatibility
    const duration = req.body?.duration;
    const pump = req.body?.pump || 'V1';  // V1, V2, or ALL - default to V1
    
    // Use new format if available, otherwise fall back to old format
    const minSoil = threshold_on ?? min_soil;
    const maxSoil = threshold_off ?? max_soil;
    
    console.log('[updateConfig] Extracted values:', { 
      deviceIdentifier, 
      threshold_on, 
      threshold_off,
      min_soil,
      max_soil,
      duration
    });
    console.log('[updateConfig] Parsed values (after fallback):', { 
      deviceIdentifier, 
      threshold_on: minSoil, 
      threshold_off: maxSoil, 
      duration,
      raw_threshold_on: threshold_on,
      raw_threshold_off: threshold_off,
      raw_min_soil: min_soil,
      raw_max_soil: max_soil
    });

    // Validate deviceId first
    if (!deviceIdentifier) {
      console.error('[updateConfig] ❌ Missing deviceId');
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId is required',
        received: req.body
      });
    }

    // Basic presence validation - chỉ yêu cầu độ ẩm đất và duration
    const missingFields = [];
    
    // Detailed validation with logging
    console.log('[updateConfig] Validating fields...');
    console.log('[updateConfig] minSoil check:', {
      value: minSoil,
      type: typeof minSoil,
      isNull: minSoil == null,
      isEmpty: minSoil === '',
      isNaN: isNaN(Number(minSoil)),
      numberValue: Number(minSoil)
    });
    
    if (minSoil == null || minSoil === '' || isNaN(Number(minSoil))) {
      missingFields.push('threshold_on');
      console.log('[updateConfig] ❌ threshold_on is missing/invalid');
    }
    
    console.log('[updateConfig] maxSoil check:', {
      value: maxSoil,
      type: typeof maxSoil,
      isNull: maxSoil == null,
      isEmpty: maxSoil === '',
      isNaN: isNaN(Number(maxSoil)),
      numberValue: Number(maxSoil)
    });
    
    if (maxSoil == null || maxSoil === '' || isNaN(Number(maxSoil))) {
      missingFields.push('threshold_off');
      console.log('[updateConfig] ❌ threshold_off is missing/invalid');
    }
    
    console.log('[updateConfig] duration check:', {
      value: duration,
      type: typeof duration,
      isNull: duration == null,
      isEmpty: duration === '',
      isNaN: isNaN(Number(duration)),
      numberValue: Number(duration)
    });
    
    if (duration == null || duration === '' || isNaN(Number(duration))) {
      missingFields.push('duration');
      console.log('[updateConfig] ❌ duration is missing/invalid');
    }
    
    if (missingFields.length > 0) {
      console.error('[updateConfig] ❌ Missing required fields:', missingFields);
      console.error('[updateConfig] Full validation details:', {
        missingFields: missingFields,
        received: {
          deviceId: deviceIdentifier,
          threshold_on: minSoil,
          threshold_off: maxSoil,
          duration: duration
        },
        rawBody: req.body
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missingFields,
        received: {
          deviceId: deviceIdentifier,
          threshold_on: minSoil,
          threshold_off: maxSoil,
          duration: duration
        }
      });
    }
    
    console.log('[updateConfig] ✓ All required fields present');

    // Numeric validation
    const minVal = Number(minSoil);
    const maxVal = Number(maxSoil);
    const dur = Number(duration);

    if (isNaN(minVal) || isNaN(maxVal) || isNaN(dur)) {
      return res.status(400).json({ error: 'Invalid numeric values' });
    }
    if (minVal < 0 || minVal > 100 || maxVal < 0 || maxVal > 100) {
      return res.status(400).json({ error: 'Soil moisture values must be between 0 and 100' });
    }
    // Validate threshold_off > threshold_on
    if (minVal >= maxVal) {
      return res.status(400).json({ error: 'threshold_off (Dừng khi ≥) must be greater than threshold_on (Kích hoạt khi dưới)' });
    }
    if (dur <= 0) {
      return res.status(400).json({ error: 'duration must be > 0' });
    }

    // Resolve device
    let device = null;
    if (!isNaN(Number(deviceIdentifier))) {
      device = await deviceModel.getDeviceById(deviceIdentifier);
    } else {
      device = await deviceModel.getDeviceByMQTTId(deviceIdentifier);
    }

    if (!device || !device.device_ID) {
      return res.status(404).json({ error: 'Device not found' });
    }
    console.log('[updateConfig] ✓ Device resolved:', {
      device_ID: device.device_ID,
      device_MQTT_ID: device.device_MQTT_ID,
      device_Name: device.device_Name
    });

    // Chỉ lưu ngưỡng độ ẩm đất, set null cho nhiệt độ và độ ẩm không khí
    const thresholdObj = {
      threshold_Temp_Min: null,
      threshold_Temp_Max: null,  // Không dùng nhiệt độ
      threshold_Humidity_Min: null,  // Không dùng độ ẩm không khí
      threshold_Humidity_Max: null,  // Không dùng độ ẩm không khí
      threshold_SoilMoisture_Min: minVal,  // threshold_on - Ngưỡng thấp để KÍCH HOẠT bơm
      threshold_SoilMoisture_Max: maxVal,  // threshold_off - Ngưỡng cao để NGẮT bơm
      threshold_Enabled: true,
      threshold_Duration: dur,
      threshold_Pump: pump  // V1, V2, or ALL
    };
    console.log('[updateConfig] Upserting threshold for deviceId=', device.device_ID);
    console.log('[updateConfig] Threshold payload:', JSON.stringify(thresholdObj, null, 2));
    const upsertResult = await thresholdModel.upsertThreshold(device.device_ID, thresholdObj);
    console.log('[updateConfig] ✓ Upsert result:', {
      affectedRows: upsertResult.affectedRows,
      insertId: upsertResult.insertId
    });
    console.log('[updateConfig] ========== REQUEST COMPLETED ==========');

    return res.json({ message: 'Cấu hình đã được cập nhật & gửi xuống thiết bị!' });
  } catch (err) {
    console.error('Error in updateConfig:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Kiểm tra và tự động tưới nếu vượt ngưỡng
 * Hàm này được gọi khi nhận sensor data mới
 */
const checkAndAutoWater = async (deviceId, sensorData) => {
  try {
    const threshold = await thresholdModel.getThresholdByDeviceId(deviceId);
    
    if (!threshold || !threshold.threshold_Enabled) {
      return; // Tưới tự động đang tắt
    }

    const { temperature, humidity, soilMoisture } = sensorData;
    let shouldWater = false;
    let reason = '';

    // Kiểm tra ngưỡng nhiệt độ
    if (threshold.threshold_Temp_Min !== null && temperature < threshold.threshold_Temp_Min) {
      shouldWater = true;
      reason = `Nhiệt độ ${temperature}°C thấp hơn ngưỡng tối thiểu ${threshold.threshold_Temp_Min}°C`;
    }
    if (threshold.threshold_Temp_Max !== null && temperature > threshold.threshold_Temp_Max) {
      shouldWater = true;
      reason = `Nhiệt độ ${temperature}°C cao hơn ngưỡng tối đa ${threshold.threshold_Temp_Max}°C`;
    }

    // Kiểm tra ngưỡng độ ẩm không khí
    if (threshold.threshold_Humidity_Min !== null && humidity < threshold.threshold_Humidity_Min) {
      shouldWater = true;
      reason = `Độ ẩm không khí ${humidity}% thấp hơn ngưỡng tối thiểu ${threshold.threshold_Humidity_Min}%`;
    }
    if (threshold.threshold_Humidity_Max !== null && humidity > threshold.threshold_Humidity_Max) {
      shouldWater = true;
      reason = `Độ ẩm không khí ${humidity}% cao hơn ngưỡng tối đa ${threshold.threshold_Humidity_Max}%`;
    }

    // Kiểm tra ngưỡng độ ẩm đất
    if (threshold.threshold_SoilMoisture_Min !== null && soilMoisture < threshold.threshold_SoilMoisture_Min) {
      shouldWater = true;
      reason = `Độ ẩm đất ${soilMoisture}% thấp hơn ngưỡng tối thiểu ${threshold.threshold_SoilMoisture_Min}%`;
    }
    if (threshold.threshold_SoilMoisture_Max !== null && soilMoisture > threshold.threshold_SoilMoisture_Max) {
      shouldWater = true;
      reason = `Độ ẩm đất ${soilMoisture}% cao hơn ngưỡng tối đa ${threshold.threshold_SoilMoisture_Max}%`;
    }

    if (shouldWater) {
      // Lấy device từ database để lấy MQTT ID
      const device = await deviceModel.getDeviceById(deviceId);
      if (!device) {
        console.error(`[Auto Water] Device ${deviceId} not found`);
        return;
      }
      
      const mqttId = device.device_MQTT_ID;
      const pumpTopic = `IOTGARDEN${mqttId}/feeds/V1`;
      
      // Gửi lệnh tưới
      const mqttClient = mqttModel.getClient ? mqttModel.getClient() : mqttModel.client;
      if (mqttClient && mqttClient.connected) {
        const messageOn = String('1');
        const messageOff = String('0');
        
        console.log(`[Auto Water] Publishing ON command: Topic="${pumpTopic}", Message="${messageOn}"`);
        
        mqttClient.publish(pumpTopic, messageOn, { qos: 0, retain: false }, async (err) => {
          if (err) {
            console.error(`[Auto Water] Error publishing to ${pumpTopic}:`, err);
          } else {
            console.log(`[Auto Water] ✓ Auto watering triggered for Device ${deviceId}: ${reason}`);
            
            // Gửi thông báo email nếu có email trong garden
            const email = device.garden_Email || null;
            if (email) {
              try {
                await emailService.sendWateringNotification(
                  email,
                  device.device_Name || `Thiết bị ${mqttId}`,
                  'auto',
                  threshold.threshold_Duration || 10
                );
                console.log(`[Auto Water] ✓ Notification sent to ${email}`);
              } catch (emailErr) {
                console.error(`[Auto Water] Error sending notification:`, emailErr);
              }
            }
            
            // Tự động tắt sau thời gian chỉ định
            setTimeout(() => {
              console.log(`[Auto Water] Publishing OFF command: Topic="${pumpTopic}", Message="${messageOff}"`);
              const mqttClientForOff = mqttModel.getClient ? mqttModel.getClient() : mqttModel.client;
              if (mqttClientForOff && mqttClientForOff.connected) {
                mqttClientForOff.publish(pumpTopic, messageOff, { qos: 0, retain: false }, (err) => {
                if (err) {
                  console.error(`[Auto Water] Error publishing OFF command to ${pumpTopic}:`, err);
                } else {
                  console.log(`[Auto Water] ✓ Auto watering stopped for Device ${deviceId}`);
                }
              });
              } else {
                console.warn(`[Auto Water] ⚠️  MQTT client not available when trying to turn OFF pump for Device ${deviceId}`);
              }
            }, (threshold.threshold_Duration || 10) * 1000);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in auto water check:', error);
  }
};

module.exports = {
  getThreshold,
  updateThreshold,
  toggleAutoWatering,
  updateConfig,
  checkAndAutoWater
};
