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
 * Lấy ngưỡng theo Device ID
 */
const getThreshold = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const threshold = await thresholdModel.getThresholdByDeviceId(deviceId);
    if (!threshold) {
      // Trả về default nếu chưa có
      return res.json({
        threshold_DeviceID: parseInt(deviceId),
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
    const deviceId = req.params.deviceId;
    const threshold = req.body;

    await thresholdModel.upsertThreshold(deviceId, threshold);
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
    const deviceId = req.params.deviceId;
    const { enabled } = req.body;

    await thresholdModel.toggleAutoWatering(deviceId, enabled);
    res.json({ message: `Auto watering ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error toggling auto watering:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
      if (mqttModel.client) {
        const messageOn = String('1');
        const messageOff = String('0');
        
        console.log(`[Auto Water] Publishing ON command: Topic="${pumpTopic}", Message="${messageOn}"`);
        
        mqttModel.client.publish(pumpTopic, messageOn, { qos: 0, retain: false }, async (err) => {
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
              mqttModel.client.publish(pumpTopic, messageOff, { qos: 0, retain: false }, (err) => {
                if (err) {
                  console.error(`[Auto Water] Error publishing OFF command to ${pumpTopic}:`, err);
                } else {
                  console.log(`[Auto Water] ✓ Auto watering stopped for Device ${deviceId}`);
                }
              });
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
  checkAndAutoWater
};
