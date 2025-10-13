import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import AssignedSubjects from "./AssignedSubjects";
import EnterMarks from "./EnterMarks";
import EnterAttendance from "./EnterAttendance";
import TeacherProfile from "./TeacherProfile";
import ChangePasswordForm from "../helpers/ChangePasswordForm";
import FeedbackReport from "./FeedbackReport";
import SendNotificationToStudents from "./SendNotificationToStudents";
import ViewAdminNotifications from "./ViewAdminNotifications";
import MenteesSection from "./MenteesSection";
import ProfileCard from "../helpers/ProfileCard"; 
import Navbar from "../helpers/NavBar";

// ✅ NEW: More robust function to get initials
const getInitials = (name) => {
    if (!name) return "";
    // Removes prefixes like Dr., Mr., Mrs., Ms.
    const cleanedName = name.trim().replace(/^(Dr|Mrs|Mr|Ms)\.?\s*/i, "");
    const nameParts = cleanedName.split(/\s+/);
    // If it's a single word, take the first two letters
    if (nameParts.length === 1) {
        return nameParts[0].substring(0, 2).toUpperCase();
    }
    // Otherwise, take the first letter of the first and last parts
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return `${firstInitial}${lastInitial}`.toUpperCase();
};


export default function TeacherDashboard() {
  const [teacherData, setTeacherData] = useState(null);
  const [activeSection, setActiveSection] = useState("enterMarks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setSubjects] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  // Scroll to top on tab change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [activeSection]);

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "teachers"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const teacherDoc = querySnapshot.docs[0];
          const teacher = { id: teacherDoc.id, ...teacherDoc.data() };
          setTeacherData(teacher);
        } else {
          setError("No teacher data found for this email.");
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
        setError("Something went wrong while fetching teacher data.");
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, []);

  // Fetch mentees
  useEffect(() => {
    const fetchMentees = async () => {
      if (!teacherData?.id) return;
      try {
        const mentorshipRef = doc(db, "mentorships", teacherData.id);
        const mentorshipSnap = await getDoc(mentorshipRef);

        if (mentorshipSnap.exists()) {
          const menteeList = mentorshipSnap.data().students || [];
          const enrichedMentees = await Promise.all(menteeList.map(async (mentee) => {
            const email = mentee.email || mentee.studentEmail;
            if (!email) return null;
            try {
              const studentQuery = query(collection(db, "students"), where("email", "==", email));
              const studentSnap = await getDocs(studentQuery);
              if (!studentSnap.empty) {
                const studentDoc = studentSnap.docs[0];
                return { ...studentDoc.data(), id: studentDoc.id };
              }
            } catch (err) {
              console.error("Error fetching student for mentee:", err);
            }
            return null;
          }));
          setMentees(enrichedMentees.filter(Boolean));
        }
      } catch (err) {
        console.error("Error fetching mentees:", err);
      }
    };
    fetchMentees();
  }, [teacherData]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjectNames = async () => {
      if (!teacherData?.subjects?.length) return;
      const subjectMap = {};
      for (const subjId of teacherData.subjects) {
        try {
          const subjDoc = await getDoc(doc(db, "subjects", subjId));
          subjectMap[subjId] = subjDoc.exists() ? subjDoc.data().name : "Unknown Subject";
        } catch (err) {
          console.error("Failed to fetch subject:", err);
        }
      }
      setSubjects(subjectMap);
    };
    fetchSubjectNames();
  }, [teacherData]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };
  
  // ✅ USE THE NEW FUNCTION to generate correct initials
  const teacherInitials = getInitials(teacherData?.name);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }
  if (error) return <h2 className="text-center mt-16">{error}</h2>;

  return (
    <div className="h-screen overflow-hidden font-sans bg-gray-100 text-sm flex flex-col">
      {/* HEADER */}
      <header className="dashboard-header flex justify-between items-center px-6 py-3 bg-white shadow-md fixed top-0 left-0 w-full z-40">
        <div className="flex items-center">
            {/* Animated Hamburger Icon */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-4"
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                <div className="w-6 h-6 relative">
                    <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${ isSidebarOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-1' }`}></span>
                    <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 ${ isSidebarOpen ? 'opacity-0' : '' }`}></span>
                    <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${ isSidebarOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'bottom-1' }`}></span>
                </div>
            </button>
            <img src="/RV_logo.png" alt="Logo" className="w-10 h-10 mr-3 object-contain" />
            <div>
                <span className="block font-semibold leading-tight">RV Institute of Technology and Management</span>
                <p className="text-sm">Department of {teacherData?.department || '...'}</p>
            </div>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-base font-bold transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:scale-105">
            Logout
        </button>
      </header>

      <div className="flex pt-[72px]">
        {/* SIDEBAR */}
        <aside
          id="sidebar-navigation"
          className={`fixed top-[72px] left-0 h-[calc(100vh-72px)] bg-blue-50 border-r border-blue-200 overflow-y-auto scrollbar-none flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "w-64 p-5" : "w-0 p-0 overflow-hidden"
          }`}
        >
          {isSidebarOpen && teacherData && (
            <>
              <ProfileCard
                // ✅ FIXED: Pass the generated initials to the avatar service
                photo={teacherData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherInitials)}&background=D1E3FF&color=022C54&size=128&bold=true`}
                name={teacherData.name}
                email={teacherData.email}
                role="Professor"
                attributes={{
                  employeeId: teacherData.id,
                  department: teacherData.department,
                  phone: teacherData.phone,
                }}
              />
              <hr className="my-3 border-gray-200" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <Navbar
                    role="teacher"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                />
              </div>
            </>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main
          ref={mainContentRef}
          className={`flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-72px)] bg-gray-50 transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {activeSection === "enterMarks" && <EnterMarks teacherId={teacherData.id} />}
          {activeSection === "attendance" && <EnterAttendance teacherId={teacherData.id} />}
          {activeSection === "feedbackReport" && <FeedbackReport />}
          {activeSection === "changePassword" && <ChangePasswordForm />}
          {activeSection === "editProfile" && <TeacherProfile teacherId={teacherData.id} />}
          {activeSection === "mentees" && <MenteesSection mentees={mentees} />}
          {activeSection === "mySubjects" && <AssignedSubjects employeeId={teacherData.id} />}
          {activeSection === "notifications" && <ViewAdminNotifications />}
          {activeSection === "sendNotification" && <SendNotificationToStudents />}
        </main>
      </div>
    </div>
  );
}