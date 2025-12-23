/**
 * ============================================================================
 * FILE: controllers/mqttController.js
 * MÔ TẢ: Controller xử lý giao tiếp MQTT với thiết bị IoT
 * ============================================================================
 * 
 * MQTT (Message Queuing Telemetry Transport) là giao thức messaging nhẹ,
 * được thiết kế cho các thiết bị IoT với băng thông và tài nguyên hạn chế.
 * 
 * KIẾN TRÚC MQTT:
 * ┌─────────────┐    subscribe/publish    ┌─────────────────┐
 * │  IoT Device │ ◄─────────────────────► │   MQTT Broker   │
 * │  (ESP32)    │                         │   (Ohstem)      │
 * └─────────────┘                         └────────┬────────┘
 *                                                  │ subscribe/publish
 *                                         ┌────────▼────────┐
 *                                         │   Node.js       │
 *                                         │   Server        │
 *                                         └─────────────────┘
 * 
 * MQTT TOPICS ĐƯỢC SỬ DỤNG:
 * - IOTGARDEN222/feeds/V1: Điều khiển máy bơm (pump)
 *   + Publish '1': Bật máy bơm
 *   + Publish '0': Tắt máy bơm
 * - IOTGARDEN222/feeds/V3: Nhiệt độ không khí
 * - IOTGARDEN222/feeds/V4: Độ ẩm không khí
 * - IOTGARDEN222/feeds/V5: Độ ẩm đất
 * 
 * ============================================================================
 */

/**
 * Import mqttModel - module quản lý kết nối MQTT và dữ liệu messages
 */
const mqttModel = require('../models/mqttModel')

/**
 * Import deviceModel để lấy thông tin device
 */
const deviceModel = require('../models/deviceModel')

/**
 * Import emailService để gửi thông báo tưới nước
 */
const emailService = require('../services/emailService')

/**
 * Import sensorModel (hiện không sử dụng trực tiếp trong file này)
 * Có thể được dùng để lưu dữ liệu sensor
 */
const sensorModel = require('../models/sensorModel')

/**
 * ============================================================================
 * FUNCTION: getLatestMessage
 * MÔ TẢ: Lấy dữ liệu mới nhất từ tất cả các cảm biến
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /latest-message
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * {
 *   message: {
 *     pump: <0|1|null>,           // Trạng thái máy bơm
 *     air_temperature: <number>,  // Nhiệt độ không khí (°C)
 *     air_humid: <number>,        // Độ ẩm không khí (%)
 *     soil_moisture: <number>     // Độ ẩm đất (%)
 *   }
 * }
 * 
 * USE CASE:
 * - Frontend poll định kỳ để hiển thị real-time data
 * - Dashboard monitoring
 * - Mobile app hiển thị trạng thái hiện tại
 * 
 * LƯU Ý: Đây là dữ liệu được cache trong memory (latestMessages)
 * được cập nhật mỗi khi nhận message từ MQTT broker
 */
const getLatestMessage = (req, res) => {
    // Gọi mqttModel để lấy object chứa messages mới nhất
    const latestMessage = mqttModel.getLatestMessages();
    res.json({ message: latestMessage });
};

/**
 * ============================================================================
 * FUNCTION: startPump
 * MÔ TẢ: Điều khiển bật máy bơm tưới nước
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /startPump
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Body của request
 * @param {string} req.body.pump - ID hoặc tên của máy bơm (for logging)
 * @param {Object} res - Express response object
 * 
 * LUỒNG HOẠT ĐỘNG:
 * 1. Nhận request bật máy bơm từ client
 * 2. Publish message '1' đến topic V1 để BẬT máy bơm
 * 3. Đặt timer 10 giây
 * 4. Sau 10 giây, publish message '0' để TẮT máy bơm
 * 5. Trả response ngay lập tức (không chờ pump tắt)
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Pump started" }
 * 
 * MQTT PROTOCOL:
 * - Topic: IOTGARDEN222/feeds/V1
 * - Message: '1' (bật) hoặc '0' (tắt)
 * - QoS: 0 (mặc định - at most once)
 * 
 * THỜI GIAN TƯỚI: 10 giây (10000ms)
 * Có thể điều chỉnh setTimeout để thay đổi thời gian tưới
 * 
 * CẢNH BÁO:
 * - Nếu server restart trong khi pump đang chạy, pump sẽ không tự tắt
 * - Nên có cơ chế watchdog ở thiết bị IoT để tự tắt sau timeout
 */
