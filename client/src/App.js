import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import axios from "axios";
import AppRoutes from "./AppRoutes";
import { getDeviceIdFromGarden } from "./utils/deviceHelper";

const POLLING_INTERVAL = 5000;

function App() {
  const [message, setMessage] = useState({
    pump: null,
    air_temperature: null,
    air_humid: null,
    soil_moisture: null
  });
  const gardenId = parseInt(localStorage.getItem("gardenId"));

  // Tự động lấy deviceId khi có gardenId
  useEffect(() => {
    if (gardenId) {
      getDeviceIdFromGarden(gardenId).then(deviceId => {
        console.log('Loaded deviceId:', deviceId, 'for gardenId:', gardenId);
      });
    }
  }, [gardenId]);

  useEffect(() => {
    // Initial fetch
    axios.get("/latest-message")
      .then(response => setMessage(response.data.message || {}))
      .catch(console.log);

    // Polling
    const intervalID = setInterval(() => {
      axios.get("/latest-message")
        .then(response => setMessage(response.data.message || {}))
        .catch(console.log);
    }, POLLING_INTERVAL);
    
    return () => clearInterval(intervalID);
  }, []);

  return (
    <Router>
      <AppRoutes
        message={message}
        gardenId={gardenId}
      />
    </Router>
  );
}

export default App;
