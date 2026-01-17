import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HiOutlinePlay, HiOutlinePlus, HiOutlineTrash, HiOutlineStop, HiOutlineCalendar, HiOutlineChartBar, HiOutlineX, HiOutlineSearch, HiOutlineClock } from 'react-icons/hi';
import { FaWater } from 'react-icons/fa';
import { BsLightningCharge } from 'react-icons/bs';

function Irrigation() {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'schedule', 'sensor'
  const [autoIrrigation, setAutoIrrigation] = useState(true);
  const [isWatering, setIsWatering] = useState(false);
  const [isWateringRelay1, setIsWateringRelay1] = useState(false);
  const [isWateringRelay2, setIsWateringRelay2] = useState(false);
  const [remainingTime, setRemainingTime] = useState({
    relay1: 0,
    relay2: 0
  });
  // Refs to track running intervals/timeouts and original totals to avoid duplicates/drift
  const relayIntervalsRef = useRef({ relay1: null, relay2: null, both: null });
  const relayTimeoutsRef = useRef({ relay1: null, relay2: null, both: null });
  const totalSecondsAtStartRef = useRef({ relay1: 0, relay2: 0 });
  const [lastWatering, setLastWatering] = useState({
    time: 'Hôm nay, 06:00 AM',
    duration: '15 phút',
    mode: 'Tự động theo lịch',
    area: 'Vườn trước',
    status: 'Hoàn thành'
  });
  
  // Relay control state
  const [relayControl, setRelayControl] = useState({
    // durations are in minutes (UI shows minutes)
    relay1: { duration: 10, area: 'Vườn trước' },
    relay2: { duration: 20, area: 'Vườn sau' }
  });
  

  // Device management state
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    days: ['T2', 'T4', 'T6'],
    hour: 6,
    minute: 0,
    ampm: 'AM',
    duration: 15,
    pump: 'Bơm 1',
    deviceId: null,
    repeatMode: 'byDay' // 'daily', 'byDay', 'custom'
  });
  
  // Form visibility state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Schedules list - load from API
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const dayOptions = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const pumpOptions = ['Bơm 1', 'Bơm 2'];
  
  // Fetch all devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get('/api/v1/devices');
        setDevices(Array.isArray(response.data) ? response.data : []);
        
        // Auto-select first device if available
        if (response.data && response.data.length > 0) {
          const firstDeviceId = response.data[0].device_ID;
          setSelectedDeviceId(firstDeviceId);
          setScheduleForm(prev => ({ ...prev, deviceId: firstDeviceId }));
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        setDevices([]);
      }
    };

    fetchDevices();
  }, []);

  // Load schedules from API - load all schedules for all devices
  useEffect(() => {
    const fetchSchedules = async () => {
      if (devices.length === 0) {
        setSchedules([]);
        return;
      }

      setLoadingSchedules(true);
      try {
        // Fetch schedules for all devices
        const allSchedules = [];
        for (const device of devices) {
          try {
            const response = await axios.get(`/api/v1/schedules/device/${device.device_ID}`);
            if (Array.isArray(response.data)) {
              // Add deviceId to each schedule for reference
              // Ensure duration is properly formatted (convert from seconds to minutes if needed)
              const schedulesWithDevice = response.data.map(s => {
                // Backend should return duration as formatted string "X phút"
                // But if it's still raw (number in seconds), convert it
                let durationValue = s.duration;
                
                // If duration is not a formatted string, check for raw schedule_Duration
                if (!durationValue || (typeof durationValue === 'number' && durationValue > 60)) {
                  durationValue = s.schedule_Duration || durationValue;
                }
                
                return {
                  ...s,
                  deviceId: device.device_ID,
                  device_Name: device.device_Name,
                  duration: formatDuration(durationValue)
                };
              });
              allSchedules.push(...schedulesWithDevice);
            }
          } catch (err) {
            console.error(`Error fetching schedules for device ${device.device_ID}:`, err);
          }
        }
        setSchedules(allSchedules);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, [devices]);
  
  // Threshold state
  const [threshold, setThreshold] = useState({
    threshold_Temp_Min: null,
    threshold_Temp_Max: null,
    threshold_Humidity_Min: null,
    threshold_Humidity_Max: null,
    threshold_SoilMoisture_Min: null,
    threshold_SoilMoisture_Max: null,
    threshold_Enabled: false,
    threshold_Duration: 10,
    threshold_Pump: 'V1',
    primaryCondition: 'soilMoisture' // 'soilMoisture', 'temperature', 'humidity'
  });
  const [loadingThreshold, setLoadingThreshold] = useState(false);
  const [sensorLatest, setSensorLatest] = useState({
    temp: null,
    humid: null,
    soilMoisture: null
  });
  const [lastSensorUpdate, setLastSensorUpdate] = useState(null); // Timestamp of last sensor update
  const [updateTimeAgo, setUpdateTimeAgo] = useState('10s trước'); // Display text for time ago
  
  // Sensor rules list state
  const [sensorRules, setSensorRules] = useState(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem('sensorRules');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Error loading sensorRules from localStorage:', err);
      return [];
    }
  });
  const [editingRuleId, setEditingRuleId] = useState(null); // ID of rule being edited

  // Save sensorRules to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sensorRules', JSON.stringify(sensorRules));
    } catch (err) {
      console.error('Error saving sensorRules to localStorage:', err);
    }
  }, [sensorRules]);
  
  // Fetch threshold on mount
  useEffect(() => {
    const fetchThreshold = async () => {
      try {
        const gardenId = localStorage.getItem('gardenId');
        if (!gardenId) return;
        
        // Lấy deviceId từ gardenId
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          try {
            const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
            if (devicesRes.data && devicesRes.data.length > 0) {
              deviceId = devicesRes.data[0].device_ID;
              localStorage.setItem('deviceId', deviceId);
            } else {
              return; // Không có device
            }
          } catch (err) {
            console.error('Error fetching devices:', err);
            return;
          }
        }
        
        const response = await axios.get(`/api/v1/thresholds/${deviceId}`);
        if (response.data) {
          setThreshold({
            threshold_Temp_Min: response.data.threshold_Temp_Min || null,
            threshold_Temp_Max: response.data.threshold_Temp_Max || null,
            threshold_Humidity_Min: response.data.threshold_Humidity_Min || null,
            threshold_Humidity_Max: response.data.threshold_Humidity_Max || null,
            threshold_SoilMoisture_Min: response.data.threshold_SoilMoisture_Min || null,
            threshold_SoilMoisture_Max: response.data.threshold_SoilMoisture_Max || null,
            threshold_Enabled: response.data.threshold_Enabled === 1 || response.data.threshold_Enabled === true,
            threshold_Duration: response.data.threshold_Duration || 10
          });
          setAutoIrrigation(response.data.threshold_Enabled === 1 || response.data.threshold_Enabled === true);
        }
      } catch (error) {
        console.error('Error fetching threshold:', error);
      }
    };
    
    fetchThreshold();
  }, []);

  // Fetch threshold and latest sensor values when selected device changes
  useEffect(() => {
    const fetchForDevice = async () => {
      try {
        const deviceId = selectedDeviceId || localStorage.getItem('deviceId');
        if (!deviceId) return;

        // Fetch threshold
        try {
          const res = await axios.get(`/api/v1/thresholds/${deviceId}`);
          if (res.data) {
            setThreshold({
              threshold_Temp_Min: res.data.threshold_Temp_Min || null,
              threshold_Temp_Max: res.data.threshold_Temp_Max || null,
              threshold_Humidity_Min: res.data.threshold_Humidity_Min || null,
              threshold_Humidity_Max: res.data.threshold_Humidity_Max || null,
              threshold_SoilMoisture_Min: res.data.threshold_SoilMoisture_Min || null,
              threshold_SoilMoisture_Max: res.data.threshold_SoilMoisture_Max || null,
              threshold_Enabled: res.data.threshold_Enabled === 1 || res.data.threshold_Enabled === true,
              threshold_Duration: res.data.threshold_Duration || 10,
              threshold_Pump: res.data.threshold_Pump || 'V1'
            });
            setAutoIrrigation(res.data.threshold_Enabled === 1 || res.data.threshold_Enabled === true);
          }
        } catch (err) {
          // ignore
        }

        // Fetch latest DHT20 and soil moisture
        try {
          const dhtRes = await axios.get(`/api/v1/dht20/${deviceId}?limit=1`);
          const soilRes = await axios.get(`/api/v1/soil-moisture/${deviceId}?limit=1`);

          const latestDht = Array.isArray(dhtRes.data) && dhtRes.data.length > 0 ? dhtRes.data[0] : null;
          const latestSoil = Array.isArray(soilRes.data) && soilRes.data.length > 0 ? soilRes.data[0] : null;

          setSensorLatest({
            temp: latestDht ? latestDht.dht_Temp : null,
            humid: latestDht ? latestDht.dht_Humid : null,
            soilMoisture: latestSoil ? latestSoil.soil_moisture_Value : null
          });
          setLastSensorUpdate(new Date());
        } catch (err) {
          // ignore
        }
      } catch (error) {
        console.error('Error fetching device data:', error);
      }
    };

    fetchForDevice();
  }, [selectedDeviceId]);

  // Update "time ago" display every second
  useEffect(() => {
    if (!lastSensorUpdate) return;
    
    const updateTimeAgoText = () => {
      const now = new Date();
      const diff = Math.floor((now - lastSensorUpdate) / 1000); // seconds
      
      if (diff < 60) {
        setUpdateTimeAgo(`${diff}s trước`);
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        setUpdateTimeAgo(`${minutes} phút trước`);
      } else {
        const hours = Math.floor(diff / 3600);
        setUpdateTimeAgo(`${hours} giờ trước`);
      }
    };
    
    updateTimeAgoText();
    const interval = setInterval(updateTimeAgoText, 1000);
    
    return () => clearInterval(interval);
  }, [lastSensorUpdate]);
  
  // Save threshold
  const [uiAlert, setUiAlert] = useState(null); // { type: 'success'|'error', message: string }
  const [thresholdValidationError, setThresholdValidationError] = useState(null); // Validation error for threshold_on < threshold_off

  // Validate threshold_on < threshold_off whenever values change
  useEffect(() => {
    let minVal, maxVal;
    
    if (threshold.primaryCondition === 'soilMoisture') {
      minVal = threshold.threshold_SoilMoisture_Min;
      maxVal = threshold.threshold_SoilMoisture_Max;
    } else if (threshold.primaryCondition === 'temperature') {
      minVal = threshold.threshold_Temp_Min;
      maxVal = threshold.threshold_Temp_Max;
    } else if (threshold.primaryCondition === 'humidity') {
      minVal = threshold.threshold_Humidity_Min;
      maxVal = threshold.threshold_Humidity_Max;
    }
    
    if (minVal != null && maxVal != null && !isNaN(Number(minVal)) && !isNaN(Number(maxVal))) {
      const min = Number(minVal);
      const max = Number(maxVal);
      if (min >= max) {
        setThresholdValidationError('Ngưỡng "Dừng khi ≥" phải lớn hơn "Kích hoạt khi dưới"');
      } else {
        setThresholdValidationError(null);
      }
    } else {
      setThresholdValidationError(null);
    }
  }, [threshold.threshold_SoilMoisture_Min, threshold.threshold_SoilMoisture_Max, threshold.threshold_Temp_Min, threshold.threshold_Temp_Max, threshold.threshold_Humidity_Min, threshold.threshold_Humidity_Max, threshold.primaryCondition]);

  const handleSaveThreshold = async () => {
    setLoadingThreshold(true);
    setUiAlert(null);
    try {
      const gardenId = localStorage.getItem('gardenId');
      if (!gardenId) {
        setUiAlert({ type: 'error', message: 'Chưa chọn vườn' });
        setLoadingThreshold(false);
        return;
      }

      // Determine device identifier (selected or stored)
      let deviceId = selectedDeviceId || localStorage.getItem('deviceId');
      if (!deviceId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          } else {
            setUiAlert({ type: 'error', message: 'Không tìm thấy thiết bị' });
            setLoadingThreshold(false);
            return;
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
          setUiAlert({ type: 'error', message: 'Không thể lấy thông tin thiết bị' });
          setLoadingThreshold(false);
          return;
        }
      }

      // Read values based on primary condition
      const dur = threshold.threshold_Duration;
      let minVal, maxVal, validationError = null;

      // Validate based on primary condition
      if (threshold.primaryCondition === 'soilMoisture') {
        const minSoil = threshold.threshold_SoilMoisture_Min;
        const maxSoil = threshold.threshold_SoilMoisture_Max;
        
        if (minSoil == null || minSoil === '' || isNaN(Number(minSoil))) {
          validationError = 'Vui lòng nhập ngưỡng kích hoạt (độ ẩm đất)';
        } else if (maxSoil == null || maxSoil === '' || isNaN(Number(maxSoil))) {
          validationError = 'Vui lòng nhập ngưỡng dừng (độ ẩm đất)';
        } else {
          minVal = Number(minSoil);
          maxVal = Number(maxSoil);
          
          if (minVal < 0 || minVal > 100 || maxVal < 0 || maxVal > 100) {
            validationError = 'Độ ẩm đất phải nằm trong 0 - 100%.';
          } else if (minVal >= maxVal) {
            validationError = 'Ngưỡng "Dừng khi ≥" phải lớn hơn "Kích hoạt khi dưới".';
          }
        }
      } else if (threshold.primaryCondition === 'temperature') {
        const minTemp = threshold.threshold_Temp_Min;
        const maxTemp = threshold.threshold_Temp_Max;
        
        if (minTemp == null || minTemp === '' || isNaN(Number(minTemp))) {
          validationError = 'Vui lòng nhập ngưỡng kích hoạt (nhiệt độ)';
        } else if (maxTemp == null || maxTemp === '' || isNaN(Number(maxTemp))) {
          validationError = 'Vui lòng nhập ngưỡng dừng (nhiệt độ)';
        } else {
          minVal = Number(minTemp);
          maxVal = Number(maxTemp);
          
          if (minVal >= maxVal) {
            validationError = 'Ngưỡng "Dừng khi ≥" phải lớn hơn "Kích hoạt khi dưới".';
          }
        }
      } else if (threshold.primaryCondition === 'humidity') {
        const minHumid = threshold.threshold_Humidity_Min;
        const maxHumid = threshold.threshold_Humidity_Max;
        
        if (minHumid == null || minHumid === '' || isNaN(Number(minHumid))) {
          validationError = 'Vui lòng nhập ngưỡng kích hoạt (độ ẩm không khí)';
        } else if (maxHumid == null || maxHumid === '' || isNaN(Number(maxHumid))) {
          validationError = 'Vui lòng nhập ngưỡng dừng (độ ẩm không khí)';
        } else {
          minVal = Number(minHumid);
          maxVal = Number(maxHumid);
          
          if (minVal < 0 || minVal > 100 || maxVal < 0 || maxVal > 100) {
            validationError = 'Độ ẩm không khí phải nằm trong 0 - 100%.';
          } else if (minVal >= maxVal) {
            validationError = 'Ngưỡng "Dừng khi ≥" phải lớn hơn "Kích hoạt khi dưới".';
          }
        }
      }

      if (validationError) {
        setUiAlert({ type: 'error', message: validationError });
        setLoadingThreshold(false);
        return;
      }

      if (dur == null || dur === '' || isNaN(Number(dur))) {
        setUiAlert({ type: 'error', message: 'Vui lòng nhập thời lượng tưới.' });
        setLoadingThreshold(false);
        return;
      }

      const durationVal = Number(dur);
      if (durationVal <= 0) {
        setUiAlert({ type: 'error', message: 'Thời lượng tưới phải lớn hơn 0.' });
        setLoadingThreshold(false);
        return;
      }

      // Build payload for rule (don't send MQTT yet, only when rule is enabled)
      // Get device name for rule
      const selectedDevice = devices.find(d => d.device_ID === deviceId);
      const deviceName = selectedDevice ? selectedDevice.device_Name : `Thiết bị ${deviceId}`;
      
      // Get pump label
      const pumpLabel = threshold.threshold_Pump === 'V1' ? 'Bơm 1' : 
                        threshold.threshold_Pump === 'V2' ? 'Bơm 2' : 
                        'Cả 2 bơm';
      
      // Create rule name
      const ruleName = editingRuleId 
        ? threshold.ruleName || `Tưới theo ${threshold.primaryCondition === 'soilMoisture' ? 'độ ẩm đất' : threshold.primaryCondition === 'temperature' ? 'nhiệt độ' : 'độ ẩm KK'}`
        : threshold.ruleName || `Tưới theo ${threshold.primaryCondition === 'soilMoisture' ? 'độ ẩm đất' : threshold.primaryCondition === 'temperature' ? 'nhiệt độ' : 'độ ẩm KK'}`;

      // Create or update rule
      const newRule = {
        id: editingRuleId || Date.now(),
        name: ruleName,
        deviceId: deviceId,
        deviceName: deviceName,
        pump: pumpLabel,
        pumpValue: threshold.threshold_Pump,
        primaryCondition: threshold.primaryCondition,
        minValue: minVal,
        maxValue: maxVal,
        duration: durationVal,
        enabled: false, // New rule starts as disabled
        createdAt: editingRuleId ? sensorRules.find(r => r.id === editingRuleId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingRuleId) {
        // Update existing rule
        setSensorRules(prev => prev.map(r => r.id === editingRuleId ? newRule : r));
        setEditingRuleId(null);
      } else {
        // Add new rule
        setSensorRules(prev => [...prev, newRule]);
      }

      // Reset form if not editing
      if (!editingRuleId) {
        setThreshold({
          threshold_Temp_Min: null,
          threshold_Temp_Max: null,
          threshold_Humidity_Min: null,
          threshold_Humidity_Max: null,
          threshold_SoilMoisture_Min: null,
          threshold_SoilMoisture_Max: null,
          threshold_Enabled: false,
          threshold_Duration: 10,
          threshold_Pump: 'V1',
          primaryCondition: 'soilMoisture',
          ruleName: ''
        });
      }
      
      console.log('[handleSaveThreshold] ✓ Request successful');
    } catch (error) {
      console.error('[handleSaveThreshold] ❌ Error saving threshold:', error);
      console.error('[handleSaveThreshold] Error response:', error.response?.data);
      console.error('[handleSaveThreshold] Error status:', error.response?.status);
      const message = error.response?.data?.error || 'Lỗi kết nối server';
      setUiAlert({ type: 'error', message });
    } finally {
      setLoadingThreshold(false);
    }
  };
  
  // Delete sensor rule
  const handleDeleteSensorRule = (ruleId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa luật này?')) {
      setSensorRules(prev => prev.filter(r => r.id !== ruleId));
      if (editingRuleId === ruleId) {
        setEditingRuleId(null);
        // Reset form
        setThreshold({
          threshold_Temp_Min: null,
          threshold_Temp_Max: null,
          threshold_Humidity_Min: null,
          threshold_Humidity_Max: null,
          threshold_SoilMoisture_Min: null,
          threshold_SoilMoisture_Max: null,
          threshold_Enabled: false,
          threshold_Duration: 10,
          threshold_Pump: 'V1',
          primaryCondition: 'soilMoisture',
          ruleName: ''
        });
      }
    }
  };

  // Edit sensor rule
  const handleEditSensorRule = (rule) => {
    setEditingRuleId(rule.id);
    setThreshold({
      threshold_Temp_Min: rule.primaryCondition === 'temperature' ? rule.minValue : null,
      threshold_Temp_Max: rule.primaryCondition === 'temperature' ? rule.maxValue : null,
      threshold_Humidity_Min: rule.primaryCondition === 'humidity' ? rule.minValue : null,
      threshold_Humidity_Max: rule.primaryCondition === 'humidity' ? rule.maxValue : null,
      threshold_SoilMoisture_Min: rule.primaryCondition === 'soilMoisture' ? rule.minValue : null,
      threshold_SoilMoisture_Max: rule.primaryCondition === 'soilMoisture' ? rule.maxValue : null,
      threshold_Enabled: rule.enabled,
      threshold_Duration: rule.duration,
      threshold_Pump: rule.pumpValue,
      primaryCondition: rule.primaryCondition,
      ruleName: rule.name
    });
    setSelectedDeviceId(rule.deviceId);
  };

  // Toggle sensor rule
  const handleToggleSensorRule = async (ruleId) => {
    setSensorRules(prev => {
      const togglingRule = prev.find(r => r.id === ruleId);
      const newEnabled = !togglingRule?.enabled;
      
      // If enabling this rule, disable all others and send MQTT
      const updatedRules = prev.map(r => {
        if (r.id === ruleId) {
          return { ...r, enabled: newEnabled };
        } else {
          // Disable all other rules if we're enabling the toggling rule
          return { ...r, enabled: newEnabled ? false : r.enabled };
        }
      });

      // Send MQTT when enabling a rule
      if (newEnabled && togglingRule) {
        const payload = {
          deviceId: togglingRule.deviceId,
          threshold_on: togglingRule.minValue,
          threshold_off: togglingRule.maxValue,
          duration: togglingRule.duration,
          pump: togglingRule.pumpValue // V1, V2, or ALL
        };

        // Send MQTT to ESP32
        axios.post('/api/update-config', payload)
          .then(() => {
            console.log('[handleToggleSensorRule] ✓ MQTT sent successfully for rule:', togglingRule.name);
          })
          .catch(error => {
            console.error('[handleToggleSensorRule] ❌ Error sending MQTT:', error);
            setUiAlert({ type: 'error', message: 'Không thể gửi cấu hình xuống thiết bị. Vui lòng thử lại.' });
            // Revert toggle on error
            setSensorRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: false } : r));
          });
      } else if (!newEnabled && togglingRule) {
        // When disabling, send OFF command to ESP32
        axios.post(`/api/v1/thresholds/${togglingRule.deviceId}/toggle`, { enabled: false })
          .then(() => {
            console.log('[handleToggleSensorRule] ✓ OFF command sent successfully for rule:', togglingRule.name);
          })
          .catch(error => {
            console.error('[handleToggleSensorRule] ❌ Error sending OFF command:', error);
            setUiAlert({ type: 'error', message: 'Không thể tắt luật. Vui lòng thử lại.' });
            // Revert toggle on error
            setSensorRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: true } : r));
          });
      }

      return updatedRules;
    });
  };

  // Toggle auto irrigation (legacy - for backward compatibility)
  const handleToggleAutoIrrigation = async () => {
    const newValue = !autoIrrigation;
    setAutoIrrigation(newValue);
    
    try {
      const gardenId = localStorage.getItem('gardenId');
      if (!gardenId) return;
      
      // Lấy deviceId từ gardenId
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          } else {
            setAutoIrrigation(!newValue); // Revert
            return;
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
          setAutoIrrigation(!newValue); // Revert
          return;
        }
      }
      
      await axios.post(`/api/v1/thresholds/${deviceId}/toggle`, {
        enabled: newValue
      });
    } catch (error) {
      console.error('Error toggling auto irrigation:', error);
      setAutoIrrigation(!newValue); // Revert on error
    }
  };

  const handleDayToggle = (day) => {
    setScheduleForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  // Hàm điều khiển relay riêng biệt
  const handleControlRelay = async (relayName) => {
    try {
      const relayKey = relayName === 'V1' ? 'relay1' : 'relay2';
      // relayControl stores duration in minutes => convert to seconds for timers/network
      const relayDurationMinutes = relayControl[relayKey].duration;
      const relayDurationSeconds = relayDurationMinutes * 60;
      
      // Prevent duplicate intervals: clear existing for this relay
      if (relayIntervalsRef.current[relayKey]) {
        clearInterval(relayIntervalsRef.current[relayKey]);
        relayIntervalsRef.current[relayKey] = null;
      }
      if (relayTimeoutsRef.current[relayKey]) {
        clearTimeout(relayTimeoutsRef.current[relayKey]);
        relayTimeoutsRef.current[relayKey] = null;
      }

      // Mark watering and store total seconds at start to avoid changes during run affecting UI
      totalSecondsAtStartRef.current[relayKey] = relayDurationSeconds;
      if (relayName === 'V1') {
        setIsWateringRelay1(true);
        setRemainingTime(prev => ({ ...prev, relay1: relayDurationSeconds }));
      } else if (relayName === 'V2') {
        setIsWateringRelay2(true);
        setRemainingTime(prev => ({ ...prev, relay2: relayDurationSeconds }));
      }
      
      // Lấy deviceId từ gardenId
      const gardenId = localStorage.getItem('gardenId');
      let deviceId = localStorage.getItem('deviceId');
      
      // Nếu chưa có deviceId, lấy từ API
      if (!deviceId && gardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        if (relayName === 'V1') {
          setIsWateringRelay1(false);
          setRemainingTime(prev => ({ ...prev, relay1: 0 }));
        }
        if (relayName === 'V2') {
          setIsWateringRelay2(false);
          setRemainingTime(prev => ({ ...prev, relay2: 0 }));
        }
        return;
      }
      
      // Gửi request đến backend để điều khiển relay
      // Server expects duration in seconds
      const response = await axios.post('/controlRelay', { 
        relay: relayName,
        deviceId: parseInt(deviceId),
        duration: relayDurationMinutes * 60,
        mode: 'MANUAL'
      });
      
      console.log(`Relay ${relayName} started:`, response.data);
      
      // Countdown timer (timeLeft in seconds) - store interval so we can clear duplicates
      let timeLeft = relayDurationSeconds;
      const countdownInterval = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        if (relayName === 'V1') {
          setRemainingTime(prev => ({ ...prev, relay1: timeLeft }));
        } else {
          setRemainingTime(prev => ({ ...prev, relay2: timeLeft }));
        }

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          relayIntervalsRef.current[relayKey] = null;
          if (relayName === 'V1') {
            setIsWateringRelay1(false);
            setRemainingTime(prev => ({ ...prev, relay1: 0 }));
          } else {
            setIsWateringRelay2(false);
            setRemainingTime(prev => ({ ...prev, relay2: 0 }));
          }
          totalSecondsAtStartRef.current[relayKey] = 0;

          const now = new Date();
          setLastWatering({
            time: `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
            duration: `${relayDurationMinutes} phút`,
            mode: 'Thủ công',
            area: relayControl[relayKey].area,
            status: 'Hoàn thành'
          });
        }
      }, 1000);
      relayIntervalsRef.current[relayKey] = countdownInterval;

      // Auto stop after specified duration (fallback)
      const fallbackTimeout = setTimeout(() => {
        if (relayIntervalsRef.current[relayKey]) {
          clearInterval(relayIntervalsRef.current[relayKey]);
          relayIntervalsRef.current[relayKey] = null;
        }
        if (relayName === 'V1') {
          setIsWateringRelay1(false);
          setRemainingTime(prev => ({ ...prev, relay1: 0 }));
        } else {
          setIsWateringRelay2(false);
          setRemainingTime(prev => ({ ...prev, relay2: 0 }));
        }
        totalSecondsAtStartRef.current[relayKey] = 0;
      }, relayDurationSeconds * 1000);
      relayTimeoutsRef.current[relayKey] = fallbackTimeout;
    } catch (error) {
      console.error(`Error controlling relay ${relayName}:`, error);
      if (relayName === 'V1') {
        setIsWateringRelay1(false);
        setRemainingTime(prev => ({ ...prev, relay1: 0 }));
      } else {
        setIsWateringRelay2(false);
        setRemainingTime(prev => ({ ...prev, relay2: 0 }));
      }
      alert(`Không thể điều khiển relay ${relayName}. Vui lòng kiểm tra kết nối!`);
    }
  };
  
  // Hàm dừng relay
  const handleStopRelay = async (relayName) => {
    try {
      const gardenId = localStorage.getItem('gardenId');
      let deviceId = localStorage.getItem('deviceId');
      
      if (!deviceId && gardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        return;
      }
      
      const response = await axios.post('/stopRelay', {
        relay: relayName,
        deviceId: parseInt(deviceId)
      });
      
      console.log(`Relay ${relayName} stopped:`, response.data);
      
      if (relayName === 'V1') {
        // clear any running interval/timeout for V1
        if (relayIntervalsRef.current.relay1) {
          clearInterval(relayIntervalsRef.current.relay1);
          relayIntervalsRef.current.relay1 = null;
        }
        if (relayTimeoutsRef.current.relay1) {
          clearTimeout(relayTimeoutsRef.current.relay1);
          relayTimeoutsRef.current.relay1 = null;
        }
        setIsWateringRelay1(false);
        setRemainingTime(prev => ({ ...prev, relay1: 0 }));
        totalSecondsAtStartRef.current.relay1 = 0;
      } else if (relayName === 'V2') {
        // clear any running interval/timeout for V2
        if (relayIntervalsRef.current.relay2) {
          clearInterval(relayIntervalsRef.current.relay2);
          relayIntervalsRef.current.relay2 = null;
        }
        if (relayTimeoutsRef.current.relay2) {
          clearTimeout(relayTimeoutsRef.current.relay2);
          relayTimeoutsRef.current.relay2 = null;
        }
        setIsWateringRelay2(false);
        setRemainingTime(prev => ({ ...prev, relay2: 0 }));
        totalSecondsAtStartRef.current.relay2 = 0;
      }
    } catch (error) {
      console.error(`Error stopping relay ${relayName}:`, error);
      alert(`Không thể dừng relay ${relayName}. Vui lòng thử lại!`);
    }
  };
  
  // Format time
  const formatTime = (seconds) => {
    // Format seconds to mm:ss
    if (!seconds || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Format time to AM/PM from hour, minute, ampm
  const formatTimeToAMPM = (hour, minute, ampm) => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
  };
  
  // Convert hour, minute, ampm to 24h format for storage
  const convertTo24Hour = (hour, minute, ampm) => {
    let hour24 = parseInt(hour);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  // Helper function to format duration (convert seconds to minutes if needed)
  const formatDuration = (duration) => {
    // Handle null/undefined
    if (duration === null || duration === undefined) {
      return '15 phút';
    }
    
    // If it's already a formatted string like "5 phút", check if it needs conversion
    if (typeof duration === 'string' && duration.includes('phút')) {
      // Extract number from string like "900 phút" or "15 phút"
      const match = duration.match(/(\d+)\s*phút/);
      if (match) {
        const numValue = parseInt(match[1]);
        // If the number is >= 60, it's likely in seconds (e.g., "900 phút" should be "15 phút")
        if (numValue >= 60) {
          return `${Math.floor(numValue / 60)} phút`;
        }
      }
      return duration;
    }
    
    // If it's a number, check if it's in seconds (> 60) or minutes
    if (typeof duration === 'number') {
      // If duration is > 60, it's definitely in seconds (since max reasonable minutes would be 60)
      // But we should be more careful: if it's > 120 (2 minutes), it's likely seconds
      if (duration >= 60) {
        // Likely in seconds, convert to minutes
        const minutes = Math.floor(duration / 60);
        return `${minutes} phút`;
      } else {
        // Already in minutes (0-59)
        return `${duration} phút`;
      }
    }
    
    // If it's a string but doesn't have "phút", try to parse it
    if (typeof duration === 'string') {
      const numValue = parseInt(duration);
      if (!isNaN(numValue)) {
        if (numValue >= 60) {
          return `${Math.floor(numValue / 60)} phút`;
        } else {
          return `${numValue} phút`;
        }
      }
    }
    
    // Fallback
    return '15 phút';
  };

  // Progress helpers (safely compute percent and width)
  const getTotalSeconds = (relayKey) => {
    const durationMinutes = relayControl?.[relayKey]?.duration || 0;
    const total = Number(durationMinutes) * 60;
    return Number.isFinite(total) && total > 0 ? total : 0;
  };

  const getElapsedSeconds = (relayKey) => {
    const total = getTotalSeconds(relayKey);
    const rem = remainingTime?.[relayKey] || 0;
    if (total === 0) return 0;
    const elapsed = total - (Number(rem) || 0);
    return Math.max(0, Math.min(elapsed, total));
  };

  const getProgressPercent = (relayKey) => {
    const total = getTotalSeconds(relayKey);
    if (total === 0) return 0;
    return Math.round((getElapsedSeconds(relayKey) / total) * 100);
  };

  const getProgressWidth = (relayKey) => {
    return `${getProgressPercent(relayKey)}%`;
  };

  // Hàm điều khiển cả 2 relay cùng lúc
  const handleStartPump = async () => {
    try {
      setIsWatering(true);
      
      // relayControl durations are in minutes => convert to seconds for timers/network
      const duration1 = relayControl.relay1.duration; // minutes
      const duration2 = relayControl.relay2.duration; // minutes
      setIsWateringRelay1(true);
      setIsWateringRelay2(true);
      setRemainingTime({
        relay1: duration1 * 60,
        relay2: duration2 * 60
      });
      
      // Clear existing intervals/timeouts for both relays to avoid duplicates
      if (relayIntervalsRef.current.relay1) {
        clearInterval(relayIntervalsRef.current.relay1);
        relayIntervalsRef.current.relay1 = null;
      }
      if (relayIntervalsRef.current.relay2) {
        clearInterval(relayIntervalsRef.current.relay2);
        relayIntervalsRef.current.relay2 = null;
      }
      if (relayTimeoutsRef.current.relay1) {
        clearTimeout(relayTimeoutsRef.current.relay1);
        relayTimeoutsRef.current.relay1 = null;
      }
      if (relayTimeoutsRef.current.relay2) {
        clearTimeout(relayTimeoutsRef.current.relay2);
        relayTimeoutsRef.current.relay2 = null;
      }

      // Store totals at start to ensure progress/time calculation is stable
      totalSecondsAtStartRef.current.relay1 = duration1 * 60;
      totalSecondsAtStartRef.current.relay2 = duration2 * 60;
      
      // Lấy deviceId từ gardenId
      const gardenId = localStorage.getItem('gardenId');
      let deviceId = localStorage.getItem('deviceId');
      
      // Nếu chưa có deviceId, lấy từ API
      if (!deviceId && gardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        setIsWatering(false);
        setIsWateringRelay1(false);
        setIsWateringRelay2(false);
        setRemainingTime({ relay1: 0, relay2: 0 });
        return;
      }
      
      // Điều khiển cả 2 relay với thời gian tương ứng (server expects seconds)
      const duration = {
        V1: duration1 * 60,
        V2: duration2 * 60
      };
      
      const response = await axios.post('/controlRelay', { 
        relay: ['V1', 'V2'],
        deviceId: parseInt(deviceId),
        duration: duration,
        mode: 'MANUAL'
      });
      
      console.log('Both relays started:', response.data);
      
      // Countdown timers (work in seconds)
      const timeLeftInit1 = duration1 * 60;
      const timeLeftInit2 = duration2 * 60;
      let timeLeft1 = timeLeftInit1;
      let timeLeft2 = timeLeftInit2;

      const intervalId = setInterval(() => {
        if (timeLeft1 > 0) timeLeft1--;
        if (timeLeft2 > 0) timeLeft2--;

        setRemainingTime({
          relay1: timeLeft1,
          relay2: timeLeft2
        });

        if (timeLeft1 <= 0 && timeLeft2 <= 0) {
          clearInterval(intervalId);
          relayIntervalsRef.current.both = null;
          setIsWatering(false);
          setIsWateringRelay1(false);
          setIsWateringRelay2(false);
          setRemainingTime({ relay1: 0, relay2: 0 });
          totalSecondsAtStartRef.current.relay1 = 0;
          totalSecondsAtStartRef.current.relay2 = 0;

          const now = new Date();
          setLastWatering({
            time: `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
            duration: `${duration1} phút, ${duration2} phút`,
            mode: 'Thủ công',
            area: 'Cả hai bơm',
            status: 'Hoàn thành'
          });
        }
      }, 1000);
      relayIntervalsRef.current.both = intervalId;

      // Auto stop fallback - use longest duration
      const maxDurationSeconds = Math.max(timeLeftInit1, timeLeftInit2);
      const fallback = setTimeout(() => {
        if (relayIntervalsRef.current.both) {
          clearInterval(relayIntervalsRef.current.both);
          relayIntervalsRef.current.both = null;
        }
        setIsWatering(false);
        setIsWateringRelay1(false);
        setIsWateringRelay2(false);
        setRemainingTime({ relay1: 0, relay2: 0 });
        totalSecondsAtStartRef.current.relay1 = 0;
        totalSecondsAtStartRef.current.relay2 = 0;
      }, maxDurationSeconds * 1000);
      relayTimeoutsRef.current.both = fallback;
    } catch (error) {
      console.error('Error starting pumps:', error);
      setIsWatering(false);
      setIsWateringRelay1(false);
      setIsWateringRelay2(false);
      setRemainingTime({ relay1: 0, relay2: 0 });
      alert('Không thể bật máy bơm. Vui lòng kiểm tra kết nối!');
    }
  };

  const handleAddSchedule = async () => {
    try {
      // Validate form data
      if (!scheduleForm.deviceId) {
        alert('Vui lòng chọn thiết bị');
        return;
      }

      // Handle daily mode - set all days
      let daysToSend = scheduleForm.days;
      if (scheduleForm.repeatMode === 'daily') {
        daysToSend = dayOptions; // All days
      }

      if (!daysToSend || daysToSend.length === 0) {
        alert('Vui lòng chọn ít nhất một ngày');
        return;
      }

      console.log('[FRONTEND] Creating schedule with data:', {
        deviceId: parseInt(scheduleForm.deviceId),
        pump: scheduleForm.pump,
        days: scheduleForm.days,
        hour: scheduleForm.hour,
        minute: scheduleForm.minute,
        ampm: scheduleForm.ampm,
        duration: scheduleForm.duration
      });

      const response = await axios.post('/api/v1/schedules', {
        deviceId: parseInt(scheduleForm.deviceId),
        pump: scheduleForm.pump,
        days: daysToSend,
        hour: scheduleForm.hour,
        minute: scheduleForm.minute,
        ampm: scheduleForm.ampm,
        duration: scheduleForm.duration
      });

      console.log('[FRONTEND] Schedule created successfully:', response.data);

      // Refresh all schedules
      const allSchedules = [];
      for (const device of devices) {
        try {
          const response = await axios.get(`/api/v1/schedules/device/${device.device_ID}`);
          if (Array.isArray(response.data)) {
            const schedulesWithDevice = response.data.map(s => {
              // Backend should return duration as formatted string "X phút"
              // But if it's still raw (number in seconds), convert it
              let durationValue = s.duration;
              
              // If duration is not a formatted string, check for raw schedule_Duration
              if (!durationValue || (typeof durationValue === 'number' && durationValue > 60)) {
                durationValue = s.schedule_Duration || durationValue;
              }
              
              return {
                ...s,
                deviceId: device.device_ID,
                device_Name: device.device_Name,
                duration: formatDuration(durationValue)
              };
            });
            allSchedules.push(...schedulesWithDevice);
          }
        } catch (err) {
          console.error(`Error fetching schedules for device ${device.device_ID}:`, err);
        }
      }
      setSchedules(allSchedules);
      
      // Close form and reset
      setShowScheduleForm(false);
      setScheduleForm(prev => ({
        days: ['T2', 'T4', 'T6'],
        hour: 6,
        minute: 0,
        ampm: 'AM',
        duration: 15,
        pump: 'Bơm 1',
        deviceId: prev.deviceId,
        repeatMode: 'byDay'
      }));
    } catch (error) {
      console.error('[FRONTEND] Error creating schedule:', error);
      console.error('[FRONTEND] Error response:', error.response?.data);
      
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error.response?.data?.error || 'Không thể tạo lịch tưới. Vui lòng thử lại.';
      const missingFields = error.response?.data?.missingFields;
      const errorCode = error.response?.data?.errorCode;
      const suggestion = error.response?.data?.suggestion;
      
      if (errorCode === 'DEVICE_NOT_FOUND') {
        alert(`${errorMessage}\n\n${suggestion || 'Vui lòng vào phần Cài đặt để kiểm tra thiết bị.'}`);
      } else if (missingFields && missingFields.length > 0) {
        alert(`Lỗi: ${errorMessage}\nThiếu các trường: ${missingFields.join(', ')}`);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleDeleteSchedule = async (id) => {
    // Xóa luôn không cần confirm
    try {
      await axios.delete(`/api/v1/schedules/${id}`);
      // Refresh all schedules
      const allSchedules = [];
      for (const device of devices) {
        try {
          const response = await axios.get(`/api/v1/schedules/device/${device.device_ID}`);
          if (Array.isArray(response.data)) {
            const schedulesWithDevice = response.data.map(s => ({
              ...s,
              deviceId: device.device_ID,
              device_Name: device.device_Name
            }));
            allSchedules.push(...schedulesWithDevice);
          }
        } catch (err) {
          console.error(`Error fetching schedules for device ${device.device_ID}:`, err);
        }
      }
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Không thể xóa lịch tưới. Vui lòng thử lại.');
    }
  };

  const toggleScheduleStatus = async (id) => {
    try {
      await axios.post(`/api/v1/schedules/${id}/toggle`);
      // Refresh all schedules
      const allSchedules = [];
      for (const device of devices) {
        try {
          const response = await axios.get(`/api/v1/schedules/device/${device.device_ID}`);
          if (Array.isArray(response.data)) {
            const schedulesWithDevice = response.data.map(s => {
              // Backend should return duration as formatted string "X phút"
              // But if it's still raw (number in seconds), convert it
              let durationValue = s.duration;
              
              // If duration is not a formatted string, check for raw schedule_Duration
              if (!durationValue || (typeof durationValue === 'number' && durationValue > 60)) {
                durationValue = s.schedule_Duration || durationValue;
              }
              
              return {
                ...s,
                deviceId: device.device_ID,
                device_Name: device.device_Name,
                duration: formatDuration(durationValue)
              };
            });
            allSchedules.push(...schedulesWithDevice);
          }
        } catch (err) {
          console.error(`Error fetching schedules for device ${device.device_ID}:`, err);
        }
      }
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error toggling schedule status:', error);
      alert('Không thể thay đổi trạng thái lịch. Vui lòng thử lại.');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quản lý hẹn giờ tưới nước</h1>
        <p className="text-gray-500">Thiết lập, quản lý và theo dõi các lịch tưới tự động cho vườn của bạn.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'manual'
              ? 'text-green-600 border-green-600'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <FaWater className={`w-4 h-4 ${activeTab === 'manual' ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Tưới thủ công</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'schedule'
              ? 'text-green-600 border-green-600'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiOutlineCalendar className={`w-4 h-4 ${activeTab === 'schedule' ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Tưới theo lịch</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sensor')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'sensor'
              ? 'text-green-600 border-green-600'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiOutlineChartBar className={`w-4 h-4 ${activeTab === 'sensor' ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Tưới theo cảm biến</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Pump Control: device select + Pump Cards */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">Chọn thiết bị điều khiển <span className="text-red-500">*</span></label>
              <select
                value={selectedDeviceId || ''}
                onChange={(e) => {
                  const deviceId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedDeviceId(deviceId);
                  try { if (deviceId) localStorage.setItem('deviceId', String(deviceId)); } catch (_) {}
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
              >
                <option value="">-- Chọn thiết bị --</option>
                {devices.map(device => (
                  <option key={device.device_ID} value={device.device_ID}>
                    {device.device_Name} (MQTT ID: {device.device_MQTT_ID})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pump 1 Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Bơm 1 ({relayControl.relay1.area})</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-600 font-medium">Online</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Trạng thái</span>
                <span className="text-sm text-gray-700 font-medium">
                  {isWateringRelay1 ? 'Đang tưới...' : 'Đang tắt'}
                </span>
              </div>

              {!isWateringRelay1 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian tưới</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={relayControl.relay1.duration}
                        onChange={(e) => setRelayControl(prev => ({
                          ...prev,
                          relay1: { ...prev.relay1, duration: Math.min(Math.max(parseInt(e.target.value) || 1, 1), 60) }
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">phút</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleControlRelay('V1')}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                  >
                    <HiOutlinePlay className="w-5 h-5" />
                    <span>Bật bơm</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm text-green-600 font-medium">Đang tưới...</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Còn lại</span>
                        <span className="text-2xl font-bold text-green-600">{formatTime(remainingTime.relay1)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-1000"
                        style={{
                          width: getProgressWidth('relay1')
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Tiến độ: {getProgressPercent('relay1')}%
                      </span>
                      <span className="text-xs text-gray-500">Tổng: {relayControl.relay1.duration} phút</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopRelay('V1')}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
                  >
                    <HiOutlineStop className="w-5 h-5" />
                    <span>Dừng ngay</span>
                  </button>
                </>
              )}
            </div>

              {/* Pump 2 Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Bơm 2 ({relayControl.relay2.area})</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-600 font-medium">Online</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Trạng thái</span>
                <span className="text-sm text-gray-700 font-medium">
                  {isWateringRelay2 ? 'Đang tưới...' : 'Đang tắt'}
                </span>
              </div>

              {!isWateringRelay2 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian tưới</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={relayControl.relay2.duration}
                        onChange={(e) => setRelayControl(prev => ({
                          ...prev,
                          relay2: { ...prev.relay2, duration: Math.min(Math.max(parseInt(e.target.value) || 1, 1), 60) }
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-600">phút</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleControlRelay('V2')}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                  >
                    <HiOutlinePlay className="w-5 h-5" />
                    <span>Bật bơm</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm text-green-600 font-medium">Đang tưới...</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Còn lại</span>
                        <span className="text-2xl font-bold text-green-600">{formatTime(remainingTime.relay2)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-1000"
                        style={{
                          width: getProgressWidth('relay2')
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Tiến độ: {getProgressPercent('relay2')}%
                      </span>
                      <span className="text-xs text-gray-500">Tổng: {relayControl.relay2.duration} phút</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopRelay('V2')}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
                  >
                    <HiOutlineStop className="w-5 h-5" />
                    <span>Dừng ngay</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Tác vụ nhanh</h3>
                <p className="text-sm text-gray-500">Kích hoạt cả hai bơm cùng lúc</p>
              </div>
              <button
                onClick={handleStartPump}
                disabled={isWatering || isWateringRelay1 || isWateringRelay2}
                className={`px-6 py-3 bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all ${
                  isWatering || isWateringRelay1 || isWateringRelay2
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'hover:bg-green-600 active:bg-green-700'
                }`}
              >
                <BsLightningCharge className="w-5 h-5" />
                <span>Tưới cả hai bơm</span>
              </button>
            </div>
          </div>

          {/* Latest Watering Log */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Nhật ký tưới gần nhất</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{lastWatering.mode}</p>
                  <p className="text-sm text-gray-500">{lastWatering.area} • {lastWatering.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{lastWatering.time}</span>
                <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                  {lastWatering.status}
                </span>
              </div>
            </div>
          </div>
            </div>
          </div>
      )}

      {activeTab === 'schedule' && (
        <div className="flex gap-6">
          {/* Left: Schedules List - 40% */}
          <div className="w-[40%] space-y-4">
            {/* Search and Filter */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm lịch..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Schedules List */}
            <div className="space-y-3">
              {schedules
                .filter(schedule => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    schedule.time?.toLowerCase().includes(query) ||
                    schedule.days?.toLowerCase().includes(query) ||
                    schedule.pump?.toLowerCase().includes(query)
                  );
                })
                .map(schedule => {
                  const selectedDevice = devices.find(d => d.device_ID === schedule.deviceId || d.device_ID === schedule.device_ID);
                  const isActive = schedule.status === 'active' || schedule.status === 1;
                  
                  // Calculate next run time (simplified)
                  const getNextRun = () => {
                    const now = new Date();
                    const [time, ampm] = schedule.time?.split(' ') || ['06:00', 'AM'];
                    const [hour, minute] = time.split(':').map(Number);
                    let hour24 = hour;
                    if (ampm === 'PM' && hour !== 12) hour24 += 12;
                    if (ampm === 'AM' && hour === 12) hour24 = 0;
                    
                    const nextRun = new Date();
                    nextRun.setHours(hour24, minute, 0, 0);
                    if (nextRun <= now) {
                      nextRun.setDate(nextRun.getDate() + 1);
                    }
                    
                    const isToday = nextRun.toDateString() === now.toDateString();
                    return isToday 
                      ? `Hôm nay ${nextRun.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                      : `Ngày ${nextRun.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} ${nextRun.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                  };

                  return (
                    <div key={schedule.id || schedule.schedule_ID} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Time and Details */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="text-2xl font-bold text-gray-800">
                              {schedule.time?.split(' ')[0] || '06:00'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600">
                                {schedule.days || 'Hàng ngày'} • {formatDuration(schedule.duration || schedule.schedule_Duration)}
                              </div>
                            </div>
                          </div>

                          {/* Pump and Device */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                schedule.pump === 'Bơm 1' ? 'bg-green-500' : 
                                schedule.pump === 'Bơm 2' ? 'bg-blue-500' : 'bg-gray-400'
                              }`} />
                              <span className="text-sm font-medium text-gray-700">
                                {schedule.pump || 'Bơm 1'}
                              </span>
                            </div>
                            {selectedDevice && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                                <span>{selectedDevice.device_Name}</span>
                              </div>
                            )}
                          </div>

                          {/* Status and Next Run */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleScheduleStatus(schedule.id || schedule.schedule_ID)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isActive ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isActive ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className={`text-sm font-medium ${
                                isActive ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {isActive ? 'Đang bật' : 'Tạm dừng'}
                              </span>
                              {isActive && (
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {isActive && (
                              <div className="text-xs text-gray-500">
                                Lần tới: {getNextRun()}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id || schedule.schedule_ID)}
                          className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {schedules.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                  <FaWater className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Chưa có lịch tưới nào được thiết lập</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Create Schedule Form - 60% */}
          {showScheduleForm ? (
            <div className="w-[60%] bg-white rounded-2xl p-6 shadow-lg border border-gray-200 sticky top-6 h-fit">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Tạo lịch mới</h3>
                <button
                  onClick={() => setShowScheduleForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {/* Device Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Thiết bị điều khiển <span className="text-red-500">*</span>
                </label>
                <select
                  value={scheduleForm.deviceId || ''}
                  onChange={(e) => {
                    const deviceId = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedDeviceId(deviceId);
                    setScheduleForm(prev => ({ ...prev, deviceId }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.map(device => (
                    <option key={device.device_ID} value={device.device_ID}>
                      {device.device_Name} (MQTT ID: {device.device_MQTT_ID})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pump Selection - Pill Buttons */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-3">Chọn bơm tưới</label>
                <div className="flex gap-2">
                  {['Bơm 1', 'Bơm 2', 'Cả hai'].map(pump => (
                    <button
                      key={pump}
                      onClick={() => setScheduleForm(prev => ({ ...prev, pump }))}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        scheduleForm.pump === pump
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pump}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Giờ tưới</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formatTimeToAMPM(scheduleForm.hour, scheduleForm.minute, scheduleForm.ampm)}
                    className="w-full px-4 py-3 pr-20 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    <HiOutlineClock className="w-5 h-5 text-gray-400" />
                    <HiOutlineCalendar className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={scheduleForm.hour}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, hour: parseInt(e.target.value) }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none bg-white text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-gray-500">:</span>
                  <select
                    value={scheduleForm.minute}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, minute: parseInt(e.target.value) }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none bg-white text-sm"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={scheduleForm.ampm}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, ampm: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none bg-white text-sm"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Thời lượng (phút)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScheduleForm(prev => ({ ...prev, duration: Math.max(1, prev.duration - 1) }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                    min="1"
                    max="60"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-center"
                  />
                  <button
                    onClick={() => setScheduleForm(prev => ({ ...prev, duration: Math.min(60, prev.duration + 1) }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  {[5, 15, 30].map(min => (
                    <button
                      key={min}
                      onClick={() => setScheduleForm(prev => ({ ...prev, duration: min }))}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        scheduleForm.duration === min
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {min}'
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Mode */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Lặp lại</label>
                <div className="flex gap-2">
                  {[
                    { key: 'daily', label: 'Hàng ngày' },
                    { key: 'byDay', label: 'Theo thứ' },
                    { key: 'custom', label: 'Tùy chỉnh' }
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => {
                        setScheduleForm(prev => ({ ...prev, repeatMode: mode.key }));
                        if (mode.key === 'daily') {
                          setScheduleForm(prev => ({ ...prev, days: dayOptions }));
                        } else if (mode.key === 'byDay') {
                          setScheduleForm(prev => ({ ...prev, days: ['T2', 'T4', 'T6'] }));
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        scheduleForm.repeatMode === mode.key
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Selection - Only show if not daily */}
              {scheduleForm.repeatMode !== 'daily' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 mb-3">Chọn ngày</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map(day => (
                      <button
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`w-10 h-10 rounded-full font-medium text-sm transition-all duration-200 ${
                          scheduleForm.days.includes(day)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Box */}
              {scheduleForm.deviceId && (() => {
                const selectedDevice = devices.find(d => d.device_ID === scheduleForm.deviceId);
                return (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Xem trước lịch tưới:</p>
                        <p>
                          Bạn sẽ tưới <strong>{scheduleForm.pump}</strong> vào lúc{' '}
                          <strong>{formatTimeToAMPM(scheduleForm.hour, scheduleForm.minute, scheduleForm.ampm)}</strong>,{' '}
                          {scheduleForm.repeatMode === 'daily' ? (
                            <strong>hàng ngày</strong>
                          ) : (
                            <>các ngày <strong>{scheduleForm.days.join(', ')}</strong></>
                          )}{' '}
                          trong <strong>{scheduleForm.duration} phút</strong>.
                          {selectedDevice && (
                            <> (Thiết bị: <strong>{selectedDevice.device_Name}</strong>)</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowScheduleForm(false);
                    setScheduleForm({
                      days: ['T2', 'T4', 'T6'],
                      hour: 6,
                      minute: 0,
                      ampm: 'AM',
                      duration: 15,
                      pump: 'Bơm 1',
                      deviceId: selectedDeviceId,
                      repeatMode: 'byDay'
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddSchedule}
                  disabled={scheduleForm.days.length === 0 || !scheduleForm.deviceId || devices.length === 0}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaWater className="w-4 h-4" />
                  <span>Tạo lịch tưới</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowScheduleForm(true)}
              className="w-[60%] h-fit bg-white rounded-2xl p-6 shadow-sm border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-green-600"
            >
              <HiOutlinePlus className="w-8 h-8" />
              <span className="font-medium">Tạo lịch mới</span>
            </button>
          )}
        </div>
      )}

      {activeTab === 'sensor' && (
        <div className="flex gap-6 items-start">
          {/* Left column: Rules list */}
          <div className="w-[32%]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">DANH SÁCH LUẬT</h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sensorRules.length === 0 && (
                <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
                  <p className="text-gray-500 text-sm">Chưa có luật nào. Nhấn "Thêm" để tạo luật mới.</p>
                </div>
              )}
              
              {sensorRules.map(rule => {
                const conditionText = rule.primaryCondition === 'soilMoisture' 
                  ? `Độ ẩm đất < ${rule.minValue}% • Dừng khi ≥ ${rule.maxValue}%`
                  : rule.primaryCondition === 'temperature'
                  ? `Nhiệt độ < ${rule.minValue}°C • Dừng khi ≥ ${rule.maxValue}°C`
                  : `Độ ẩm KK < ${rule.minValue}% • Dừng khi ≥ ${rule.maxValue}%`;
                
                const timeAgo = rule.updatedAt 
                  ? (() => {
                      const now = new Date();
                      const updated = new Date(rule.updatedAt);
                      const diffSeconds = Math.floor((now - updated) / 1000);
                      if (diffSeconds < 60) return `${diffSeconds}s trước`;
                      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
                      return `${Math.floor(diffSeconds / 3600)} giờ trước`;
                    })()
                  : 'vài phút trước';

                return (
                  <div
                    key={rule.id}
                    className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all ${
                      rule.enabled ? 'border-green-500' : 'border-gray-200'
                    } ${editingRuleId === rule.id ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mb-1">{conditionText}</p>
                        <div className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">{rule.pump}</span>
                          {' • '}
                          <span>{rule.deviceName}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Cập nhật: {timeAgo}</span>
                          {rule.enabled && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">ĐANG CHẠY</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSensorRule(rule)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Chỉnh sửa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSensorRule(rule.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Xóa"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                        <label className="text-xs text-gray-500">Trạng thái</label>
                        <button
                          onClick={() => handleToggleSensorRule(rule.id)}
                          className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rule.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: Rule editor / form */}
          <div className="w-[68%] bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Scenario Name and Action Buttons */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
              <div className="flex-1">
                {editingRuleId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Tên luật</label>
                    <input
                      type="text"
                      value={threshold.ruleName || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, ruleName: e.target.value }))}
                      placeholder="Nhập tên luật..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Tên luật</label>
                    <input
                      type="text"
                      value={threshold.ruleName || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, ruleName: e.target.value }))}
                      placeholder="Nhập tên luật (ví dụ: Tưới tự động theo độ ẩm đất)..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  onClick={() => {
                    setEditingRuleId(null);
                    setThreshold({
                      threshold_Temp_Min: null,
                      threshold_Temp_Max: null,
                      threshold_Humidity_Min: null,
                      threshold_Humidity_Max: null,
                      threshold_SoilMoisture_Min: null,
                      threshold_SoilMoisture_Max: null,
                      threshold_Enabled: false,
                      threshold_Duration: 10,
                      threshold_Pump: 'V1',
                      primaryCondition: 'soilMoisture',
                      ruleName: ''
                    });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveThreshold}
                  disabled={loadingThreshold || thresholdValidationError !== null}
                  className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                    loadingThreshold || thresholdValidationError !== null 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {loadingThreshold ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>{editingRuleId ? 'Cập nhật' : 'Lưu cấu hình'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1. CHỌN ĐỐI TƯỢNG & AN TOÀN */}
            <div className="mb-8">
              <div className="mb-4 text-sm font-semibold text-gray-700">1. CHỌN ĐỐI TƯỢNG & AN TOÀN</div>
              
              {/* Device Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Thiết bị điều khiển</label>
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => {
                    const deviceId = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedDeviceId(deviceId);
                    try { if (deviceId) localStorage.setItem('deviceId', String(deviceId)); } catch (_) {}
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.map(device => (
                    <option key={device.device_ID} value={device.device_ID}>
                      {device.device_Name} (MQTT ID: {device.device_MQTT_ID})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pump Selection - Multiple selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Máy bơm hoạt động</label>
                <div className="flex gap-3">
                  {[
                    { num: 1, label: 'Bơm 1', value: 'V1' },
                    { num: 2, label: 'Bơm 2', value: 'V2' },
                    { num: 3, label: 'Cả 2 bơm', value: 'ALL' }
                  ].map(pump => {
                    const isSelected = threshold.threshold_Pump === pump.value;
                    return (
                      <button
                        key={pump.num}
                        onClick={() => {
                          setThreshold(prev => ({ ...prev, threshold_Pump: pump.value }));
                        }}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'bg-green-50 border-green-500' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {isSelected && (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <FaWater className={`w-6 h-6 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                          <div className={`text-sm font-medium ${isSelected ? 'text-green-700' : 'text-gray-600'}`}>
                            {pump.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Maximum Watering Time */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Thời gian tưới tối đa</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newDuration = Math.max(1, (threshold.threshold_Duration || 10) - 1);
                      setThreshold(prev => ({ ...prev, threshold_Duration: newDuration }));
                    }}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-800"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <span className="text-lg font-semibold text-gray-800">{threshold.threshold_Duration || 10}</span>
                    <span className="text-sm text-gray-600 ml-2">PHÚT</span>
                  </div>
                  <button
                    onClick={() => {
                      const newDuration = Math.min(60, (threshold.threshold_Duration || 10) + 1);
                      setThreshold(prev => ({ ...prev, threshold_Duration: newDuration }));
                    }}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-800"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tự động ngắt bơm để bảo vệ thiết bị nếu xảy ra rò rỉ hoặc lỗi cảm biến.
                </p>
              </div>
            </div>

            {/* 2. CẢM BIẾN ĐIỀU KIỆN */}
            <div className="mb-8">
              <div className="mb-4 text-sm font-semibold text-gray-700">2. CẢM BIẾN ĐIỀU KIỆN</div>
              <div className="grid grid-cols-3 gap-4">
                {/* Soil Moisture */}
                <button
                  onClick={() => setThreshold(prev => ({ ...prev, primaryCondition: 'soilMoisture' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    threshold.primaryCondition === 'soilMoisture'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${threshold.primaryCondition === 'soilMoisture' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                      </svg>
                      <span className={`text-sm font-medium ${threshold.primaryCondition === 'soilMoisture' ? 'text-green-800' : 'text-gray-500'}`}>Độ ẩm đất</span>
                    </div>
                    {threshold.primaryCondition === 'soilMoisture' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs font-medium ${threshold.primaryCondition === 'soilMoisture' ? 'text-green-700' : 'text-gray-400'}`}>
                    {threshold.primaryCondition === 'soilMoisture' ? 'SỬ DỤNG LÀM ĐIỀU KIỆN CHÍNH' : 'NHẤN ĐỂ KÍCH HOẠT'}
                  </p>
                </button>

                {/* Temperature */}
                <button
                  onClick={() => setThreshold(prev => ({ ...prev, primaryCondition: 'temperature' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    threshold.primaryCondition === 'temperature'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${threshold.primaryCondition === 'temperature' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className={`text-sm font-medium ${threshold.primaryCondition === 'temperature' ? 'text-green-800' : 'text-gray-500'}`}>Nhiệt độ</span>
                    </div>
                    {threshold.primaryCondition === 'temperature' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs font-medium ${threshold.primaryCondition === 'temperature' ? 'text-green-700' : 'text-gray-400'}`}>
                    {threshold.primaryCondition === 'temperature' ? 'SỬ DỤNG LÀM ĐIỀU KIỆN CHÍNH' : 'NHẤN ĐỂ KÍCH HOẠT'}
                  </p>
                </button>

                {/* Air Humidity */}
                <button
                  onClick={() => setThreshold(prev => ({ ...prev, primaryCondition: 'humidity' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    threshold.primaryCondition === 'humidity'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${threshold.primaryCondition === 'humidity' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      <span className={`text-sm font-medium ${threshold.primaryCondition === 'humidity' ? 'text-green-800' : 'text-gray-500'}`}>Độ ẩm KK</span>
                    </div>
                    {threshold.primaryCondition === 'humidity' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs font-medium ${threshold.primaryCondition === 'humidity' ? 'text-green-700' : 'text-gray-400'}`}>
                    {threshold.primaryCondition === 'humidity' ? 'SỬ DỤNG LÀM ĐIỀU KIỆN CHÍNH' : 'NHẤN ĐỂ KÍCH HOẠT'}
                  </p>
                </button>
              </div>
            </div>

            {/* Thông số hiện tại và Ngưỡng */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  {threshold.primaryCondition === 'soilMoisture' && (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                    </svg>
                  )}
                  {threshold.primaryCondition === 'temperature' && (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {threshold.primaryCondition === 'humidity' && (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Thông số hiện tại</p>
                    <p className="text-xs text-gray-500">Cập nhật {updateTimeAgo}</p>
                  </div>
                </div>
                <div className="text-6xl font-bold text-green-600 text-center py-4">
                  {threshold.primaryCondition === 'soilMoisture' && (sensorLatest.soilMoisture !== null ? `${sensorLatest.soilMoisture}%` : '—')}
                  {threshold.primaryCondition === 'temperature' && (sensorLatest.temp !== null ? `${sensorLatest.temp}°C` : '—')}
                  {threshold.primaryCondition === 'humidity' && (sensorLatest.humid !== null ? `${sensorLatest.humid}%` : '—')}
                </div>
              </div>

              {threshold.primaryCondition === 'soilMoisture' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG KÍCH HOẠT (DƯỚI %)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_SoilMoisture_Min || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_SoilMoisture_Min: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="VD: 40"
                      className={`w-full px-4 py-3 rounded-lg border text-sm ${
                        thresholdValidationError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG DỪNG (TRÊN %)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_SoilMoisture_Max || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_SoilMoisture_Max: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="VD: 70"
                      className={`w-full px-4 py-3 rounded-lg border text-sm ${
                        thresholdValidationError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {threshold.primaryCondition === 'temperature' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG KÍCH HOẠT (DƯỚI °C)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_Temp_Min || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_Temp_Min: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="VD: 25"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG DỪNG (TRÊN °C)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_Temp_Max || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_Temp_Max: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="VD: 35"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm"
                    />
                  </div>
                </div>
              )}

              {threshold.primaryCondition === 'humidity' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG KÍCH HOẠT (DƯỚI %)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_Humidity_Min || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_Humidity_Min: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="VD: 50"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGƯỠNG DỪNG (TRÊN %)
                    </label>
                    <input
                      type="number"
                      value={threshold.threshold_Humidity_Max || ''}
                      onChange={(e) => setThreshold(prev => ({ ...prev, threshold_Humidity_Max: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="VD: 80"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm"
                    />
                  </div>
                </div>
              )}

              {thresholdValidationError && (
                <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {thresholdValidationError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Irrigation;


