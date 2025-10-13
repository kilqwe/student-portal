// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./login";
import StudentDashboard from "./Components/Student/student";
import TeacherDashboard from "./Components/Teacher/teacher";
import AdminDashboard from "./Components/Admin/admin";
import AuthWrapper from "./AuthWrapper";
import ScrollToTop from "./Components/helpers/ScrollToTop"; 
import "./index.css"; 
import { NotificationProvider } from "./Components/helpers/NotificationContext";

function App() {
  return (
    <NotificationProvider>
    <Router>
      <AuthWrapper>
        <ScrollToTop /> 
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/professor" element={<TeacherDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </AuthWrapper>
    

      {/* --- THIS IS THE TOASTER FOR THE GLASSMORPHISM EFFECT --- */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          // Define the new glassmorphism style
          className: 'bg-black/30 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl text-white',
          
          duration: 4000,

          // Adjust icon themes for the new dark background
          success: {
            iconTheme: {
              primary: '#16a34a', // Green
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc2626', // Red
              secondary: 'white',
            },
          },
        }}
      />
    </Router>
    </NotificationProvider>
  );
}

export default App;