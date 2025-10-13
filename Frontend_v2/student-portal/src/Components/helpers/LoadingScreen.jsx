import React from "react";
 // ⬅️ place your RVITM logo in src/assets/logo.png

const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      {/* College Logo */}
      <img
        src="/RV_logo.png"
        alt="RVITM Logo"
        className="w-20 h-20 mb-4"
      />

      {/* Portal Title */}
      <h1 className="text-xl font-semibold text-gray-800 mb-6">
        RVITM Student Portal
      </h1>

      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>

      {/* Message */}
      <p className="mt-4 text-gray-600 text-base">
        Loading...
      </p>
    </div>
  );
};

export default LoadingScreen;
