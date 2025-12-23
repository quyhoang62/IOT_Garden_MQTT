/**
 * ============================================================================
 * FILE: controllers/deviceController.js
 * MÔ TẢ: Controller quản lý thiết bị ESP32
 * ============================================================================
 */

const deviceModel = require('../models/deviceModel');
const mqttModel = require('../models/mqttModel');

/**
 * Lấy tất cả devices
 */
const getAllDevices = async (req, res) => {
  try {
    const devices = await deviceModel.getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Lấy device theo ID
 */
const getDeviceById = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await deviceModel.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


/**
 * Thêm device mới
 */
const addDevice = async (req, res) => {
  try {
    const { device_Name, device_MQTT_ID, device_Status, device_Location, device_Description, device_Email } = req.body;

    // Validate
    if (!device_Name || !device_MQTT_ID) {
      return res.status(400).json({ error: 'Device name and MQTT ID are required' });
    }

    // Kiểm tra MQTT ID đã tồn tại chưa
    const exists = await deviceModel.checkMQTTIdExists(device_MQTT_ID);
    if (exists) {
      return res.status(400).json({ error: `MQTT ID ${device_MQTT_ID} already exists` });
    }

    const device = {
      device_Name,
      device_MQTT_ID: parseInt(device_MQTT_ID),
      device_Status: device_Status || 'ACTIVE',
      device_Location: device_Location || null,
      device_Description: device_Description || null,
      device_Email: device_Email || null
    };

    const result = await deviceModel.addDevice(device);
    res.status(201).json({ 
      message: 'Device added successfully',
      device_ID: result.insertId 
    });
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Cập nhật device
 */
const updateDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { device_Name, device_MQTT_ID, device_Status, device_Location, device_Description, device_Email } = req.body;

    // Kiểm tra device có tồn tại không
    const existing = await deviceModel.getDeviceById(deviceId);
    if (!existing) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Kiểm tra MQTT ID đã tồn tại chưa (trừ device hiện tại)
    if (device_MQTT_ID && device_MQTT_ID !== existing.device_MQTT_ID) {
      const exists = await deviceModel.checkMQTTIdExists(device_MQTT_ID, deviceId);
      if (exists) {
        return res.status(400).json({ error: `MQTT ID ${device_MQTT_ID} already exists` });
      }
    }

    const device = {
      device_Name: device_Name || existing.device_Name,
      device_MQTT_ID: device_MQTT_ID ? parseInt(device_MQTT_ID) : existing.device_MQTT_ID,
      device_Status: device_Status || existing.device_Status,
      device_Location: device_Location !== undefined ? device_Location : existing.device_Location,
      device_Description: device_Description !== undefined ? device_Description : existing.device_Description,
      device_Email: device_Email !== undefined ? device_Email : existing.device_Email
    };

    await deviceModel.updateDevice(deviceId, device);
    res.json({ message: 'Device updated successfully' });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Xóa device
 */
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Kiểm tra device có tồn tại không
    const existing = await deviceModel.getDeviceById(deviceId);
    if (!existing) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await deviceModel.deleteDevice(deviceId);
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Bỏ getDevicesByGardenId - không còn garden

module.exports = {
  getAllDevices,
  getDeviceById,
  addDevice,
  updateDevice,
  deleteDevice
};
