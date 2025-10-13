import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FiAlertCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import { FaChartBar, FaFilePdf, FaUsers, FaStar, FaPercentage } from "react-icons/fa";

const FeedbackReport = () => {
  const [teacherName, setTeacherName] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teachingInfo, setTeachingInfo] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Attempt to get the name from the displayName, fallback to a formatted email
        const name = user.displayName || user.email.split('@')[0];
        setTeacherName(name);
      } else {
        setTeacherName(null);
        setReport(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherName) return;
      setLoading(true);
      try {
        const docRef = doc(db, "feedbackReports", teacherName);
        const docSnap = await getDoc(docRef);
        setReport(docSnap.exists() ? docSnap.data() : null);

        const q = query(collection(db, "teachingAssignments"), where("teacherName", "==", teacherName));
        const teachingSnap = await getDocs(q);
        setTeachingInfo(teachingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const subjects = {};
        subjectsSnap.forEach((doc) => {
          subjects[doc.id] = doc.data().name;
        });
        setSubjectsMap(subjects);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [teacherName]);
  
  // --- ALL LOGIC FUNCTIONS FULLY PRESERVED ---

  const loadImageAsDataURL = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const downloadPDF = async () => {
    if (!report) return;

    const docPdf = new jsPDF();
    const margin = 10;
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const pageHeight = docPdf.internal.pageSize.getHeight();
    const boxWidth = pageWidth - 2 * margin;
    
    docPdf.setDrawColor(180);
    docPdf.setLineWidth(0.4);
    docPdf.rect(margin, margin, boxWidth, pageHeight - 2 * margin, "S");

    try {
      const logoDataUrl = await loadImageAsDataURL("/RV_logo.jpg");
      docPdf.addImage(logoDataUrl, "PNG", margin + 5, margin + 2, 20, 20);
    } catch {}

    const headerTextY = margin + 10;
    const lineSpacing = 5;

    docPdf.setFont("helvetica", "bold").setFontSize(13).text("RV Institute of Technology and Management", pageWidth / 2, headerTextY, { align: "center" });
    docPdf.setFont("helvetica", "normal").setFontSize(10);
    docPdf.text("Rashtriya Sikshana Samithi Trust", pageWidth / 2, headerTextY + lineSpacing, { align: "center" });
    docPdf.text("Department of Computer Science and Engineering", pageWidth / 2, headerTextY + 2 * lineSpacing, { align: "center" });
    docPdf.text("Bengaluru - 560076", pageWidth / 2, headerTextY + 3 * lineSpacing, { align: "center" });

    let y = headerTextY + 4 * lineSpacing + 15;
    const lastHeaderY = headerTextY + 3 * lineSpacing;

    const lineMargin = margin + 5;
    docPdf.setDrawColor(160, 160, 160).setLineWidth(0.7).line(lineMargin, lastHeaderY + 4, pageWidth - lineMargin, lastHeaderY + 4);

    docPdf.setFont("helvetica", "bold").setFontSize(13).text(`Feedback Report for ${teacherName}`, pageWidth / 2, y - 5, { align: "center" });
    y += 8;

    const columns = ["Subject Code", "Subject Name", ...Array.from({ length: 12 }, (_, i) => `C${i + 1}`), "No. of Students", "Total Points", "Percentage"];

    Object.entries(report).forEach(([subjectCode, data]) => {
      if (["total_students", "percentage", "total"].includes(subjectCode)) return;

      const match = teachingInfo.find((t) => t.subject === subjectCode);
      const section = match?.section ?? "-";
      const semester = match?.semester ?? "-";
      const subjectName = subjectsMap[subjectCode] ?? "Unknown";

      docPdf.setFontSize(12).text(`Subject: ${subjectName}, Semester: ${semester}, Section: ${section}`, margin + 10, y);

      const row = [
        subjectCode, subjectName,
        ...Array.from({ length: 12 }, (_, i) => data[`c${i + 1}`] ?? "-"),
        data.total_students ?? "-",
        data.total ?? "-",
        data.percentage ? `${data.percentage}%` : "-",
      ];

      autoTable(docPdf, {
        startY: y + 5,
        head: [columns],
        body: [row],
        theme: "grid",
        styles: { fontSize: 8, textColor: 0, lineColor: [180, 180, 180], lineWidth: 0.1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, lineColor: 100, lineWidth: 0.3 },
      });
      y = docPdf.lastAutoTable.finalY + 10;
    });
    docPdf.save(`Feedback_Report_${teacherName}.pdf`);
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  if (!teacherName) {
    return <p className="text-center text-red-600 mt-8">Please log in to view your feedback report.</p>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FaChartBar /> Feedback Report</h2>
            <p className="text-gray-500 text-sm mt-1">Summary of student feedback for your assigned subjects.</p>
        </div>
        {report && (
            <button
                onClick={downloadPDF}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-sm"
            >
                <FaFilePdf /> Download Full Report
            </button>
        )}
      </div>

      {!report ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center py-16 px-6 bg-yellow-50 rounded-lg border border-yellow-200"
        >
          <FiAlertCircle className="mx-auto text-5xl text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold text-yellow-800">No Feedback Found</h3>
          <p className="text-yellow-700 mt-2 max-w-md mx-auto">
            No feedback report is available for you at this time. Once students submit feedback and the admin generates the report, it will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {Object.entries(report).map(([subjectCode, data]) => {
             if (["total_students", "percentage", "total"].includes(subjectCode)) return null;
             
             const match = teachingInfo.find((t) => t.subject === subjectCode);
             const section = match?.section ?? "-";
             const semester = match?.semester ?? "-";
             const subjectName = subjectsMap[subjectCode] ?? "Unknown";

             return (
                <motion.div 
                    key={subjectCode}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-blue-800">{subjectName} ({subjectCode})</h3>
                        <p className="text-sm text-gray-500">Semester: {semester}, Section: {section}</p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <FaPercentage className="mx-auto text-2xl text-blue-500 mb-2"/>
                            <p className="text-2xl font-bold text-blue-800">{data.percentage ?? 0}%</p>
                            <p className="text-xs text-blue-600 font-semibold">Overall Score</p>
                        </div>
                         <div className="bg-green-50 p-4 rounded-lg">
                            <FaUsers className="mx-auto text-2xl text-green-500 mb-2"/>
                            <p className="text-2xl font-bold text-green-800">{data.total_students ?? 0}</p>
                            <p className="text-xs text-green-600 font-semibold">Student Responses</p>
                        </div>
                         <div className="bg-yellow-50 p-4 rounded-lg">
                            <FaStar className="mx-auto text-2xl text-yellow-500 mb-2"/>
                            <p className="text-2xl font-bold text-yellow-800">{data.total ?? 0}</p>
                            <p className="text-xs text-yellow-600 font-semibold">Total Points</p>
                        </div>
                    </div>

                    {/* Detailed Criteria */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Detailed Criteria Scores:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({ length: 12 }, (_, i) => (
                                <div key={`c${i + 1}`} className="bg-gray-100 p-2 rounded text-center">
                                    <p className="text-xs font-bold text-gray-500">C{i + 1}</p>
                                    <p className="text-lg font-semibold text-gray-800">{data[`c${i + 1}`] ?? "-"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
             )
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackReport;