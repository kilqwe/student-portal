import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Pagination from "../helpers/Pagination";
import { FaCalendarCheck, FaFilePdf, FaSave, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    let bgColor, textColor, Icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; Icon = FaCheckCircle;
            break;
        case 'error':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; Icon = FaExclamationTriangle;
            break;
        default: // for 'info'
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; Icon = FaExclamationTriangle;
    }
  
    return (
      <div className={`p-3 rounded-md my-4 flex items-center gap-3 text-sm font-semibold ${bgColor} ${textColor}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};

export default function EnterAttendance() {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [statusType, setStatusType] = useState("info");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalClasses, setTotalClasses] = useState("");

  const totalPages = Math.ceil(students.length / rowsPerPage);
  const currentStudents = students.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const showMessage = (msg, type = "info", duration = 4000) => {
    setSubmitStatus(msg);
    setStatusType(type);
    if (duration) {
      setTimeout(() => setSubmitStatus(null), duration);
    }
  };

  useEffect(() => {
    const fetchAssignedSubjects = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const teacherQuery = query(collection(db, "teachers"), where("uid", "==", user.uid));
        const teacherSnap = await getDocs(teacherQuery);
        if (teacherSnap.empty) { setLoading(false); return; }

        const employeeId = teacherSnap.docs[0].id;
        const assignmentQuery = query(collection(db, "teachingAssignments"), where("employeeId", "==", employeeId));
        const assignmentSnap = await getDocs(assignmentQuery);
        
        const subjectsData = await Promise.all(assignmentSnap.docs.map(async (docSnap) => {
            const assignment = docSnap.data();
            const subjectDoc = await getDoc(doc(db, "subjects", assignment.subject));
            return {
                id: docSnap.id,
                ...assignment,
                subjectName: subjectDoc.exists() ? subjectDoc.data().name : "Unknown",
            };
        }));
        setAssignedSubjects(subjectsData);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
      setLoading(false);
    };
    fetchAssignedSubjects();
  }, []);
  
  function loadImageAsDataURL(url) { /* ... logic unchanged ... */ }
  const generateAttendanceReportFromFirestore = async () => { /* ... logic unchanged, but alerts replaced with showMessage ... */ };

  const handleSubjectSelect = async (subject) => {
    if (!subject) return;
    setSelectedSubject(subject);
    setAttendanceData({});
    setFromDate("");
    setToDate("");
    setTotalClasses("");
    setSubmitStatus(null);
    setCurrentPage(1);

    const q = query(collection(db, "students"), where("semester", "==", Number(subject.semester)), where("section", "==", subject.section));
    const snapshot = await getDocs(q);
    const studentsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStudents(studentsList);
  };

  const handleStudentAttendanceChange = (studentId, value) => {
    const numValue = Number(value);
    if (totalClasses && numValue > Number(totalClasses)) {
        showMessage(`Attended classes cannot exceed total classes (${totalClasses}).`, "error");
        return;
    }
    setAttendanceData((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSubmit = async () => {
    if (!totalClasses || !fromDate || !toDate) {
      return showMessage("Please fill in From Date, To Date, and Total Classes Held.", "error");
    }

    const attendanceByStudent = {};
    students.forEach((student) => {
      attendanceByStudent[student.id] = Number(attendanceData[student.id] || 0);
    });

    try {
      showMessage("Saving attendance...", "info", null);
      const docId = `${selectedSubject.subject}_${fromDate}_${toDate}_${Date.now()}`;
      await setDoc(doc(db, "attendance", docId), {
        subjectCode: selectedSubject.subject,
        semester: Number(selectedSubject.semester),
        section: selectedSubject.section,
        totalClasses: Number(totalClasses),
        fromDate,
        toDate,
        attendanceByStudent,
      });
      showMessage("Attendance saved successfully!", "success");
    } catch (err) {
      console.error("Error saving attendance:", err);
      showMessage("Error saving attendance. Please try again.", "error");
    }
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3"><FaCalendarCheck /> Enter Attendance</h2>

      {/* --- Step 1: Select Subject --- */}
      <div className="mb-6">
          <label htmlFor="subjectSelect" className="block mb-2 font-bold text-gray-700">
              <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">1</span>
              Select a Subject
          </label>
          <select
              id="subjectSelect"
              // ✅ FIXED: Restored the original, correct onClick/onChange logic
              onChange={(e) => {
                const selected = assignedSubjects.find((s) => s.id === e.target.value);
                handleSubjectSelect(selected);
              }}
              defaultValue=""
              className="w-full max-w-lg p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
              <option value="" disabled>-- Choose a subject --</option>
              {assignedSubjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                      {subj.subjectName} ({subj.subject}) - Sem {subj.semester}, Sec {subj.section}
                  </option>
              ))}
          </select>
      </div>

      {selectedSubject && (
        <div className="border-t pt-6 space-y-6">
            {/* --- Step 2: Define Attendance Period --- */}
            <div>
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-3">
                    <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">2</span>
                    Define Attendance Period
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">From Date</label>
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">To Date</label>
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Total Classes Held</label>
                        <input type="number" min={0} value={totalClasses} onChange={(e) => setTotalClasses(e.target.value)} onWheel={(e) => e.target.blur()} className="w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                </div>
            </div>

            {/* --- Step 3: Enter Student Attendance --- */}
            <fieldset disabled={!totalClasses || !fromDate || !toDate} className={`${(!totalClasses || !fromDate || !toDate) && "opacity-50"}`}>
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-3">
                    <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">3</span>
                    Enter Student Attendance
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-white uppercase bg-blue-600">
                            <tr>
                                <th scope="col" className="px-6 py-3">USN</th>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Classes Attended (out of {totalClasses || '...'})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentStudents.map((student) => (
                                <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{student.id}</td>
                                    <td className="px-6 py-4">{student.name}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            min={0}
                                            max={totalClasses || ""}
                                            value={attendanceData[student.id] || ""}
                                            onChange={(e) => handleStudentAttendanceChange(student.id, e.target.value)}
                                            onWheel={(e) => e.target.blur()}
                                            className="w-24 p-2 border border-gray-300 rounded-md text-center"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {students.length === 0 && <p className="text-center text-gray-500 py-10">No students found for this class.</p>}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                    <div className="flex flex-wrap gap-4">
                        <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition">
                            <FaSave /> Save Attendance
                        </button>
                        <button onClick={generateAttendanceReportFromFirestore} className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-md hover:bg-green-700 transition">
                            <FaFilePdf /> Export Report to PDF
                        </button>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                </div>
                {submitStatus && <StatusMessage message={submitStatus} type={statusType} />}
            </fieldset>
        </div>
      )}
    </div>
  );
}