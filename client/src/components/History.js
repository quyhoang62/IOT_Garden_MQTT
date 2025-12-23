import React from "react";
import DataDisplay from "./DataDisplay";

const History = () => {
  const gardenId = localStorage.getItem("gardenId");

  return (
    <div className="min-h-[calc(100vh-120px)] flex justify-center">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Lịch sử cảm biến vườn
          </h1>
          <span className="text-sm text-purple-700 bg-purple-100 px-4 py-1 rounded-full">
            Garden ID: {gardenId ?? "Chưa chọn"}
          </span>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 shadow-sm">
          <DataDisplay gardenId={gardenId} />
        </div>
      </div>
    </div>
  );
};

export default History;
