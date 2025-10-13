import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { Eye, EyeOff } from "lucide-react";
import { showSuccessToast, showErrorToast } from "./Components/helpers/Toast";
import { FcGoogle } from "react-icons/fc";
import { motion, AnimatePresence } from "framer-motion";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = userCredential.user.email;
      let userDoc = null;
      let foundRole = null;

      const studentQuery = query(collection(db, "students"), where("email", "==", userEmail));
      const studentSnapshot = await getDocs(studentQuery);
      if (!studentSnapshot.empty) {
        userDoc = studentSnapshot.docs[0];
        foundRole = "student";
      }

      if (!userDoc) {
        const teacherQuery = query(collection(db, "teachers"), where("email", "==", userEmail));
        const teacherSnapshot = await getDocs(teacherQuery);
        if (!teacherSnapshot.empty) {
          userDoc = teacherSnapshot.docs[0];
          foundRole = "professor";
        }
      }

      if (!userDoc) {
        const adminQuery = query(collection(db, "admin"), where("email", "==", userEmail));
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
          userDoc = adminSnapshot.docs[0];
          foundRole = "admin";
        }
      }

      if (userDoc && foundRole) {
        showSuccessToast("Login successful!");
        navigate(`/${foundRole}`);
      } else {
        const msg = "No matching data found for this email.";
        showErrorToast(msg);
        setError(msg);
      }
    } catch (err) {
      showErrorToast(err.message);
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    const enteredEmail = prompt("Enter your registered email:");
    if (!enteredEmail) {
      alert("Email is required.");
      return;
    }
    try {
      const response = await fetch("https://student-email-backend.onrender.com/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: enteredEmail }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("✅ Password reset link sent to your email.");
      } else {
        alert("❌ " + data.error);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      alert("❌ Something went wrong. Try again.");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side image */}
      <div className="hidden lg:flex w-1/2 relative">
        <img
          src="/clg3.jpeg"
          alt="RV Institute"
          className="object-fill w-full h-full brightness-95 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-white/30" />
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="w-full max-w-md rounded-xl hover:shadow-lg bg-white border border-collapse">
          <div className="p-6 text-gray-900">
            {/* Header */}
            <div className="text-center mb-4">
              <img src="/RV_logo.jpg" alt="RV Logo" className="mx-auto w-16 h-16 mb-2" />
              <h1 className="text-lg font-bold">
                R.V. Institute of Technology and Management
              </h1> 
              <p className="text-xs text-gray-600">
                Affiliated to Visvesvaraya Technological University
              </p>
              <div className="border-b border-gray-200 mt-3" />
            </div>

            {/* Welcome */}
            <h2 className="text-base font-semibold mb-1 text-center">Welcome back</h2>
            <p className="text-xs text-gray-600 mb-4 text-center">
              Please sign in with your institutional credentials
            </p>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Floating label Email */}
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-md 
                             focus:ring-2 focus:ring-blue-500 text-sm text-black"
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-3 top-2 text-gray-500 text-xs 
                             peer-placeholder-shown:top-3 peer-placeholder-shown:text-gray-400 
                             peer-placeholder-shown:text-sm transition-all"
                >
                  Email
                </label>
              </div>

              {/* Floating label Password */}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-md 
                             focus:ring-2 focus:ring-blue-500 text-sm text-black pr-8"
                  required
                />
                <label
                  htmlFor="password"
                  className="absolute left-3 top-2 text-gray-500 text-xs 
                             peer-placeholder-shown:top-3 peer-placeholder-shown:text-gray-400 
                             peer-placeholder-shown:text-sm transition-all"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-3 text-gray-500 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              {/* Buttons side by side with less gap */}
             <div className="flex justify-between items-center gap-4 pt-2">
  {/* Secondary Button: Clean, subtle, and consistent */}
  <button
    type="button"
    onClick={handleForgotPassword}
    className="
      flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-800
      bg-white rounded-full border border-gray-300 shadow-sm
      hover:bg-gray-50 hover:border-gray-400
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      transition-all duration-200
    "
  >
    <FcGoogle className="w-4 h-4" />
    Recover Password
  </button>

  {/* Primary Button: Dynamic, interactive, and prominent */}
  <button
    type="submit"
    className="
     flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white
      text-blue-600 rounded-full border border-gray-300 shadow-sm
      hover:bg-blue-300 hover:border-gray-400 hover:text-black
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      transition-all duration-200
    "
  >
    Sign In
  </button>
</div>
            </form>

           {/* Footer Links */}
<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-8 text-xs">
  <button onClick={() => window.open("https://www.rvitm.edu.in/admission/", "_blank")} className="text-gray-500 hover:text-indigo-600 transition-colors">Admissions</button>
  <button onClick={() => window.open("https://www.rvitm.edu.in/placements/", "_blank")} className="text-gray-500 hover:text-indigo-600 transition-colors">Placement</button>
  <button onClick={() => window.open("https://www.rvitm.edu.in/about/", "_blank")} className="text-gray-500 hover:text-indigo-600 transition-colors">About Us</button>
  <button onClick={() => window.open("https://www.rvitm.edu.in/contact/", "_blank")} className="text-gray-500 hover:text-indigo-600 transition-colors">Contact Us</button>

  {/* Relative container for the button and tooltip */}
  <div className="relative">
    <button
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className="text-gray-500 hover:text-indigo-600 transition-colors"
    >
      Privacy
    </button>
    
    <AnimatePresence>
  {showTooltip && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -6 }}
      transition={{ duration: 0.2 }}
      /* THE FIX: Changed from center-aligned to right-aligned */
      className="absolute top-full right-0 mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 text-center shadow-lg z-10"
    >
      This institutional portal ensures role-based access for students,
      teachers, and admins. All user data is handled securely and used
      only for academic and administrative purposes.
    </motion.div>
  )}
</AnimatePresence>
  </div>
</div>

{/* Copyright (This part remains untouched) */}
<div className="border-t border-gray-200 mt-6 mb-2" />
<p className="text-center text-[10px] text-gray-400">
  © 2025 Pravardhan Prasad | Neha Dinesh Rangdal<br />
  R.V. Institute of Technology and Management
</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
