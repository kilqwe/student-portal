// src/components/Toast.jsx

import React from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const ToastContent = ({ message, type = 'success' }) => {
  const isSuccess = type === 'success';

  return (

    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
      className={`
        font-system max-w-md w-full bg-gray-200/50 backdrop-blur-lg shadow-lg 
        rounded-xl pointer-events-auto flex ring-1 ring-black/10 text-gray-800
      `}
    >
      <div className="w-0 flex-1 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 pt-0.5">
            {isSuccess ? (
              <FaCheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <FaTimesCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold">{isSuccess ? 'Success' : 'Error'}</p>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-black/10">
        <button
          onClick={(t) => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};

export const showSuccessToast = (message) => {
  toast.custom(
    (t) => (

      <AnimatePresence>
        {t.visible && <ToastContent t={t} message={message} type="success" />}
      </AnimatePresence>
    ),
    { duration: 4000 }
  );
};

export const showErrorToast = (message) => {
  toast.custom(
    (t) => (

      <AnimatePresence>
        {t.visible && <ToastContent t={t} message={message} type="error" />}
      </AnimatePresence>
    ),
    { duration: 3000 }
  );
};