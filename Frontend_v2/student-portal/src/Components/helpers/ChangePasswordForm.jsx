import React, { useState } from "react";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "../../firebase";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FaKey, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const Icon = isSuccess ? FaCheckCircle : FaExclamationTriangle;
    const colorClasses = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
    return (
      <div className={`p-3 rounded-md mt-6 flex items-center gap-3 text-sm font-semibold ${colorClasses}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};


function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // 'success' or 'error'

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
    const user = auth.currentUser;

    if (!user) {
        setMessage("User not found. Please log in again.");
        setMessageType("error");
        return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setMessage("Password changed successfully.");
      setMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error(error);
      setMessage("Failed to change password. Please check your current password and try again.");
      setMessageType("error");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center">
                <FaKey /> Change Password
            </h2>

            <form onSubmit={handleChangePassword}>
                {/* Current Password Field */}
                <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-700">Current Password</label>
                    <div className="relative">
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                            aria-label="Toggle current password visibility"
                        >
                            {showCurrentPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>
                </div>

                {/* New Password Field */}
                <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-700">New Password</label>
                    <div className="relative">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                            aria-label="Toggle new password visibility"
                        >
                            {showNewPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-sm">
                    Update Password
                </button>

                <StatusMessage message={message} type={messageType} />
            </form>
        </div>
    </div>
  );
}

export default ChangePasswordForm;