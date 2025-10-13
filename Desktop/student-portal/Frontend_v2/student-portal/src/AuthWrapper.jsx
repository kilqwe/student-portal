// src/AuthWrapper.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import LoadingScreen from "./Components/helpers/LoadingScreen";

const AuthWrapper = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email;

        // Check student
        const studentDoc = await getDoc(doc(db, "students", email));
        if (studentDoc.exists()) {
          if (location.pathname === "/login" || location.pathname === "/") {
            navigate("/student");
          }
          return setTimeout(() => setLoading(false), 1200); // ⏳ delay
        }

        // Check teacher
        const teacherDoc = await getDoc(doc(db, "teachers", email));
        if (teacherDoc.exists()) {
          if (location.pathname === "/login" || location.pathname === "/") {
            navigate("/teacher");
          }
          return setTimeout(() => setLoading(false), 1200);
        }

        // Check admin
        const adminDoc = await getDoc(doc(db, "admin", email));
        if (adminDoc.exists()) {
          if (location.pathname === "/login" || location.pathname === "/") {
            navigate("/admin");
          }
          return setTimeout(() => setLoading(false), 1200);
        }

        // No role found
        return setTimeout(() => setLoading(false), 1200);
      } else {
        navigate("/login");
        return setTimeout(() => setLoading(false), 1200);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) return <LoadingScreen />;

  return children;
};

export default AuthWrapper;
