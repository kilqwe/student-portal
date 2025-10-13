// src/Components/Student/StudentDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, or } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import CgpaSection from "./sgpacgpa";
import FeedbackFormSubmit from "./FeedbackFormSubmit";
import AttendanceSection from "./AttendanceSection";
import ChangePasswordForm from "../helpers/ChangePasswordForm";
import TeacherDetailsShow from "./teacherdetailshow";
import ViewStudentNotifications from "./ViewStudentNotifications";
import QuickLinks from "./QuickLinks";
import StudentAchievements from "./Achievements";
import ProfileCard from "../helpers/ProfileCard";
import Navbar from "../helpers/NavBar";
import { FaCalendarAlt } from "react-icons/fa";

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState(null);
  const [activeSection, setActiveSection] = useState("notifications");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mentorName, setMentorName] = useState(null);
  const [coeFileUrl, setCoeFileUrl] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for sidebar
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [activeSection]);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }
      try {
        const studentQuery = query(
          collection(db, "students"),
          where("email", "==", user.email)
        );
        const studentSnapshot = await getDocs(studentQuery);
        if (studentSnapshot.empty) {
          setError("No student data found for this email.");
          setLoading(false);
          return;
        }

        const studentDoc = studentSnapshot.docs[0];
        const studentInfo = { id: studentDoc.id, ...studentDoc.data() };
        setStudentData(studentInfo);

        const mentorSnapshot = await getDocs(collection(db, "mentorships"));
        let mentor = null;
        mentorSnapshot.forEach((doc) => {
          const data = doc.data();
          if (Array.isArray(data.students)) {
            data.students.forEach((s) => {
              if (s.email?.toLowerCase() === user.email.toLowerCase()) {
                mentor = data.teacherName;
              }
            });
          }
        });
        setMentorName(mentor || null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Something went wrong while fetching student or mentor data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!studentData) return;

    const fetchNotifications = async () => {
      try {
        const notifQuery = query(
          collection(db, "notifications"),
          or(
            where("recipients", "array-contains", studentData.email),
            where("semester", "==", studentData.semester),
            where("section", "==", studentData.section)
          )
        );
        const notifSnap = await getDocs(notifQuery);
        const notifData = notifSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        notifData.sort(
          (a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)
        );
        setNotifications(notifData);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, [studentData]);

  useEffect(() => {
    const newUnreadCount = notifications.length - readNotifIds.size;
    setUnreadCount(newUnreadCount);
  }, [notifications, readNotifIds]);

  useEffect(() => {
    const fetchCoE = async () => {
      if (studentData?.semester) {
        try {
          const q = query(
            collection(db, "calendarOfEvents"),
            where("semester", "==", studentData.semester)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const fileUrl = querySnapshot.docs[0].data().fileURL;
            setCoeFileUrl(fileUrl);
          }
        } catch (err) {
          console.error("Error fetching CoE:", err);
        }
      }
    };
    fetchCoE();
  }, [studentData]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (loading)
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  if (error)
    return (
      <h2 className="text-center mt-16 text-lg text-red-500">{error}</h2>
    );

  return (
    <div className="h-screen overflow-hidden font-sans bg-gray-50 text-sm">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="flex items-center">
            {/* --- HAMBURGER BUTTON --- */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-200/50 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-4"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
          >
            <div className="w-6 h-6 relative">
              <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${ isSidebarOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-1' }`} ></span>
              <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 ${ isSidebarOpen ? 'opacity-0' : '' }`} ></span>
              <span className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${ isSidebarOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'bottom-1' }`} ></span>
            </div>
          </button>
          <img
            src="/RV_logo.jpg"
            alt="Logo"
            className="w-10 h-10 mr-4 rounded-full object-cover"
          />
          <div>
            <span className="block font-semibold leading-tight">
              RV Institute of Technology and Management
            </span>
            <p className="text-sm">Department of CSE</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-base font-bold transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
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
          {isSidebarOpen && studentData && (
            <>
              <ProfileCard
                role="Student"
                name={studentData.name}
                email={studentData.email}
                photo={studentData.photoURL}
                attributes={{
                  usn: studentData.usn,
                  semester: studentData.semester,
                  section: studentData.section,
                  phone: studentData.phone,
                  mentor: mentorName,
                }}
              />
              <hr className="my-3 border-gray-200" />

              <Navbar
                role="student"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                unreadCount={unreadCount}
              />
            </>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main
          ref={mainContentRef}
          className={`flex-1 p-6 overflow-y-auto h-[calc(100vh-72px)] text-gray-800 transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {activeSection === "cgpa" && <CgpaSection studentId={studentData.id} />}
          
          {activeSection === "calendar" && coeFileUrl && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 justify-center">
                <FaCalendarAlt />
                Calendar of Events
              </h2>
              <div className="overflow-x-auto">
                <div className="transform scale-[0.85] origin-top w-[118%] h-[800px]">
                  <iframe
                    src={coeFileUrl}
                    title="Calendar of Events"
                    className="w-full h-full rounded-md border border-gray-200"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "fees" && <QuickLinks />}

          {activeSection === "notifications" && (
            <ViewStudentNotifications
              notifications={notifications}
              readNotifIds={readNotifIds}
              setReadNotifIds={setReadNotifIds}
            />
          )}

          {activeSection === "teachers" && <TeacherDetailsShow />}

          {activeSection === "attendance" && studentData && (
            <AttendanceSection
              studentId={studentData.id}
              semester={studentData.semester}
            />
          )}

          {activeSection === "changePassword" && <ChangePasswordForm />}

          {activeSection === "StudentAchievements" && <StudentAchievements />}

          {activeSection === "FeedBack" && (
            <FeedbackFormSubmit student={studentData} />
          )}
        </main>
      </div>
    </div>
  );
}