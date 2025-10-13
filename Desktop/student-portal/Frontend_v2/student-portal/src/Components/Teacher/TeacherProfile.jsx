import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

// --- ICON ---
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const TeacherProfile = () => {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [education, setEducation] = useState("");
  const [description, setDescription] = useState("");

  const educationRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    async function fetchTeacherData() {
      setLoading(true);
      try {
        const currentUserUid = auth.currentUser?.uid;
        if (!currentUserUid) {
          console.error("User not logged in");
          setLoading(false);
          return;
        }

        const teachersRef = collection(db, "teachers");
        const q = query(teachersRef, where("uid", "==", currentUserUid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error("No teacher found with this UID");
          setLoading(false);
          return;
        }

        const teacherDoc = querySnapshot.docs[0];
        const teacherData = teacherDoc.data();
        setTeacher({ id: teacherDoc.id, ...teacherData });

        setEducation(teacherData.education ?? "");
        setDescription(teacherData.description ?? "");

        setTimeout(() => {
          autoResizeTextarea(educationRef.current);
          autoResizeTextarea(descriptionRef.current);
        }, 0);
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      }
      setLoading(false);
    }

    fetchTeacherData();
  }, []);

  const autoResizeTextarea = (el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  const handleEducationChange = (e) => {
    setEducation(e.target.value);
    autoResizeTextarea(educationRef.current);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    autoResizeTextarea(descriptionRef.current);
  };

  const handleSave = async () => {
    if (!teacher) return alert("No teacher data loaded");
    try {
      const teacherDocRef = doc(db, "teachers", teacher.id);
      await updateDoc(teacherDocRef, { education, description });
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }
  if (!teacher) return <div className="text-center mt-10">Teacher data not found.</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700 flex items-center justify-center gap-2">
        <UserIcon />
        Teacher Profile
      </h2>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">Name</label>
        <input
          type="text"
          value={teacher.name}
          readOnly
          className="w-full p-2 border border-gray-300 rounded focus:outline-none bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">Phone</label>
        <input
          type="text"
          value={teacher.phone}
          readOnly
          className="w-full p-2 border border-gray-300 rounded focus:outline-none bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">Email</label>
        <input
          type="email"
          value={teacher.email}
          readOnly
          className="w-full p-2 border border-gray-300 rounded focus:outline-none bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">Department</label>
        <input
          type="text"
          value={teacher.department}
          readOnly
          className="w-full p-2 border border-gray-300 rounded focus:outline-none bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">Education Details</label>
        <textarea
          ref={educationRef}
          value={education}
          onChange={handleEducationChange}
          placeholder="Enter your education background..."
          rows={3}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none resize-none overflow-hidden"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 font-medium">
          Description <span className="text-sm text-gray-500">(Links will be clickable)</span>
        </label>
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Enter details about yourself and portfolio ,scholar links,etc"
          rows={4}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none resize-none overflow-hidden"
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default TeacherProfile;