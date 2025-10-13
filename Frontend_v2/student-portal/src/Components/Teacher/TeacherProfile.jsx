import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { FaUser, FaPhone, FaEnvelope, FaBuilding, FaGraduationCap, FaInfoCircle, FaSave, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

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

const TeacherProfile = () => {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [education, setEducation] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const educationRef = useRef(null);
  const descriptionRef = useRef(null);
  
  const showMessage = (msg, type = "success", duration = 4000) => {
    setMessage(msg);
    setMessageType(type);
    if(duration) {
        setTimeout(() => setMessage(""), duration);
    }
  }

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
    autoResizeTextarea(e.target);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    autoResizeTextarea(e.target);
  };

  const handleSave = async () => {
    if (!teacher) return showMessage("No teacher data loaded to save.", "error");
    try {
      const teacherDocRef = doc(db, "teachers", teacher.id);
      await updateDoc(teacherDocRef, { education, description });
      showMessage("Profile saved successfully!", "success");
    } catch (error) {
      console.error("Error saving profile:", error);
      showMessage("Failed to save profile.", "error");
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
    <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <FaUser /> Edit Your Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Column 1: Read-only Info */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2"><FaUser /> Name</label>
                        <input type="text" value={teacher.name} readOnly className="w-full p-2 border border-gray-200 rounded-md bg-gray-100 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2"><FaEnvelope /> Email</label>
                        <input type="email" value={teacher.email} readOnly className="w-full p-2 border border-gray-200 rounded-md bg-gray-100 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2"><FaPhone /> Phone</label>
                        <input type="text" value={teacher.phone} readOnly className="w-full p-2 border border-gray-200 rounded-md bg-gray-100 cursor-not-allowed" />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2"><FaBuilding /> Department</label>
                        <input type="text" value={teacher.department} readOnly className="w-full p-2 border border-gray-200 rounded-md bg-gray-100 cursor-not-allowed" />
                    </div>
                </div>

                {/* Column 2: Editable Info */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="education" className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><FaGraduationCap/> Education Details</label>
                        <textarea
                            id="education"
                            ref={educationRef}
                            value={education}
                            onChange={handleEducationChange}
                            placeholder="e.g., Ph.D. in Computer Science from XYZ University"
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <FaInfoCircle /> Description / Bio
                        </label>
                        <textarea
                            id="description"
                            ref={descriptionRef}
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Enter details about yourself, your research interests, and links to your portfolio, Google Scholar, etc."
                            rows={6}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t pt-6 text-center">
                <button
                    onClick={handleSave}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-sm flex items-center gap-2 mx-auto"
                >
                    <FaSave /> Save Profile
                </button>
                <StatusMessage message={message} type={messageType} />
            </div>
        </div>
    </div>
  );
};

export default TeacherProfile;