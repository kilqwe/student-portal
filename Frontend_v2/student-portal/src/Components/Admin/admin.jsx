import React, { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import Navbar from "../helpers/NavBar";
import {
  FaSearch, FaArrowCircleLeft, FaArrowCircleRight, FaEnvelope, FaPhone, FaIdBadge, FaDownload, FaUsers, // ✅ Icon Imported
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Mentor from "./mentor";
import ManageSubjects from "./ManageSubjects";
import Updatesee from "./updatesee";
import CoE from "./coe";
import CreateFeedbackForm from "./CreateFeedbackForm";
import ChangePasswordForm from "../helpers/ChangePasswordForm";
import UploadStudents from "./UploadStudents";
import AddSubject from "./AddSubject";
import ManageAdmins from "./ManageAdmins";
import NotificationFromAdmin from "./NotificationFromAdmin";
import ProfileCard from "../helpers/ProfileCard";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../../index.css";

export default function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [activeSection, setActiveSection] = useState("manageSubjects");

  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [departmentPages, setDepartmentPages] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const studentsPerPage = 10;
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  // Scroll to top when section OR teacher filters change
  useEffect(() => {
    if (mainContentRef.current) mainContentRef.current.scrollTo(0, 0);
  }, [activeSection, teacherSearchQuery, selectedDepartment]);

  // Reset student page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [studentSearchQuery, selectedSemester, selectedSection]);

  // Reset teacher department pages when filters change
  useEffect(() => {
    setDepartmentPages({});
  }, [teacherSearchQuery, selectedDepartment]);


  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      setLoadingAdmin(true);
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated.");
        setLoadingAdmin(false);
        return;
      }
      try {
        const q = query(collection(db, "admin"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const adminDoc = querySnapshot.docs[0];
          setAdminData({ id: adminDoc.id, ...adminDoc.data() });
        } else {
          setError("No admin data found for this email.");
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("Something went wrong while fetching admin data.");
      } finally {
        setLoadingAdmin(false);
      }
    };
    fetchAdminData();
  }, []);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const querySnapshot = await getDocs(collection(db, "students"));
        const studentList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to fetch students");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "teachers"));
        const teacherList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTeachers(teacherList);
      } catch (err) {
        console.error("Error fetching teachers:", err);
        setError("Failed to fetch teachers");
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = studentSearchQuery
      ? student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.phone?.toString().toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.parentNo?.toString().toLowerCase().includes(studentSearchQuery.toLowerCase())
      : true;

    const matchesSemester =
      selectedSemester === "All" || student.semester === Number(selectedSemester);

    const matchesSection =
      selectedSection === "All" || student.section === selectedSection;
      
    return matchesSearch && matchesSemester && matchesSection;
  });

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + studentsPerPage);

  const downloadAllStudentsAsPDF = () => {
    const doc = new jsPDF();
    doc.text("All Students", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Name", "USN", "Email", "Phone", "Parent Email", "Parent No", "Semester", "Section"]],
      body: filteredStudents.map((s) => [
        s.name,
        s.id,
        s.email,
        s.phone,
        s.parentEmail || "",
        s.parentNo || "",
        s.semester,
        s.section,
      ]),
    });
    doc.save("students.pdf");
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (loadingAdmin || loadingStudents || loadingTeachers) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error)
    return <h2 style={{ textAlign: "center", marginTop: "4rem" }}>{error}</h2>;

  const adminNameForAvatar = adminData?.name
    ? adminData.name.trim().replace(/^(Dr|Mrs|Mr|Ms)\.?\s*/i, "")
    : "";

  return (
    <div className="h-screen overflow-hidden font-sans bg-gray-100 text-sm flex flex-col">
      {/* Header */}
      <header className="dashboard-header flex justify-between items-center px-6 py-3 bg-white shadow-md fixed top-0 left-0 w-full z-40">
        <div className="flex items-center">
          {/* ✅ IMPROVED ANIMATED HAMBURGER ICON */}
<button
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
  className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-4"
  title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
  aria-expanded={isSidebarOpen}
  aria-controls="sidebar-navigation"
>
  <div className="w-6 h-6 relative">
    <span
      className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'rotate-45 top-1/2 -translate-y-1/2' : 'top-1'
      }`}
    ></span>
    <span
      className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 ${
        isSidebarOpen ? 'opacity-0' : ''
      }`}
    ></span>
    <span
      className={`absolute block h-0.5 w-full bg-gray-700 rounded-full transition-all duration-300 ease-in-out ${
        isSidebarOpen ? '-rotate-45 top-1/2 -translate-y-1/2' : 'bottom-1'
      }`}
    ></span>
  </div>
