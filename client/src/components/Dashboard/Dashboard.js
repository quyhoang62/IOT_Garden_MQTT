import React, { useState, useEffect } from "react";
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
} from "react-icons/wi";
import { FaSeedling } from "react-icons/fa";
import SensorChart from "./SensorChart";

function Dashboard({ message }) {
  const [weather, setWeather] = useState({
    temp: "--",
    description: "Đang tải...",
    humidity: "--",
    windSpeed: "--",
    icon: "cloudy",
    lastUpdate: null,
  });
  const [thresholds, setThresholds] = useState({
    temp: 30,
    humid: 50,
    amdat: 30,
  });
  const [lastSensorUpdate, setLastSensorUpdate] = useState(null);
  const gardenId = localStorage.getItem("gardenId");

  // Fetch weather data from OpenWeatherMap API
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Sử dụng OpenWeatherMap API - thay YOUR_API_KEY bằng API key thực
        const API_KEY = "ba1385e421012d370b288afbab3bc654";
        const city = "Hanoi"; // Đã đổi thành Hà Nội
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=vi`
        );

        const data = response.data;
        setWeather({
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          icon: data.weather[0].main.toLowerCase(),
          lastUpdate: new Date(),
        });
      } catch (error) {
        console.error("Error fetching weather:", error);
        // Fallback data khi API lỗi
        setWeather((prev) => ({
          ...prev,
          temp: "--",
          description: "Không thể tải dữ liệu",
          lastUpdate: new Date(),
        }));
      }
    };

    fetchWeather();
    // Refresh weather data every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Update last sensor update time when message changes
  useEffect(() => {
    if (
      message?.air_temperature ||
      message?.air_humid ||
      message?.soil_moisture
    ) {
      setLastSensorUpdate(new Date());
    }
  }, [message]);

  // Get weather icon based on condition
  const getWeatherIcon = (iconType) => {
    switch (iconType) {
      case "clear":
        return <WiDaySunny className="w-10 h-10 text-yellow-500" />;
      case "rain":
      case "drizzle":
        return <WiRain className="w-10 h-10 text-blue-500" />;
      case "clouds":
        return <WiCloudy className="w-10 h-10 text-gray-500" />;
      case "snow":
        return <WiSnow className="w-10 h-10 text-blue-300" />;
      case "mist":
      case "fog":
      case "haze":
        return <WiFog className="w-10 h-10 text-gray-400" />;
      case "thunderstorm":
        return <WiThunderstorm className="w-10 h-10 text-purple-500" />;
      default:
        return <WiDayCloudy className="w-10 h-10 text-yellow-500" />;
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

  return (
    <div className="p-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Tổng quan</h1>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Temperature Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Nhiệt độ</span>
            <WiThermometer className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {message?.air_temperature ?? "--"}°C
          </div>
          <span className="text-xs text-gray-400">
            Cập nhật lúc: {formatUpdateTime(lastSensorUpdate)}
          </span>
        </div>

        {/* Air Humidity Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">
              Độ ẩm không khí
            </span>
            <WiHumidity className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {message?.air_humid ?? "--"}%
          </div>
          <span className="text-xs text-gray-400">
            Cập nhật lúc: {formatUpdateTime(lastSensorUpdate)}
          </span>
        </div>

        {/* Soil Moisture Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Độ ẩm đất</span>
            <FaSeedling className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {message?.soil_moisture ?? "--"}%
          </div>
          <span className="text-xs text-gray-400">
            Cập nhật lúc: {formatUpdateTime(lastSensorUpdate)}
          </span>
        </div>

        {/* Weather Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">
              Thời tiết hôm nay
            </span>
            {getWeatherIcon(weather.icon)}
          </div>
          <div className="text-4xl font-bold text-gray-800 mb-1">
            {weather.temp}°
            <span className="text-lg font-normal text-gray-500 ml-2 capitalize">
              {weather.description}
            </span>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <WiHumidity className="w-5 h-5" />
              <span>Độ ẩm</span>
              <span className="font-medium ml-1">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <WiStrongWind className="w-5 h-5" />
              <span>Tốc độ gió</span>
              <span className="font-medium ml-1">{weather.windSpeed} km/h</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-3">
            Cập nhật lúc: {formatUpdateTime(weather.lastUpdate)}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <SensorChart gardenId={gardenId} />
      </div>
    </div>
  );
}

export default Dashboard;
