import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { FaCalendarAlt, FaLink, FaInfoCircle } from 'react-icons/fa';

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className={`p-3 rounded-md text-white text-center mb-6 text-sm font-semibold ${bgColor}`}>
        {message}
      </div>
    );
};

const CoE = () => {
  const [semester, setSemester] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-clear messages after a few seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const handleSemesterChange = (e) => {
    setSemester(e.target.value);
  };

  const handleLinkChange = (e) => {
    setDriveLink(e.target.value);
  };

  const convertToPreviewLink = (link) => {
    // This regex is more robust and handles different Google Drive URL formats
    const match = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!semester || !driveLink) {
      setErrorMessage("Please select a semester and provide the Google Drive link.");
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const previewLink = convertToPreviewLink(driveLink);
    if (!previewLink) {
      setErrorMessage('Invalid Google Drive link format. Please use a valid share link.');
      setUploading(false);
      return;
    }

    try {
      const docRef = doc(db, 'calendarOfEvents', `semester_${semester}`);
      await setDoc(docRef, {
        semester: Number(semester),
        fileURL: previewLink,
        timestamp: new Date(),
      });

      setSuccessMessage(`Successfully saved CoE link for semester ${semester}`);
      setDriveLink('');
      setSemester('');
    } catch (error) {
      setErrorMessage("Error saving CoE link. Please try again.");
      console.error("Error:", error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-3">
                <FaCalendarAlt /> Upload Calendar of Events (CoE)
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                Upload a Google Drive link for the Calendar of Events for a specific semester.
            </p>

            <StatusMessage message={successMessage} type="success" />
            <StatusMessage message={errorMessage} type="error" />

            {/* Instructions Box */}
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6 rounded-r-lg">
                <div className="flex items-start">
                    <FaInfoCircle className="h-5 w-5 mr-3 mt-1" />
                    <div>
                        <p className="font-bold">Instructions</p>
                        <p className="text-sm">
                            1. Upload your CoE document (PDF, DOCX, etc.) to Google Drive.
                        </p>
                        <p className="text-sm">
                            2. Click "Share" and set permissions to "Anyone with the link".
                        </p>
                        <p className="text-sm">
                            3. Copy the link and paste it into the input field below.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Semester Selection */}
                <div>
                    <label htmlFor="semester" className="block mb-2 font-semibold text-gray-700">
                        Select Semester
                    </label>
                    <select
                        id="semester"
                        value={semester}
                        onChange={handleSemesterChange}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="" disabled>-- Choose a Semester --</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>

                {/* Google Drive Link Input */}
                <div>
                    <label htmlFor="driveLink" className="block mb-2 font-semibold text-gray-700">
                        Google Drive Share Link
                    </label>
                    <div className="relative">
                        <FaLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="url"
                            id="driveLink"
                            placeholder="https://drive.google.com/file/d/..."
                            value={driveLink}
                            onChange={handleLinkChange}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full py-3 rounded-md font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                            uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {uploading ? 'Saving...' : 'Save CoE Link'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default CoE;