</button>

          <img src="/RV_logo.jpg" alt="Logo" className="w-10 h-10 mr-3 object-contain" />
          <div>
            <span className="block font-semibold leading-tight">
              RV Institute of Technology and Management
            </span>
            <p className="text-sm">Department of CSE</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-base font-bold transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:scale-105"
        >
          Logout
        </button>
      </header>

      {/* Layout */}
      <div className="flex pt-[72px]">
        {/* Sidebar */}
        <aside
          id="sidebar-navigation"
          className={`fixed top-[72px] left-0 h-[calc(100vh-72px)] bg-blue-50 border-r border-blue-200 overflow-y-auto scrollbar-none flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "w-64 p-5" : "w-0 p-0 overflow-hidden"
          }`}
        >
          {isSidebarOpen && adminData && (
            <>
              <ProfileCard
                photo={ adminData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminNameForAvatar)}&background=D1E3FF&color=022C54&size=128&bold=true` }
                name={adminData.name}
                email={adminData.email}
                role="Admin"
                attributes={{ employeeId: adminData.employeeId || adminData.id, phone: adminData.phone }}
              />
              <hr className="my-3" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <Navbar
                  role="admin"
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                />
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main
          ref={mainContentRef}
          className={`flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-72px)] bg-gray-50 transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {activeSection === "manageSubjects" && <ManageSubjects />}
          {activeSection === "uploadstud" && <UploadStudents />}
          {activeSection === "AddSubject" && <AddSubject />}
          {activeSection === "assignMentors" && <Mentor />}
          {activeSection === "CreateFeedbackForm" && <CreateFeedbackForm />}
          {activeSection === "calendarofEvents" && <CoE />}
          {activeSection === "updatesee" && <Updatesee />}
          {activeSection === "manageAdmins" && <ManageAdmins />}
          {activeSection === "notifications" && <NotificationFromAdmin />}
          
          {activeSection === "changePassword" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Change Password</h2>
              <ChangePasswordForm />
            </section>
          )}

          {/* --- All Students Section --- */}
          {activeSection === "allStudents" && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              {/* ✅ HEADING UPDATED WITH ICON */}
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center">
                <FaUsers />
                All Students
              </h2>
              
              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-4">
                  <select
                    id="semesterFilter"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full md:w-auto p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ( <option key={sem} value={sem}>Semester {sem}</option> ))}
                  </select>

                  <select
                    id="sectionFilter"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full md:w-auto p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Sections</option>
                    {["A", "B", "C"].map((section) => ( <option key={section} value={section}>Section {section}</option> ))}
                  </select>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-white uppercase bg-blue-600">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">USN</th>
                            <th scope="col" className="px-6 py-3">Email & Phone</th>
                            <th scope="col" className="px-6 py-3">Parent Details</th>
                            <th scope="col" className="px-6 py-3">Sem & Sec</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentStudents.map((student) => (
                            <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{student.name}</td>
                                <td className="px-6 py-4">{student.id}</td>
                                <td className="px-6 py-4">
                                  <div>{student.email}</div>
                                  <div className="text-gray-500">{student.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>{student.parentEmail || "N/A"}</div>
                                  <div className="text-gray-500">{student.parentNo || "N/A"}</div>
                                </td>
                                <td className="px-6 py-4">{student.semester} {student.section}</td>
                            </tr>
                        ))}
                        {currentStudents.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-10 text-gray-500">No students found.</td>
                          </tr>
                        )}
                    </tbody>
                </table>
              </div>

              {/* Pagination and Download */}
              <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                <button
                  onClick={downloadAllStudentsAsPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition duration-300 shadow-sm"
                >
                  <FaDownload />
                  Download PDF
                </button>
                <div className="flex gap-2 items-center mt-4 md:mt-0">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-4 py-2 font-semibold">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>              
            </div>
          )}

          {/* --- All Teachers Section --- */}
          {activeSection === "allTeachers" && (
            <section className="space-y-8">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center justify-center">All Teachers</h2>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="relative flex-grow">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                          type="text"
                          placeholder="Search by name, email, phone, or department"
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
                  <select
                      id="departmentFilter"
                      value={selectedDepartment || "All"}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                      <option value="All">All Departments</option>
                      {Array.from(new Set(teachers.map((t) => t.department || "Unknown")))
                        .sort()
                        .map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                  </select>
                </div>
              </div>

              {Object.entries(
                teachers
                  .filter((teacher) => {
                    const query = teacherSearchQuery.toLowerCase();
                    const matchesSearch =
                      (teacher.name || "").toLowerCase().includes(query) ||
                      (teacher.email || "").toLowerCase().includes(query) ||
                      String(teacher.phone || "").toLowerCase().includes(query) ||
                      (teacher.department || "").toLowerCase().includes(query);

                    const matchesDepartment =
                      selectedDepartment === "All" ||
                      (teacher.department || "Unknown") === selectedDepartment;
                    return matchesSearch && matchesDepartment;
                  })
                  .reduce((acc, teacher) => {
                    const dept = teacher.department || "Unknown";
                    if (!acc[dept]) acc[dept] = [];
                    acc[dept].push(teacher);
                    return acc;
                  }, {})
              ).map(([department, deptTeachers]) => {
                const teachersPerPage = 3;
                const currentPage = departmentPages[department] || 0;
                const totalPages = Math.ceil(deptTeachers.length / teachersPerPage);
                const startIndex = currentPage * teachersPerPage;
                const paginatedTeachers = deptTeachers.slice(
                  startIndex,
                  startIndex + teachersPerPage
                );

                const handleNext = () => setDepartmentPages((prev) => ({ ...prev, [department]: Math.min(currentPage + 1, totalPages - 1) }));
                const handlePrev = () => setDepartmentPages((prev) => ({ ...prev, [department]: Math.max(currentPage - 1, 0) }));

                return (
                  <div key={department} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-700 flex-grow text-center">{department} Department</h3>
                      {deptTeachers.length > teachersPerPage && (
                        <div className="flex items-center gap-3">
                          <button onClick={handlePrev} disabled={currentPage === 0} className="disabled:opacity-40 disabled:cursor-not-allowed">
                            <FaArrowCircleLeft size={24} className="text-gray-500 hover:text-blue-600 transition" />
                          </button>
                          <button onClick={handleNext} disabled={currentPage >= totalPages - 1} className="disabled:opacity-40 disabled:cursor-not-allowed">
                            <FaArrowCircleRight size={24} className="text-gray-500 hover:text-blue-600 transition" />
                          </button>
                        </div>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      >
                        {paginatedTeachers.map((teacher) => (
                          <div key={teacher.id} className="bg-blue-50 rounded-lg shadow p-5 border border-gray-200 flex flex-col gap-3 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105">
                            <div>
                              <h4 className="text-lg font-bold text-gray-800">{teacher.name}</h4>
                              <p className="text-sm text-gray-500">{teacher.department || "Unknown"}</p>
                            </div>
                            <div className="space-y-2 text-sm text-gray-700">
                              <div className="flex items-center gap-3"><FaEnvelope className="text-gray-400" /><span>{teacher.email}</span></div>
                              <div className="flex items-center gap-3"><FaPhone className="text-gray-400" /><span>{teacher.phone}</span></div>
                            </div>
                            <div className="mt-auto pt-2">
                              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                                <FaIdBadge /><span>ID: {teacher.id}</span>
                              </div>
                            </div>
                          </div>  
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}