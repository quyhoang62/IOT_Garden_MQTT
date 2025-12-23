import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from './Button'

function InfomationTree({ message }) {
  const location = useLocation().state
  const navigate = useNavigate();

  const handlePump = () => {
    navigate('/pumpWater', { state: { location } })
  }

  const handleSetting = () => {
    navigate('/pumpSetting', { state: { location } })
  }

  return (
    <div className="flex justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-5xl bg-white border border-purple-300 p-10 mt-16 rounded-2xl shadow-xl space-y-8 transition-all hover:shadow-2xl">
        <h1 className="text-4xl font-bold text-purple-700 text-center">{location.title}</h1>

        <div className="grid grid-cols-2 gap-12 text-lg text-gray-800">
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span>Nhiệt độ:</span>
              <span className="font-semibold text-purple-700">{message.air_temperature ?? '--'} °C</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Độ ẩm đất:</span>
              <span className="font-semibold text-purple-700">{message.soil_moisture ?? '--'} %</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Độ ẩm không khí:</span>
              <span className="font-semibold text-purple-700">{message.air_humid ?? '--'} %</span>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <Button onClick={handleSetting} text="Cài đặt ngưỡng" color="purple" />
            <Button onClick={handlePump} text="Tưới nước" color="purple" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfomationTree
