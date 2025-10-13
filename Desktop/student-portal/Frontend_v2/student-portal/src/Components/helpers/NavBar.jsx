import React from "react";
// 1. ADD THIS IMPORT to connect to the context
import { useNotifications } from "./NotificationContext"; 

// 2. REMOVE 'unreadCount' from the props here
export default function NavBar({ role, activeSection, setActiveSection }) {
  
  // 3. GET THE LIVE unreadCount DIRECTLY FROM THE CONTEXT
  const { unreadCount } = useNotifications();
  console.log("Unread count received in NavBar:", unreadCount);
  const navItemsByRole = {
    student: [
      ["CGPA", "cgpa", "FaGraduationCap"],
      ["Calendar", "calendar", "FaCalendarAlt"],
      ["Quick Links", "fees", "FaLink"],
      ["Notifications", "notifications", "FaBell"],
      ["Teachers", "teachers", "FaChalkboardTeacher"],
      ["Attendance", "attendance", "FaClipboardCheck"],
      ["Feedback", "FeedBack", "FaComments"],
      ["Achievements", "StudentAchievements", "FaTrophy"],
      ["Change Password", "changePassword", "FaKey"],
    ],
    teacher: [
      ["Enter Marks", "enterMarks", "FaPen"],
      ["My Subjects", "mySubjects", "FaBook"],
      ["Attendance", "attendance", "FaClipboardList"],
      ["View Notifications", "notifications", "FaBell"],
      ["Send Notification", "sendNotification", "FaPaperPlane"],
      ["My Mentees", "mentees", "FaUsers"],
      ["My Profile", "editProfile", "FaUserEdit"],
      ["Feedback Report", "feedbackReport", "FaChartBar"],
      ["Change Password", "changePassword", "FaKey"],
    ],
    admin: [
      ["Manage Subjects", "manageSubjects", "FaBook"],
      ["View Students", "allStudents", "FaUserGraduate"],
      ["View Teachers", "allTeachers", "FaChalkboardTeacher"],
      ["Send Notifications", "notifications", "FaBell"],
      ["Assign Mentors", "assignMentors", "FaHandshake"],
      ["Feedback", "CreateFeedbackForm", "FaRegCommentDots"],
      ["Calendar", "calendarofEvents", "FaCalendarAlt"],
      ["Update SEE", "updatesee", "FaChartBar"],
      ["Manage Students", "uploadstud", "FaDownload"],
      ["Manage Teachers/Admin", "manageAdmins", "FaUserCog"],
      ["Add Subject", "AddSubject", "FaPlus"],
      ["Change Password", "changePassword", "FaKey"],
    ],
  };

  const iconsMap = {
    FaBook: require("react-icons/fa").FaBook,
    FaBell: require("react-icons/fa").FaBell,
    FaUserGraduate: require("react-icons/fa").FaUserGraduate,
    FaChalkboardTeacher: require("react-icons/fa").FaChalkboardTeacher,
    FaClipboardList: require("react-icons/fa").FaClipboardList,
    FaUsers: require("react-icons/fa").FaUsers,
    FaUserEdit: require("react-icons/fa").FaUserEdit,
    FaChartBar: require("react-icons/fa").FaChartBar,
    FaPaperPlane: require("react-icons/fa").FaPaperPlane,
    FaGraduationCap: require("react-icons/fa").FaGraduationCap,
    FaCalendarAlt: require("react-icons/fa").FaCalendarAlt,
    FaLink: require("react-icons/fa").FaLink,
    FaClipboardCheck: require("react-icons/fa").FaClipboardCheck,
    FaComments: require("react-icons/fa").FaComments,
    FaTrophy: require("react-icons/fa").FaTrophy,
    FaKey: require("react-icons/fa").FaKey,
    FaPen: require("react-icons/fa").FaPen,
    FaDownload: require("react-icons/fa").FaDownload,
    FaPlus: require("react-icons/fa").FaPlus,
    FaUserCog: require("react-icons/fa").FaUserCog,
    FaHandshake: require("react-icons/fa").FaHandshake,
    FaRegCommentDots: require("react-icons/fa").FaRegCommentDots,
  };

  const navItems = navItemsByRole[role] || [];

  return (
    <nav className="flex flex-col mt-3">
      {navItems.map(([label, key, IconName]) => {
        const Icon = iconsMap[IconName];
        const isActive = activeSection === key;
        const isNotificationTab = key === 'notifications';

        return (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center w-full text-left text-sm px-3 py-2 my-1 rounded-md border transition-all duration-200
              ${
                isActive
                  ? "bg-[#dbeafe] text-[#1e3a8a] border-[#1e3a8a] font-semibold shadow-md"
                  : "bg-blue-50 text-[#1e40af] border-[#bfdbfe] hover:bg-white hover:text-[#1e3a8a] hover:border-[#1e40af]"
              }`}
          >
            <Icon
              className={`inline-block mr-3 text-lg ${
                isActive ? "text-[#1e40af]" : "text-[#2563eb]"
              }`}
            />
            <span className="flex-grow">{label}</span>

            {/* This block will now work correctly with the live data */}
            {isNotificationTab && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-semibold ml-auto px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}