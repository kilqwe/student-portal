// src/firebase.js

// Import required Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // Add this import for Firebase Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCP-F9MhDN1FiSbCzgmpgZVzLBiyNS9zmc",
  authDomain: "student-portal-fcf6d.firebaseapp.com",
  projectId: "student-portal-fcf6d",
  storageBucket: "student-portal-fcf6d.firebasestorage.app",
  messagingSenderId: "966046477670",
  appId: "1:966046477670:web:2a1f2057b6eb49934d6ca7",
  measurementId: "G-M21WWEXSZC"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Storage
const storage = getStorage(firebaseApp);

// Initialize Firebase Auth and Firestore
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Export everything needed
export { firebaseApp, auth, db, storage };
