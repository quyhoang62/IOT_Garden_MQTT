import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { 
  HiOutlineBell, 
  HiOutlineDeviceMobile,
  HiOutlineMail,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineShare
} from 'react-icons/hi';
import { 
  HiSave,
  HiCheckCircle
} from 'react-icons/hi';
import { 
  FaThermometerHalf,
  FaTint,
  FaLeaf,
  FaWifi,
  FaCalendarAlt,
  FaSnowflake,
  FaSun,
  FaArrowDown,
  FaArrowUp,
  FaPaperPlane
} from 'react-icons/fa';

function Settings() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email_watering: false,
    email_temperature: true,
    email_humidity: true,
    email_soil_moisture: true,
    email_daily_report: true,
    notification_email: ''
  });
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  
  // Threshold settings state
  const [thresholds, setThresholds] = useState({
    temperature: { min: null, max: null, enabled: true },
    humidity: { min: null, max: null, enabled: true },
    soilMoisture: { min: null, max: null, enabled: true }
  });
  
  // System health state
  const [systemHealth, setSystemHealth] = useState({
    connectionStatus: false,
    dailyReport: true
  });
  
  // Device management state
  const [devices, setDevices] = useState([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_Name: '',
    device_MQTT_ID: '',
    device_GardenID: '',
    device_Location: '',
    device_Description: ''
  });
  
  const menuItems = [
    { id: 'notifications', name: 'Thông báo & Ngưỡng', icon: HiOutlineBell },
    { id: 'devices', name: 'Thiết bị', icon: HiOutlineDeviceMobile },
    { id: 'permissions', name: 'Phân quyền', icon: HiOutlineShare },
  ];

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/v1/notifications/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotificationSettings({
          email_watering: response.data.email_watering || false,
          email_temperature: response.data.email_temperature || false,
          email_humidity: response.data.email_humidity || false,
          email_soil_moisture: response.data.email_soil_moisture || false,
          email_daily_report: response.data.email_daily_report || false,
          notification_email: response.data.notification_email || ''
        });
        
        // Update system health from notification settings
        setSystemHealth(prev => ({
          ...prev,
          dailyReport: response.data.email_daily_report || false
        }));
      } catch (error) {
        console.error('Error fetching notification settings:', error);
      }
    };
    
    fetchNotificationSettings();
    fetchDevices();
  }, []);
  
  // Fetch devices
  const fetchDevices = async () => {
    try {
      // Lấy tất cả devices (không còn garden nữa)
      const response = await axios.get('/api/v1/devices');
      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  };
  
  // Add device
  const handleAddDevice = async () => {
    if (!newDevice.device_Name || !newDevice.device_MQTT_ID) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin: Tên thiết bị và MQTT ID' });
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/api/v1/devices', newDevice);
      
      setMessage({ type: 'success', text: 'Đã thêm thiết bị thành công!' });
      setShowAddDevice(false);
      setNewDevice({
        device_Name: '',
        device_MQTT_ID: '',
        device_Location: '',
        device_Description: '',
        device_Email: ''
      });
      fetchDevices();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Không thể thêm thiết bị';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete device
  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/v1/devices/${deviceId}`);
      
      setMessage({ type: 'success', text: 'Đã xóa thiết bị thành công!' });
      fetchDevices();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Không thể xóa thiết bị';
      setMessage({ type: 'error', text: errorMsg });
    }
  };
  

  // Save notification settings
  const handleSaveNotificationSettings = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      
      // Save notification settings (including daily report from system health)
      const settingsToSave = {
        ...notificationSettings,
        email_daily_report: systemHealth.dailyReport
      };
      
      await axios.put('/api/v1/notifications/settings', settingsToSave, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // TODO: Save thresholds to threshold API when available
      // For now, thresholds are stored in local state
      
      setMessage({ type: 'success', text: 'Đã lưu cài đặt thành công!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cài đặt. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!notificationSettings.notification_email) {
      setMessage({ type: 'error', text: 'Vui lòng nhập email trước khi gửi test.' });
      return;
    }
    
    setSendingTestEmail(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/notifications/test-email', {
        email: notificationSettings.notification_email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Đã gửi email test thành công! Vui lòng kiểm tra hộp thư (và cả thư mục Spam).' });
    } catch (error) {
      const errorMsg = error.response?.data?.details || error.response?.data?.error || 'Lỗi không xác định';
      setMessage({ 
        type: 'error', 
        text: `Không thể gửi email test: ${errorMsg}` 
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Toggle notification setting
  const toggleNotification = (key) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };



  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Cài đặt hệ thống</h1>
        <p className="text-gray-600">Quản lý các thông số môi trường và ngưỡng cảnh báo an toàn.</p>
      </div>

      <div className="flex gap-8">
        {/* Settings Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-green-50 text-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-green-600' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              {/* Message */}
              {message.text && (
                <div className={`p-4 rounded-xl ${
                  message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Kênh thông báo Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded"></div>
                  <h2 className="text-xl font-semibold text-gray-800">Kênh thông báo</h2>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <HiOutlineMail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Email cảnh báo</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Địa chỉ nhận thông báo khẩn cấp khi cảm biến vượt ngưỡng.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={notificationSettings.notification_email}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            notification_email: e.target.value
                          }))}
                          placeholder="@user@email.com"
                          className="flex-1 px-4 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-700"
                        />
                        <button
                          onClick={handleSendTestEmail}
                          disabled={sendingTestEmail}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:bg-gray-300 flex items-center gap-2"
                        >
                          <FaPaperPlane className="w-4 h-4" />
                          {sendingTestEmail ? 'Đang gửi...' : 'Gửi thử'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ngưỡng an toàn Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded"></div>
                  <h2 className="text-xl font-semibold text-gray-800">Ngưỡng an toàn</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Temperature Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-300 relative">
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <HiCheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <FaThermometerHalf className="w-6 h-6 text-orange-500" />
                      <h3 className="text-lg font-semibold text-gray-800">Nhiệt độ</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Giám sát nhiệt độ vườn</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaSnowflake className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Thấp nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.temperature.min || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              temperature: { ...prev.temperature, min: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">°C</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaSun className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium text-gray-700">Cao nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.temperature.max || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              temperature: { ...prev.temperature, max: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">°C</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Humidity Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-300 relative">
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <HiCheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <FaTint className="w-6 h-6 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-800">Độ ẩm không khí</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Giám sát độ ẩm môi trường</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaArrowDown className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Thấp nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.humidity.min || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              humidity: { ...prev.humidity, min: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaArrowUp className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Cao nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.humidity.max || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              humidity: { ...prev.humidity, max: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Soil Moisture Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-300 relative">
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <HiCheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <FaLeaf className="w-6 h-6 text-green-500" />
                      <h3 className="text-lg font-semibold text-gray-800">Độ ẩm đất</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Giám sát nước trong đất</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaArrowDown className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Thấp nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.soilMoisture.min || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              soilMoisture: { ...prev.soilMoisture, min: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaArrowUp className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">Cao nhất</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholds.soilMoisture.max || ''}
                            onChange={(e) => setThresholds(prev => ({
                              ...prev,
                              soilMoisture: { ...prev.soilMoisture, max: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sức khỏe hệ thống Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded"></div>
                  <h2 className="text-xl font-semibold text-gray-800">Sức khỏe hệ thống</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Connection Status Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                          <FaWifi className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">Trạng thái kết nối</h3>
                          <p className="text-sm text-gray-600">Cảnh báo mất kết nối</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSystemHealth(prev => ({ ...prev, connectionStatus: !prev.connectionStatus }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          systemHealth.connectionStatus ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          systemHealth.connectionStatus ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Daily Report Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                          <FaCalendarAlt className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">Báo cáo hàng ngày</h3>
                          <p className="text-sm text-gray-600">Tổng hợp 24h qua email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSystemHealth(prev => ({ ...prev, dailyReport: !prev.dailyReport }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          systemHealth.dailyReport ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          systemHealth.dailyReport ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Quản lý thiết bị</h3>
                <button
                  onClick={() => setShowAddDevice(!showAddDevice)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <HiOutlinePlus className="w-5 h-5" />
                  Thêm thiết bị
                </button>
              </div>

              {/* Add Device Form */}
              {showAddDevice && (
                <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4">Thêm thiết bị mới</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Tên thiết bị *</label>
                      <input
                        type="text"
                        value={newDevice.device_Name}
                        onChange={(e) => setNewDevice(prev => ({ ...prev, device_Name: e.target.value }))}
                        placeholder="VD: ESP32 - Vườn trước"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">MQTT ID *</label>
                      <input
                        type="number"
                        value={newDevice.device_MQTT_ID}
                        onChange={(e) => setNewDevice(prev => ({ ...prev, device_MQTT_ID: e.target.value }))}
                        placeholder="VD: 1 (cho IOTGARDEN1)"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Garden ID *</label>
                      <input
                        type="number"
                        value={newDevice.device_GardenID}
                        onChange={(e) => setNewDevice(prev => ({ ...prev, device_GardenID: e.target.value }))}
                        placeholder="VD: 1"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Vị trí</label>
                      <input
                        type="text"
                        value={newDevice.device_Location}
                        onChange={(e) => setNewDevice(prev => ({ ...prev, device_Location: e.target.value }))}
                        placeholder="VD: Vườn trước"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-2">Mô tả</label>
                      <textarea
                        value={newDevice.device_Description}
                        onChange={(e) => setNewDevice(prev => ({ ...prev, device_Description: e.target.value }))}
                        placeholder="Mô tả thiết bị..."
                        rows="2"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddDevice}
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300"
                    >
                      {loading ? 'Đang thêm...' : 'Thêm thiết bị'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddDevice(false);
                        setNewDevice({
                          device_Name: '',
                          device_MQTT_ID: '',
                          device_Location: '',
                          device_Description: '',
                          device_Email: ''
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Devices List */}
              <div className="space-y-4">
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Chưa có thiết bị nào</p>
                    <p className="text-sm mt-2">Nhấn "Thêm thiết bị" để thêm thiết bị mới</p>
                  </div>
                ) : (
                  devices.map((device) => (
                    <div key={device.device_ID} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          device.device_Status === 'ACTIVE' ? 'bg-green-500' : 
                          device.device_Status === 'OFFLINE' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <h4 className="font-medium text-gray-800">{device.device_Name}</h4>
                          <p className="text-sm text-gray-500">
                            MQTT ID: {device.device_MQTT_ID}
                            {device.device_Location && ` | ${device.device_Location}`}
                            {device.device_Email && ` | ${device.device_Email}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Topic: IOTGARDEN{device.device_MQTT_ID}/feeds/...
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDevice(device.device_ID)}
                        className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân quyền</h3>
              <p className="text-gray-500">Tính năng đang được phát triển...</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Button */}
      {activeTab === 'notifications' && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleSaveNotificationSettings}
            disabled={loading}
            className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:bg-gray-300 shadow-lg flex items-center gap-2"
          >
            <HiSave className="w-5 h-5" />
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Settings;


