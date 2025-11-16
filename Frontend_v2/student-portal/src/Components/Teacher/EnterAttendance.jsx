import React, { useEffect, useState, useRef } from "react"; // Added useRef
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
import "jspdf-autotable"; // Make sure this is imported
import Pagination from "../helpers/Pagination"; // Check this path
import { 
  FaCalendarCheck, 
  FaFilePdf, 
  FaSave, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaFileImport // Added
} from "react-icons/fa";
import * as XLSX from "xlsx"; // Added

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

  // --- START: New Ref for File Input ---
  const fileInputRef = useRef(null);
  // --- END: New Ref for File Input ---

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

  // --- START: New Excel Import Handlers ---
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!totalClasses || !fromDate || !toDate) {
      showMessage("Please fill in From Date, To Date, and Total Classes before importing.", "error");
      e.target.value = null; 
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Expecting columns "USN" and "Classes Attended"
        const json = XLSX.utils.sheet_to_json(worksheet);

        const newAttendanceData = { ...attendanceData };
        let recordsProcessed = 0;
        const totalClassesNum = Number(totalClasses);

        json.forEach((row) => {
          const usn = row.USN?.toString().trim();
          const attendedRaw = row["Classes Attended"];
          
          if (!usn || attendedRaw === undefined) return; 

          const studentExists = students.find(s => s.id === usn);
          if (studentExists) {
            const valInt = parseInt(attendedRaw, 10);

            if (isNaN(valInt)) {
              newAttendanceData[usn] = ""; 
            } else if (valInt > totalClassesNum) {
              showMessage(`Error for ${usn}: Attended classes (${valInt}) exceed total classes (${totalClassesNum}). Skipping.`, "error", 6000);
            } else {
              newAttendanceData[usn] = valInt;
              recordsProcessed++;
            }
          }
        });

        setAttendanceData(newAttendanceData);
        showMessage(`Successfully imported attendance for ${recordsProcessed} students. Please review and save.`, "success");

      } catch (err) {
        console.error("Error processing Excel data:", err);
        showMessage("Failed to process Excel file. Ensure columns are 'USN' and 'Classes Attended'.", "error");
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      showMessage("Failed to read the file.", "error");
    };

    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };
  // --- END: New Excel Import Handlers ---

  // --- START: PDF Export Logic (From your new code) ---
  function loadImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const generateAttendanceReportFromFirestore = async () => {
    if (!selectedSubject) {
      showMessage("Please select a subject.", "error");
      return;
    }

    try {
      const q = query(
        collection(db, "attendance"),
        where("subjectCode", "==", selectedSubject.subject),
        where("semester", "==", Number(selectedSubject.semester)),
        where("section", "==", selectedSubject.section)
      );
      const subjectDocs = await getDocs(collection(db, "subjects"));
      const subjectCodeToName = {};
      subjectDocs.forEach((doc) => {
        const data = doc.data();
        subjectCodeToName[doc.id] = data.name; // Assuming doc.id is subject code
      });

      const docu = new jsPDF();
      const margin = 10;
      const pageWidth = docu.internal.pageSize.getWidth();
      const boxWidth = pageWidth - 2 * margin;

      docu.setDrawColor(180);
      docu.setLineWidth(0.4);
      docu.rect(margin, margin, boxWidth, docu.internal.pageSize.getHeight() - 2 * margin, "S");

      try {
        const logoX = margin + 5;
        const logoY = margin + 2;
        const logoDataUrl = await loadImageAsDataURL("/RV_logo.jpg"); // Make sure this path is correct in your /public folder
        docu.addImage(logoDataUrl, "PNG", logoX, logoY, 20, 20);
      } catch (err) {
        console.warn("Could not load logo for PDF.", err);
      }

      docu.setFontSize(13);
      docu.setFont("helvetica", "bold");
      const headerTextY = margin + 10;
      docu.text(
        "RV Institute of Technology and Management",
        pageWidth / 2,
        headerTextY,
        { align: "center" }
      );

      const lineSpacing = 5;
      docu.setFontSize(10);
      docu.setFont("helvetica", "normal");
      docu.text(
        "Rashtriya Sikshana Samithi Trust",
        pageWidth / 2,
        headerTextY + lineSpacing,
        { align: "center" }
      );
      docu.text(
        "Department of Computer Science and Engineering",
        pageWidth / 2,
        headerTextY + 2 * lineSpacing,
        { align: "center" }
      );
      docu.text(
        "Bengaluru - 560076",
        pageWidth / 2,
        headerTextY + 3 * lineSpacing,
        { align: "center" }
      );
      const lastHeaderY = headerTextY + 3 * lineSpacing;

      const lineMargin = margin + 5;
      docu.setDrawColor(160, 160, 160);
      docu.setLineWidth(0.7);
      docu.line(
        lineMargin,
        lastHeaderY + 4,
        pageWidth - lineMargin,
        lastHeaderY + 4
      );

      docu.setFontSize(15);
      docu.setFont("helvetica", "bold");
      docu.text("ATTENDANCE REPORT", pageWidth / 2, margin + 42, {
        align: "center",
      });

      docu.setFontSize(10);
      const subjectName = subjectCodeToName[selectedSubject.subject] || "";
      const infoRow = `Subject: ${subjectName || ""} (${selectedSubject.subject})    Semester: ${selectedSubject.semester}    Section: ${selectedSubject.section}`;
      docu.text(infoRow, pageWidth / 2, margin + 48, { align: "center" });

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        showMessage("No attendance records found for selected subject.", "error");
        return;
      }
      const attendanceDocs = snapshot.docs.map((docu) => docu.data());

      const attendanceSummary = {};
      let totalClassesHeld = 0;
      attendanceDocs.forEach((record) => {
        const studentAttendance = record.attendanceByStudent || {};
        totalClassesHeld += Number(record.totalClasses || 0);
        students.forEach((student) => {
          const attended = studentAttendance[student.id] || 0;
          if (!attendanceSummary[student.id]) {
            attendanceSummary[student.id] = { name: student.name, attended: 0 };
          }
          attendanceSummary[student.id].attended += attended;
        });
      });

      const tableData = Object.entries(attendanceSummary).map(
        ([usn, { name, attended }], index) => {
          const percentage = totalClassesHeld
            ? (attended / totalClassesHeld) * 100
            : 0;
          return {
            Slno: index + 1,
            usn,
            name,
            attended,
            totalClassesHeld,
            percentage,
            percentageText: `${percentage.toFixed(2)}%`,
          };
        }
      );

      const tableStartY = margin + 55;
      autoTable(docu, {
        startY: tableStartY,
        head: [["Slno", "USN", "Name", "Attended", "Total", "Percentage"]],
        body: tableData.map((row) => [
          row.Slno,
          row.usn,
          row.name,
          row.attended,
          row.totalClassesHeld,
          row.percentageText,
        ]),
        styles: {
          fontSize: 10,
          halign: "center",
          valign: "middle",
          cellPadding: 3,
          lineColor: [150, 150, 150],
          margin: 50,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: {
          textColor: 20,
        },
        // This logic colors percentages < 50% red
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const rowIndex = data.row.index;
            if (tableData[rowIndex].percentage < 50) {
              docu.setTextColor(220, 38, 38); // Red color
            }
          }
        },
        margin: { top: 10, left: margin + 12, right: margin + 12 },
        tableLineWidth: 0.05,
        tableLineColor: [160, 160, 160],
      });
      docu.save(`AttendanceReport_${selectedSubject.subject}}.pdf`);
    } catch (err) {
      console.error("Error generating report:", err);
      showMessage("Failed to generate report.", "error");
    }
  };
  

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
    
    // Check if all students have attendance data
    const missingData = students.some(student => attendanceData[student.id] === undefined || attendanceData[student.id] === "");
    if (missingData) {
        if (!window.confirm("Some students have no attendance data (0 classes). Are you sure you want to proceed?")) {
            return;
        }
    }

    const attendanceByStudent = {};
    students.forEach((student) => {
      attendanceByStudent[student.id] = Number(attendanceData[student.id] || 0);
    });

    try {
      showMessage("Saving attendance...", "info", null); // Non-disappearing message
      const docId = `${selectedSubject.subject}_${fromDate}_${toDate}}`;
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
      {/* --- START: New Hidden File Input --- */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".xlsx, .xls, .csv"
      />
      {/* --- END: New Hidden File Input --- */}

      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaCalendarCheck /> Enter Attendance</h2>

      {/* --- Step 1: Select Subject --- */}
      <div className="mb-6">
          <label htmlFor="subjectSelect" className="block mb-2 font-bold text-gray-700">
              <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">1</span>
              Select a Subject
          </label>
          <select
              id="subjectSelect"
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
                        <button onClick={generateAttendanceReportFromFirestore} className="flex items-center gap-2 bg-red-600 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700 transition">
                            <FaFilePdf /> Export Report to PDF
                        </button>
                        {/* --- New Import Button Added --- */}
                        <button 
                          onClick={handleImportClick} 
                          className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-md hover:bg-green-700 transition"
                        >
                            <FaFileImport /> Import Excel
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