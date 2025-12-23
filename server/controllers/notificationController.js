/**
 * ============================================================================
 * FILE: controllers/notificationController.js
 * MÔ TẢ: Controller xử lý cài đặt và gửi thông báo
 * ============================================================================
 */

const emailService = require('../services/emailService');
const db = require('../models/db');

/**
 * Lấy cài đặt thông báo của user
 */
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT * FROM tbl_notification_settings 
      WHERE user_id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching notification settings:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        // Return default settings if none exist
        return res.json({
          email_watering: false,
          email_temperature: false,
          email_humidity: false,
          email_soil_moisture: false,
          email_daily_report: false,
          notification_email: null
        });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Error in getNotificationSettings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Cập nhật cài đặt thông báo
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      email_watering,
      email_temperature,
      email_humidity,
      email_soil_moisture,
      email_daily_report,
      notification_email
    } = req.body;

    // Check if settings exist
    const checkQuery = 'SELECT id FROM tbl_notification_settings WHERE user_id = ?';
    
    db.query(checkQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error checking notification settings:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        // Insert new settings
        const insertQuery = `
          INSERT INTO tbl_notification_settings 
          (user_id, email_watering, email_temperature, email_humidity, 
           email_soil_moisture, email_daily_report, notification_email)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(insertQuery, [
          userId,
          email_watering || false,
          email_temperature || false,
          email_humidity || false,
          email_soil_moisture || false,
          email_daily_report || false,
          notification_email || null
        ], (insertErr, insertResult) => {
          if (insertErr) {
            console.error('Error inserting notification settings:', insertErr);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Notification settings saved', id: insertResult.insertId });
        });
      } else {
        // Update existing settings
        const updateQuery = `
          UPDATE tbl_notification_settings 
          SET email_watering = ?,
              email_temperature = ?,
              email_humidity = ?,
              email_soil_moisture = ?,
              email_daily_report = ?,
              notification_email = ?,
              updated_at = NOW()
          WHERE user_id = ?
        `;
        
        db.query(updateQuery, [
          email_watering || false,
          email_temperature || false,
          email_humidity || false,
          email_soil_moisture || false,
          email_daily_report || false,
          notification_email || null,
          userId
        ], (updateErr) => {
          if (updateErr) {
            console.error('Error updating notification settings:', updateErr);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Notification settings updated' });
        });
      }
    });
  } catch (error) {
    console.error('Error in updateNotificationSettings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Gửi test email
 */
const sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Kiểm tra cấu hình email trước
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (!emailUser || emailUser === 'your-email@gmail.com') {
      return res.status(500).json({ 
        error: 'Email chưa được cấu hình',
        details: 'Vui lòng cấu hình EMAIL_USER trong file .env. Xem hướng dẫn tại server/email-config.md'
      });
    }
    
    if (!emailPass || emailPass === 'your-app-password') {
      return res.status(500).json({ 
        error: 'App Password chưa được cấu hình',
        details: 'Vui lòng cấu hình EMAIL_PASS (App Password) trong file .env. Xem hướng dẫn tại server/email-config.md'
      });
    }

    const result = await emailService.sendTemperatureAlert(
      email,
      35,
      30,
      'Test Garden'
    );

    if (result.success) {
      res.json({ message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test email', 
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      error: 'Không thể gửi email',
      details: error.message 
    });
  }
};

/**
 * Kiểm tra và gửi cảnh báo dựa trên dữ liệu cảm biến
 * Được gọi từ mqttModel khi nhận dữ liệu mới
 */
const checkAndSendAlerts = async (sensorType, value, gardenId) => {
  try {
    // Lấy conditions của garden
    const conditionQuery = `
      SELECT c.*, u.user_Email, ns.*
      FROM tbl_condition c
      JOIN tbl_garden g ON c.condition_GardenID = g.garden_ID
      JOIN tbl_user u ON g.garden_UserID = u.user_ID
      LEFT JOIN tbl_notification_settings ns ON ns.user_id = u.user_ID
      WHERE c.condition_GardenID = ?
    `;

    db.query(conditionQuery, [gardenId], async (err, results) => {
      if (err || results.length === 0) {
        return;
      }

      const condition = results[0];
      const email = condition.notification_email || condition.user_Email;

      // Chỉ gửi nếu user đã bật thông báo
      if (!email) return;

      switch (sensorType) {
        case 'temperature':
          if (condition.email_temperature && value > condition.condition_Temp) {
            await emailService.sendTemperatureAlert(email, value, condition.condition_Temp);
          }
          break;
        case 'humidity':
          if (condition.email_humidity && value < condition.condition_Humid) {
            await emailService.sendHumidityAlert(email, value, condition.condition_Humid, 'Vườn', 'low');
          }
          break;
        case 'soil_moisture':
          if (condition.email_soil_moisture && value < condition.condition_Amdat) {
            await emailService.sendSoilMoistureAlert(email, value, condition.condition_Amdat);
          }
          break;
      }
    });
  } catch (error) {
    console.error('Error in checkAndSendAlerts:', error);
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestEmail,
  checkAndSendAlerts
};