const startPump = async (req, res) => {
    // Lấy thông tin từ request
    // Hỗ trợ cả deviceId (database ID) hoặc deviceIds (array) hoặc mqttId
    const { pump, duration = 10, deviceId, deviceIds, mqttId, mqttIds, mode = 'MANUAL' } = req.body;

    // Kiểm tra client MQTT đã kết nối chưa (sử dụng getter để tránh race condition)
    const mqttClient = mqttModel.getClient ? mqttModel.getClient() : mqttModel.client;
    if (!mqttClient || !mqttClient.connected) {
        console.error('[MQTT] Client not connected');
        return res.status(500).json({ error: 'MQTT client not connected' });
    }

    // Hỗ trợ nhiều thiết bị: nếu có deviceIds hoặc mqttIds, xử lý tất cả
    const devicesToControl = [];
    
    if (deviceIds && Array.isArray(deviceIds)) {
        // Nếu có array deviceIds (database IDs)
        for (const id of deviceIds) {
            const device = await deviceModel.getDeviceById(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (mqttIds && Array.isArray(mqttIds)) {
        // Nếu có array mqttIds (MQTT IDs)
        for (const id of mqttIds) {
            const device = await deviceModel.getDeviceByMQTTId(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (deviceId) {
        // Single device by database ID
        const device = await deviceModel.getDeviceById(deviceId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    } else if (mqttId) {
        // Single device by MQTT ID
        const device = await deviceModel.getDeviceByMQTTId(mqttId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    }
    
    // Validate có thiết bị nào không
    if (devicesToControl.length === 0) {
        console.error('[MQTT] No valid devices found');
        return res.status(400).json({ error: 'No valid devices found. Provide deviceId, deviceIds, mqttId, or mqttIds' });
    }
    
    console.log(`[MQTT] Controlling ${devicesToControl.length} device(s) for watering`);

    /**
     * Bước 1: Publish message '1' để BẬT máy bơm cho tất cả thiết bị
     */
    const messageOn = String('1');
    const messageOff = String('0');
    // Allow longer durations up to 60 minutes (3600s). Min 1s.
    const pumpDuration = Math.min(Math.max(duration, 1), 3600) * 1000; // Min 1s, Max 3600s (60 phút)
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    let responseSent = false;
    
    // Gửi lệnh cho tất cả thiết bị
    const publishPromises = devicesToControl.map(({ dbId, mqttId, device }) => {
        return new Promise((resolve) => {
            const pumpTopic = `IOTGARDEN${mqttId}/feeds/V1`;
            
            console.log(`[MQTT] Publishing ON command: Topic="${pumpTopic}", Message="${messageOn}"`);
            
            mqttClient.publish(pumpTopic, messageOn, { qos: 0, retain: false }, async (err) => {
                if (err) {
                    console.error(`[MQTT] Error publishing to ${pumpTopic}:`, err);
                    errorCount++;
                    results.push({ deviceId: dbId, mqttId, topic: pumpTopic, success: false, error: err.message });
                } else {
                    successCount++;
                    results.push({ deviceId: dbId, mqttId, topic: pumpTopic, success: true });
                    console.log(`[MQTT] ✓ Pump command sent: ON to ${pumpTopic} for ${duration} seconds`);
                    
                    // Gửi thông báo email nếu có email trong garden
                    const email = device.garden_Email || null;
                    if (email) {
                        try {
                            await emailService.sendWateringNotification(
                                email,
                                device.device_Name || `Thiết bị ${mqttId}`,
                                mode.toLowerCase(),
                                duration
                            );
                            console.log(`[MQTT] ✓ Watering notification sent to ${email}`);
                        } catch (emailErr) {
                            console.error(`[MQTT] Error sending notification to ${email}:`, emailErr);
                        }
                    }
                    
                    // Tự động tắt sau thời gian chỉ định
                    setTimeout(() => {
                        console.log(`[MQTT] Publishing OFF command: Topic="${pumpTopic}", Message="${messageOff}"`);
                        mqttClient.publish(pumpTopic, messageOff, { qos: 0, retain: false }, (err) => {
                            if (err) {
                                console.error(`[MQTT] Error publishing OFF command to ${pumpTopic}:`, err);
                            } else {
                                console.log(`[MQTT] ✓ Pump command sent: OFF to ${pumpTopic} after ${duration} seconds`);
                            }
                        });
                    }, pumpDuration);
                }
                
                resolve(); // Resolve promise để đếm số lượng đã xử lý
            });
        });
    });
    
    // Đợi tất cả thiết bị xử lý xong
    await Promise.all(publishPromises);
    
    // Trả response sau khi tất cả đã xử lý
    if (successCount === 0) {
        return res.status(500).json({ 
            error: 'Failed to send command to all devices',
            results 
        });
    }
    
    res.json({ 
        message: `Pump started on ${successCount} device(s)`,
        duration: duration,
        mode: mode,
        successCount,
        errorCount,
        results
    });
}

/**
 * ============================================================================
 * FUNCTION: controlRelay
 * MÔ TẢ: Điều khiển từng relay riêng biệt (V1 hoặc V2) với thời gian tùy chỉnh
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /controlRelay
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Body của request
 * @param {string|Array} req.body.relay - Relay cần điều khiển: 'V1', 'V2', hoặc ['V1', 'V2']
 * @param {number|Object} req.body.duration - Thời gian (giây). Nếu object: {V1: 10, V2: 15}
 * @param {number} req.body.deviceId - Database ID của thiết bị
 * @param {string} req.body.mode - Chế độ: 'MANUAL' hoặc 'AUTO'
 * 
 * LUỒNG HOẠT ĐỘNG:
 * 1. Nhận request điều khiển relay từ client
 * 2. Publish message '1' đến topic tương ứng để BẬT relay
 * 3. Đặt timer theo duration
 * 4. Sau thời gian chỉ định, publish message '0' để TẮT relay
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Relay controlled", results: [...] }
 * 
 * MQTT PROTOCOL:
 * - Topic: IOTGARDEN{deviceId}/feeds/V1 hoặc V2
 * - Message: '1' (bật) hoặc '0' (tắt)
 * 
 * VÍ DỤ:
 * - Điều khiển V1 trong 10 giây: { relay: 'V1', duration: 10, deviceId: 1 }
 * - Điều khiển cả 2 relay với thời gian khác nhau: 
 *   { relay: ['V1', 'V2'], duration: {V1: 10, V2: 15}, deviceId: 1 }
 */
const controlRelay = async (req, res) => {
    console.log('[MQTT] controlRelay endpoint called');
    console.log('[MQTT] Request body:', req.body);
    
    const { relay, duration = 10, deviceId, deviceIds, mqttId, mqttIds, mode = 'MANUAL' } = req.body;

    // Kiểm tra client MQTT đã kết nối chưa (sử dụng getter để tránh race condition)
    const mqttClient = mqttModel.getClient ? mqttModel.getClient() : mqttModel.client;
    if (!mqttClient || !mqttClient.connected) {
        console.error('[MQTT] Client not connected');
        return res.status(500).json({ error: 'MQTT client not connected' });
    }

    // Validate relay parameter
    if (!relay) {
        return res.status(400).json({ error: 'Relay parameter is required. Use "V1", "V2", or ["V1", "V2"]' });
    }

    // Normalize relay to array
    const relaysToControl = Array.isArray(relay) ? relay : [relay];
    
    // Validate relay values
    const validRelays = ['V1', 'V2'];
    for (const r of relaysToControl) {
        if (!validRelays.includes(r)) {
            return res.status(400).json({ error: `Invalid relay: ${r}. Use "V1" or "V2"` });
        }
    }

    // Hỗ trợ nhiều thiết bị: nếu có deviceIds hoặc mqttIds, xử lý tất cả
    const devicesToControl = [];
    
    if (deviceIds && Array.isArray(deviceIds)) {
        for (const id of deviceIds) {
            const device = await deviceModel.getDeviceById(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (mqttIds && Array.isArray(mqttIds)) {
        for (const id of mqttIds) {
            const device = await deviceModel.getDeviceByMQTTId(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (deviceId) {
        const device = await deviceModel.getDeviceById(deviceId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    } else if (mqttId) {
        const device = await deviceModel.getDeviceByMQTTId(mqttId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    }
    
    if (devicesToControl.length === 0) {
        console.error('[MQTT] No valid devices found');
        return res.status(400).json({ error: 'No valid devices found. Provide deviceId, deviceIds, mqttId, or mqttIds' });
    }
    
    console.log(`[MQTT] Controlling ${devicesToControl.length} device(s) for relay(s): ${relaysToControl.join(', ')}`);

    const messageOn = String('1');
    const messageOff = String('0');
    
    // Parse duration: có thể là số hoặc object {V1: 10, V2: 15}
    // Parse duration: may be a number (seconds) or object {V1: seconds, V2: seconds}
    // Accept durations up to 3600s (60 minutes)
    const getDuration = (relayName) => {
        if (typeof duration === 'object' && duration !== null) {
            return Math.min(Math.max(duration[relayName] || 10, 1), 3600) * 1000;
        }
        return Math.min(Math.max(duration, 1), 3600) * 1000;
    };
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Gửi lệnh cho tất cả thiết bị và tất cả relay
    const publishPromises = [];
    
    for (const { dbId, mqttId, device } of devicesToControl) {
        for (const relayName of relaysToControl) {
            const relayDuration = getDuration(relayName);
            const relayTopic = `IOTGARDEN${mqttId}/feeds/${relayName}`;
            
            publishPromises.push(
                new Promise((resolve) => {
                    console.log(`[MQTT] Publishing ON command: Topic="${relayTopic}", Message="${messageOn}", Duration=${relayDuration/1000}s`);
                    
                    mqttModel.client.publish(relayTopic, messageOn, { qos: 0, retain: false }, async (err) => {
                        if (err) {
                            console.error(`[MQTT] Error publishing to ${relayTopic}:`, err);
                            errorCount++;
                            results.push({ 
                                deviceId: dbId, 
                                mqttId, 
                                relay: relayName,
                                topic: relayTopic, 
                                success: false, 
                                error: err.message 
                            });
                        } else {
                            successCount++;
                            results.push({ 
                                deviceId: dbId, 
                                mqttId, 
                                relay: relayName,
                                topic: relayTopic, 
                                success: true,
                                duration: relayDuration / 1000
                            });
                            console.log(`[MQTT] ✓ Relay ${relayName} command sent: ON to ${relayTopic} for ${relayDuration/1000} seconds`);
                            
                            // Gửi thông báo email nếu có email trong garden (chỉ gửi 1 lần cho mỗi device)
                            if (relayName === 'V1' && device.garden_Email) {
                                try {
                                    await emailService.sendWateringNotification(
                                        device.garden_Email,
                                        device.device_Name || `Thiết bị ${mqttId}`,
                                        mode.toLowerCase(),
                                        relayDuration / 1000
                                    );
                                    console.log(`[MQTT] ✓ Watering notification sent to ${device.garden_Email}`);
                                } catch (emailErr) {
                                    console.error(`[MQTT] Error sending notification:`, emailErr);
                                }
                            }
                            
                            // Tự động tắt sau thời gian chỉ định
                            setTimeout(() => {
                                console.log(`[MQTT] Publishing OFF command: Topic="${relayTopic}", Message="${messageOff}"`);
                                mqttModel.client.publish(relayTopic, messageOff, { qos: 0, retain: false }, (err) => {
                                    if (err) {
                                        console.error(`[MQTT] Error publishing OFF command to ${relayTopic}:`, err);
                                    } else {
                                        console.log(`[MQTT] ✓ Relay ${relayName} command sent: OFF to ${relayTopic} after ${relayDuration/1000} seconds`);
                                    }
                                });
                            }, relayDuration);
                        }
                        
                        resolve();
                    });
                })
            );
        }
    }
    
    // Đợi tất cả thiết bị và relay xử lý xong
    await Promise.all(publishPromises);
    
    // Trả response sau khi tất cả đã xử lý
    if (successCount === 0) {
        return res.status(500).json({ 
            error: 'Failed to send command to all relays',
            results 
        });
    }
    
    res.json({ 
        message: `Relay(s) controlled on ${devicesToControl.length} device(s)`,
        relays: relaysToControl,
        duration: duration,
        mode: mode,
        successCount,
        errorCount,
        results
    });
};

/**
 * ============================================================================
 * FUNCTION: stopRelay
 * MÔ TẢ: Dừng relay ngay lập tức (gửi message '0' để tắt)
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /stopRelay
 * 
 * @param {Object} req - Express request object
 * @param {string|Array} req.body.relay - Relay cần dừng: 'V1', 'V2', hoặc ['V1', 'V2']
 * @param {number} req.body.deviceId - Database ID của thiết bị
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Relay(s) stopped", results: [...] }
 */
const stopRelay = async (req, res) => {
    const { relay, deviceId, deviceIds, mqttId, mqttIds } = req.body;

    if (!mqttModel.client) {
        console.error('[MQTT] Client not connected');
        return res.status(500).json({ error: 'MQTT client not connected' });
    }

    if (!relay) {
        return res.status(400).json({ error: 'Relay parameter is required. Use "V1", "V2", or ["V1", "V2"]' });
    }

    const relaysToStop = Array.isArray(relay) ? relay : [relay];
    const validRelays = ['V1', 'V2'];
    
    for (const r of relaysToStop) {
        if (!validRelays.includes(r)) {
            return res.status(400).json({ error: `Invalid relay: ${r}. Use "V1" or "V2"` });
        }
    }

    const devicesToControl = [];
    
    if (deviceIds && Array.isArray(deviceIds)) {
        for (const id of deviceIds) {
            const device = await deviceModel.getDeviceById(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (mqttIds && Array.isArray(mqttIds)) {
        for (const id of mqttIds) {
            const device = await deviceModel.getDeviceByMQTTId(id);
            if (device) {
                devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
            }
        }
    } else if (deviceId) {
        const device = await deviceModel.getDeviceById(deviceId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    } else if (mqttId) {
        const device = await deviceModel.getDeviceByMQTTId(mqttId);
        if (device) {
            devicesToControl.push({ dbId: device.device_ID, mqttId: device.device_MQTT_ID, device });
        }
    }
    
    if (devicesToControl.length === 0) {
        return res.status(400).json({ error: 'No valid devices found' });
    }
    
    console.log(`[MQTT] Stopping ${relaysToStop.join(', ')} on ${devicesToControl.length} device(s)`);

    const messageOff = String('0');
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    const publishPromises = [];
    
    for (const { dbId, mqttId } of devicesToControl) {
        for (const relayName of relaysToStop) {
            const relayTopic = `IOTGARDEN${mqttId}/feeds/${relayName}`;
            
            publishPromises.push(
                new Promise((resolve) => {
                    console.log(`[MQTT] Publishing STOP command: Topic="${relayTopic}", Message="${messageOff}"`);
                    
                    mqttModel.client.publish(relayTopic, messageOff, { qos: 0, retain: false }, (err) => {
                        if (err) {
                            console.error(`[MQTT] Error publishing STOP to ${relayTopic}:`, err);
                            errorCount++;
                            results.push({ 
                                deviceId: dbId, 
                                mqttId, 
                                relay: relayName,
                                topic: relayTopic, 
                                success: false, 
                                error: err.message 
                            });
                        } else {
                            successCount++;
                            results.push({ 
                                deviceId: dbId, 
                                mqttId, 
                                relay: relayName,
                                topic: relayTopic, 
                                success: true
                            });
                            console.log(`[MQTT] ✓ Relay ${relayName} stopped: ${relayTopic}`);
                        }
                        resolve();
                    });
                })
            );
        }
    }
    
    await Promise.all(publishPromises);
    
    if (successCount === 0) {
        return res.status(500).json({ 
            error: 'Failed to stop all relays',
            results 
        });
    }
    
    res.json({ 
        message: `Relay(s) stopped on ${devicesToControl.length} device(s)`,
        relays: relaysToStop,
        successCount,
        errorCount,
        results
    });
};

/**
 * Export các controller functions để sử dụng trong routes
 */
module.exports = {
    getLatestMessage,  // Lấy dữ liệu sensor mới nhất
    startPump,         // Bật máy bơm (tự tắt sau 10s) - giữ lại để tương thích
    controlRelay,      // Điều khiển từng relay riêng biệt (V1, V2)
    stopRelay,         // Dừng relay ngay lập tức
};