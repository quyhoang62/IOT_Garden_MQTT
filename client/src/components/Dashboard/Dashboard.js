import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  WiThermometer,
  WiHumidity,
  WiDayCloudy,
  WiStrongWind,
  WiDaySunny,
  WiRain,
  WiCloudy,
  WiSnow,
  WiFog,
  WiThunderstorm,
  WiBarometer,
} from "react-icons/wi";
import { FaSeedling, FaMapMarkerAlt, FaEye } from "react-icons/fa";
import { HiRefresh, HiCalendar } from "react-icons/hi";
import SensorChart from "./SensorChart";

function Dashboard({ message }) {
  const [weather, setWeather] = useState({
    temp: "--",
    feelsLike: "--",
    tempMax: "--",
    tempMin: "--",
    description: "Đang tải...",
    humidity: "--",
    windSpeed: "--",
    pressure: "--",
    visibility: "--",
    icon: "cloudy",
    lastUpdate: null,
    location: "Hà Nội",
  });
  const [forecast, setForecast] = useState([]);
  const [thresholds, setThresholds] = useState({
    temp: 30,
    humid: 50,
    amdat: 30,
  });
  const [lastSensorUpdate, setLastSensorUpdate] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [sensorData, setSensorData] = useState({
    air_temperature: null,
    air_humid: null,
    soil_moisture: null
  });
  const [isWateringRelay1, setIsWateringRelay1] = useState(false);
  const [isWateringRelay2, setIsWateringRelay2] = useState(false);
  const [pumpMode, setPumpMode] = useState('MANUAL');
  const gardenId = localStorage.getItem("gardenId");
  const prevDeviceIdRef = useRef(null);

  // Fetch weather data from OpenWeatherMap API
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = "ba1385e421012d370b288afbab3bc654";
        const city = "Hanoi"; // Hà Nội
        
        // Fetch current weather
        const currentResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=vi`
        );

        // Fetch 5-day forecast
        const forecastResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=vi`
        );

        const currentData = currentResponse.data;
        const forecastData = forecastResponse.data;

        setWeather({
          temp: Math.round(currentData.main.temp),
          feelsLike: Math.round(currentData.main.feels_like),
          tempMax: Math.round(currentData.main.temp_max),
          tempMin: Math.round(currentData.main.temp_min),
          description: currentData.weather[0].description,
          humidity: currentData.main.humidity,
          windSpeed: Math.round((currentData.wind?.speed || 0) * 3.6), // Convert m/s to km/h
          pressure: currentData.main.pressure,
          visibility: currentData.visibility ? (currentData.visibility / 1000).toFixed(1) : "--",
          icon: currentData.weather[0].main.toLowerCase(),
          lastUpdate: new Date(),
          location: "Hà Nội",
        });

        // Process forecast data - get one forecast per day (at 12:00 if available, otherwise first of day)
        const dailyForecasts = [];
        const processedDates = new Set();
        
        // Map for Vietnamese day abbreviations
        const dayMap = {
          'CN': 'CN', // Chủ nhật
          'T2': 'T2', // Thứ 2
          'T3': 'T3', // Thứ 3
          'T4': 'T4', // Thứ 4
          'T5': 'T5', // Thứ 5
          'T6': 'T6', // Thứ 6
          'T7': 'T7', // Thứ 7
        };
        
        forecastData.list.forEach((item) => {
          const date = new Date(item.dt * 1000);
          const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          const dayStr = dayNames[dayOfWeek];
          const dateKey = date.toDateString();
          
          // Only add one forecast per day
          if (!processedDates.has(dateKey)) {
            processedDates.add(dateKey);
            dailyForecasts.push({
              day: dayStr,
              temp: Math.round(item.main.temp),
              icon: item.weather[0].main.toLowerCase(),
              description: item.weather[0].description,
            });
          }
        });

        // Limit to 5 days
        setForecast(dailyForecasts.slice(0, 5));
      } catch (error) {
        console.error("Error fetching weather:", error);
        setWeather((prev) => ({
          ...prev,
          temp: "--",
          description: "Không thể tải dữ liệu",
          lastUpdate: new Date(),
        }));
        setForecast([]);
      }
    };

    fetchWeather();
    // Refresh weather data every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch devices on mount - filter by gardenId if available
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Try to fetch devices for the current garden first
        let devicesList = [];
        if (gardenId) {
          try {
            const response = await axios.get(`/api/v1/devices/garden/${gardenId}`);
            devicesList = Array.isArray(response.data) ? response.data : [];
          } catch (err) {
            console.warn('Error fetching devices by garden, trying all devices:', err);
            // Fallback to all devices if garden-specific fetch fails
            const response = await axios.get('/api/v1/devices');
            devicesList = Array.isArray(response.data) ? response.data : [];
          }
        } else {
          // If no gardenId, fetch all devices
          const response = await axios.get('/api/v1/devices');
          devicesList = Array.isArray(response.data) ? response.data : [];
        }
        
        setDevices(devicesList);
        
        // Auto-select device: ưu tiên từ localStorage, nếu không có thì chọn device đầu tiên
        let deviceId = localStorage.getItem('deviceId');
        if (deviceId && devicesList.some(d => d.device_ID === parseInt(deviceId))) {
          setSelectedDeviceId(parseInt(deviceId));
        } else if (devicesList.length > 0) {
          const firstDeviceId = devicesList[0].device_ID;
          setSelectedDeviceId(firstDeviceId);
          localStorage.setItem('deviceId', firstDeviceId);
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        setDevices([]);
      }
    };

    fetchDevices();
  }, [gardenId]);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const response = await axios.get(`/api/v1/condition/${gardenId}`);
        if (response.data && response.data[0]) {
          const condition = response.data[0];
          setThresholds({
            temp: condition.condition_Temp,
            humid: condition.condition_Humid,
            amdat: condition.condition_Amdat,
          });
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    if (gardenId) fetchThresholds();
  }, [gardenId]);

  // Fetch sensor data for selected device
  useEffect(() => {
    const fetchSensorData = async () => {
      if (!selectedDeviceId) {
        // If no device selected, use message prop as fallback
        if (message?.air_temperature || message?.air_humid || message?.soil_moisture) {
          setSensorData({
            air_temperature: message.air_temperature,
            air_humid: message.air_humid,
            soil_moisture: message.soil_moisture
          });
          setLastSensorUpdate(new Date());
        }
        return;
      }

      try {
        // Fetch latest DHT20 and soil moisture data for the selected device
        const [dhtRes, soilRes] = await Promise.all([
          axios.get(`/api/v1/dht20/${selectedDeviceId}?limit=1`),
          axios.get(`/api/v1/soil-moisture/${selectedDeviceId}?limit=1`)
        ]);

        const latestDht = Array.isArray(dhtRes.data) && dhtRes.data.length > 0 ? dhtRes.data[0] : null;
        const latestSoil = Array.isArray(soilRes.data) && soilRes.data.length > 0 ? soilRes.data[0] : null;

        setSensorData({
          air_temperature: latestDht ? latestDht.dht_Temp : null,
          air_humid: latestDht ? latestDht.dht_Humid : null,
          soil_moisture: latestSoil ? latestSoil.soil_moisture_Value : null
        });
        setLastSensorUpdate(new Date());
      } catch (error) {
        console.error('Error fetching sensor data:', error);
        // Fallback to message prop if API fails
        if (message?.air_temperature || message?.air_humid || message?.soil_moisture) {
          setSensorData({
            air_temperature: message.air_temperature,
            air_humid: message.air_humid,
            soil_moisture: message.soil_moisture
          });
        }
      }
    };

    fetchSensorData();
    
    // Set up polling to refresh sensor data every 30 seconds
    const interval = setInterval(fetchSensorData, 30000);
    return () => clearInterval(interval);
  }, [selectedDeviceId, message]);

  // Update last sensor update time when message changes (for real-time updates)
  useEffect(() => {
    if (
      message?.air_temperature ||
      message?.air_humid ||
      message?.soil_moisture
    ) {
      // Only update if no device is selected or if message matches current device
      if (!selectedDeviceId) {
        setSensorData({
          air_temperature: message.air_temperature,
          air_humid: message.air_humid,
          soil_moisture: message.soil_moisture
        });
        setLastSensorUpdate(new Date());
      }
    }
  }, [message, selectedDeviceId]);

  // Reset pump status when device changes
  // Note: We reset to false to avoid showing wrong state, but allow users to still control pumps
  useEffect(() => {
    if (selectedDeviceId) {
      const currentDeviceId = selectedDeviceId;
      const previousDeviceId = prevDeviceIdRef.current;
      
      // If device actually changed (not initial load or same device reselected)
      if (previousDeviceId !== null && previousDeviceId !== currentDeviceId) {
        // Reset pump status states when switching to a different device
        // This prevents showing the previous device's state, but users can still control pumps
        setIsWateringRelay1(false);
        setIsWateringRelay2(false);
      }
      
      // Update the previous device ID ref
      prevDeviceIdRef.current = currentDeviceId;
    }
  }, [selectedDeviceId]);

  // Get weather icon based on condition
  const getWeatherIcon = (iconType, size = "w-10 h-10") => {
    const sizeClass = size;
    switch (iconType) {
      case "clear":
        return <WiDaySunny className={`${sizeClass} text-yellow-500`} />;
      case "rain":
      case "drizzle":
        return <WiRain className={`${sizeClass} text-blue-500`} />;
      case "clouds":
        return <WiCloudy className={`${sizeClass} text-gray-500`} />;
      case "snow":
        return <WiSnow className={`${sizeClass} text-blue-300`} />;
      case "mist":
      case "fog":
      case "haze":
        return <WiFog className={`${sizeClass} text-gray-400`} />;
      case "thunderstorm":
        return <WiThunderstorm className={`${sizeClass} text-purple-500`} />;
      default:
        return <WiDayCloudy className={`${sizeClass} text-yellow-500`} />;
    }
  };

  // Format time for "Cập nhật lúc" display
  const formatUpdateTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Hàm bật relay
  const handleStartRelay = async (relayName) => {
    try {
      if (relayName === 'V1') {
        setIsWateringRelay1(true);
      } else if (relayName === 'V2') {
        setIsWateringRelay2(true);
      }
      
      // Lấy deviceId
      let deviceId = selectedDeviceId || localStorage.getItem('deviceId');
      
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
        }
        if (relayName === 'V2') {
          setIsWateringRelay2(false);
        }
        return;
      }
      
      // Gửi request đến backend để bật relay
      const response = await axios.post('/controlRelay', { 
        relay: relayName,
        deviceId: parseInt(deviceId),
        duration: 9999, // Bật liên tục
        mode: pumpMode || 'MANUAL'
      });
      
      console.log(`Relay ${relayName} started:`, response.data);
    } catch (error) {
      console.error(`Error starting relay ${relayName}:`, error);
      if (relayName === 'V1') {
        setIsWateringRelay1(false);
      } else {
        setIsWateringRelay2(false);
      }
      alert(`Không thể bật relay ${relayName}. Vui lòng kiểm tra kết nối!`);
    }
  };
  
  // Hàm tắt relay
  const handleStopRelay = async (relayName) => {
    try {
      // Luôn ưu tiên sử dụng selectedDeviceId hiện tại để đảm bảo đúng thiết bị
      let deviceId = selectedDeviceId;
      
      // Nếu chưa có selectedDeviceId, lấy từ localStorage
      if (!deviceId) {
        deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
          deviceId = parseInt(deviceId);
        }
      }
      
      // Nếu vẫn chưa có deviceId, lấy từ API
      if (!deviceId && gardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${gardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', String(deviceId));
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        return;
      }
      
      // Gửi request đến backend để tắt relay với deviceId hiện tại
      const response = await axios.post('/stopRelay', {
        relay: relayName,
        deviceId: parseInt(deviceId)
      });
      
      console.log(`Relay ${relayName} stopped for device ${deviceId}:`, response.data);
      
      // Cập nhật trạng thái sau khi tắt thành công
      if (relayName === 'V1') {
        setIsWateringRelay1(false);
      } else if (relayName === 'V2') {
        setIsWateringRelay2(false);
      }
    } catch (error) {
      console.error(`Error stopping relay ${relayName}:`, error);
      alert(`Không thể tắt relay ${relayName}. Vui lòng thử lại!`);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* Header with Device Selector */}
      <div className="flex items-center justify-between mb-[19px]">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        {devices.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Chọn thiết bị:</label>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => {
                const deviceId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedDeviceId(deviceId);
                if (deviceId) {
                  localStorage.setItem('deviceId', String(deviceId));
                }
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white text-sm font-medium text-gray-700 min-w-[200px]"
            >
              {devices.map(device => (
                <option key={device.device_ID} value={device.device_ID}>
                  {device.device_Name} (MQTT ID: {device.device_MQTT_ID})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top Row: Weather Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[19px] mb-[19px]">
        {/* Today's Weather Card */}
        <div className="bg-white rounded-2xl p-[11px] shadow-md">
          <div className="flex items-center justify-between mb-[7px]">
            <h2 className="text-lg font-bold text-gray-800">HÔM NAY</h2>
            <div className="flex items-center gap-2">
              <HiRefresh className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">
                {formatUpdateTime(weather.lastUpdate)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-[7px]">
            <FaMapMarkerAlt className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">{weather.location}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-5xl font-bold text-gray-800">
                  {weather.temp}°
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Cảm nhận:</span>
                  <span className="text-sm font-medium text-gray-600">{weather.feelsLike}°</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Cao/Thấp:</span>
                  <span className="text-sm font-medium text-gray-600">{weather.tempMax}°/{weather.tempMin}°</span>
                </div>
              </div>
              <div className="flex flex-col">
                {getWeatherIcon(weather.icon, "w-12 h-12")}
                <span className="text-sm text-gray-500 capitalize mt-1">
                  {weather.description}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <WiHumidity className="w-5 h-5 text-blue-500" />
                <span>Độ ẩm: {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <WiStrongWind className="w-5 h-5 text-gray-500" />
                <span>Gió: {weather.windSpeed} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <WiBarometer className="w-5 h-5 text-purple-500" />
                <span>Áp suất: {weather.pressure} hPa</span>
              </div>
              <div className="flex items-center gap-2">
                <FaEye className="w-4 h-4 text-gray-500" />
                <span>Tầm nhìn: {weather.visibility} km</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast Card */}
        <div className="bg-white rounded-2xl p-[11px] shadow-md">
          <div className="flex items-center gap-2 mb-[7px]">
            <HiCalendar className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-800">Dự báo 5 ngày</h2>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {forecast.length > 0 ? (
              forecast.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-700 mb-2">
                    {day.day}
                  </span>
                  <div className="mb-2">
                    {getWeatherIcon(day.icon, "w-8 h-8")}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {day.temp}°
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-5 text-center text-gray-400 text-sm py-4">
                Đang tải dự báo...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pump Control Section */}
      <div className="bg-white rounded-2xl p-[19px] shadow-md mb-[19px]">
        <h3 className="text-lg font-semibold text-gray-800 mb-[11px]">Điều khiển bơm</h3>
        
        {/* Pump Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[11px]">
          {/* Pump 1 (V1) Card */}
          <div className="bg-white rounded-lg p-[15px] border border-gray-200">
            <div className="flex items-center justify-between mb-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <h4 className="text-lg font-semibold text-gray-800">Bơm 1</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isWateringRelay1
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {isWateringRelay1 ? 'ĐANG CHẠY' : 'CHỜ'}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleStartRelay('V1')}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-green-500 text-white hover:bg-green-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bật
              </button>
              <button
                onClick={() => handleStopRelay('V1')}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                </svg>
                Tắt
              </button>
            </div>
          </div>

          {/* Pump 2 (V2) Card */}
          <div className="bg-white rounded-lg p-[15px] border border-gray-200">
            <div className="flex items-center justify-between mb-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <h4 className="text-lg font-semibold text-gray-800">Bơm 2</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isWateringRelay2
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {isWateringRelay2 ? 'ĐANG CHẠY' : 'CHỜ'}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleStartRelay('V2')}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-green-500 text-white hover:bg-green-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bật
              </button>
              <button
                onClick={() => handleStopRelay('V2')}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                </svg>
                Tắt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[19px] mb-[19px]">
        {/* Temperature Card */}
        <div className="bg-white rounded-2xl p-[19px] shadow-md">
          <div className="flex items-center justify-between mb-[11px]">
            <h3 className="text-sm font-bold text-gray-800">NHIỆT ĐỘ</h3>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <WiThermometer className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-800 mb-[7px]">
            {sensorData.air_temperature ?? "--"}°C
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500">
              Cập nhật: {formatUpdateTime(lastSensorUpdate)}
            </span>
          </div>
        </div>

        {/* Air Humidity Card */}
        <div className="bg-white rounded-2xl p-[19px] shadow-md">
          <div className="flex items-center justify-between mb-[11px]">
            <h3 className="text-sm font-bold text-gray-800">ĐỘ ẨM KHÔNG KHÍ</h3>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <WiHumidity className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-800 mb-[7px]">
            {sensorData.air_humid ?? "--"}%
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500">
              Cập nhật: {formatUpdateTime(lastSensorUpdate)}
            </span>
          </div>
        </div>

        {/* Soil Moisture Card */}
        <div className="bg-white rounded-2xl p-[19px] shadow-md">
          <div className="flex items-center justify-between mb-[11px]">
            <h3 className="text-sm font-bold text-gray-800">ĐỘ ẨM ĐẤT</h3>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FaSeedling className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-800 mb-[7px]">
            {sensorData.soil_moisture ?? "--"}%
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500">
              Cập nhật: {formatUpdateTime(lastSensorUpdate)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-[19px] shadow-md">
        <SensorChart gardenId={gardenId} deviceId={selectedDeviceId} />
      </div>
    </div>
  );
}

export default Dashboard;
