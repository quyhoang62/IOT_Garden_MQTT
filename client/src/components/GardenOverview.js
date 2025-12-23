import React from "react";
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaSeedling,
  FaStickyNote,
  FaRulerCombined,
  FaImage,
} from "react-icons/fa";

const iconMap = {
  VịTrí: <FaMapMarkerAlt className="text-purple-600 mr-2" />,
  TrạngThái: <FaCheckCircle className="text-purple-600 mr-2" />,
  TênVườn: <FaSeedling className="text-purple-600 mr-2" />,
  MôTả: <FaStickyNote className="text-purple-600 mr-2" />,
  DiệnTích: <FaRulerCombined className="text-purple-600 mr-2" />,
  HìnhẢnh: <FaImage className="text-purple-600 mr-2" />,
};

const labelMap = {
  garden_Location: "VịTrí",
  garden_Status: "TrạngThái",
  garden_Name: "TênVườn",
  garden_Description: "MôTả",
  garden_Area: "DiệnTích",
  garden_Image: "HìnhẢnh",
};

const displayLabel = {
  VịTrí: "Vị trí",
  TrạngThái: "Trạng thái",
  TênVườn: "Tên vườn",
  MôTả: "Mô tả",
  DiệnTích: "Diện tích (m²)",
  HìnhẢnh: "Hình ảnh",
};

const GardenOverview = React.memo(function ({ gardenDetails, garden }) {
  return (
    <div className="min-h-[calc(100vh-120px)] flex justify-center">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800">Thông tin vườn</h2>
          <span className="text-sm text-purple-700 bg-purple-100 px-4 py-1 rounded-full">
            Cập nhật: {new Date().toLocaleDateString()}
          </span>
        </div>

        {garden ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {gardenDetails.map((detail) => {
              const key = labelMap[detail.value];
              return (
                <div
                  key={detail.value}
                  className="flex items-center bg-purple-50 border border-purple-200 rounded-xl p-5 transition hover:shadow-md"
                >
                  {iconMap[key]}
                  <div className="ml-2">
                    <div className="text-sm text-gray-500">{displayLabel[key]}</div>
                    <div className="text-xl font-semibold text-gray-800">
                      {garden[detail.value] ?? "Không có"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-lg">Đang tải dữ liệu vườn...</div>
        )}
      </div>
    </div>
  );
});

export default GardenOverview;
