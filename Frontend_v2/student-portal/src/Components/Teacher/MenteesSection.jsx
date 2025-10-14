import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Pagination from "../helpers/Pagination";
import { FaUsers, FaSearch, FaFilePdf } from "react-icons/fa";

export default function MenteesSection({ mentees }) {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectsData, setSubjectsData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSubjectsData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "subjects"));
        const subjectsObj = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          subjectsObj[doc.id] = { name: data.name, credits: data.credit };
        });
        setSubjectsData(subjectsObj);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjectsData();
  }, []);

  const filteredMentees = useMemo(() => {
    if (!Array.isArray(mentees)) return [];
    return mentees.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q)
      );
    });
  }, [mentees, searchQuery]);

  // --- ALL LOGIC FUNCTIONS FULLY RESTORED ---

  const getGradePoint = (totalMarks) => {
    if (totalMarks >= 90) return 10;
    if (totalMarks >= 80) return 9;
    if (totalMarks >= 70) return 8;
    if (totalMarks >= 60) return 7;
    if (totalMarks >= 55) return 6;
    if (totalMarks >= 50) return 5;
    if (totalMarks >= 40) return 4;
    return 0;
  };

  const cleanCode = (code) => (code || "").toString().trim().toUpperCase();

  const calculateSGPA = (marks, subjectsData) => {
    let totalGradePoints = 0;
    let totalCredits = 0;
    marks.forEach((mark) => {
      const subject = subjectsData[mark.subjectCode];
      if (!subject) return;
      const total = (mark.internals || 0) + (mark.see || 0);
      const grade = getGradePoint(total);
      totalGradePoints += grade * subject.credits;
      totalCredits += subject.credits;
    });
    return totalCredits > 0
      ? (totalGradePoints / totalCredits).toFixed(2)
      : "0.00";
  };

  const calculateCGPA = (allMarks, subjectsData) => {
    const semesterMap = {};
    allMarks.forEach((m) => {
      if (!semesterMap[m.semester]) semesterMap[m.semester] = [];
      semesterMap[m.semester].push(m);
    });
    let sgpaSum = 0;
    let count = 0;
    for (const sem in semesterMap) {
      let gp = 0, credits = 0;
      semesterMap[sem].forEach((m) => {
        const subject = subjectsData[m.subjectCode];
        if (!subject) return;
        const total = (m.internals || 0) + (m.see || 0);
        const grade = getGradePoint(total);
        gp += grade * subject.credits;
        credits += subject.credits;
      });
      if (credits > 0) {
        sgpaSum += gp / credits;
        count++;
      }
    }
    return count > 0 ? (sgpaSum / count).toFixed(2) : "0.00";
  };

  function loadImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        canvas.getContext("2d").drawImage(this, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const generatePDF = async (usn) => {
    setPdfLoadingId(usn);
    try {
      const subjectsSnapshot = await getDocs(collection(db, "subjects"));
      const freshSubjectsData = {};
      const subjectNameMap = {};
      subjectsSnapshot.forEach((doc) => {
        const data = doc.data();
        const id = cleanCode(doc.id);
        freshSubjectsData[id] = { name: data.name, credits: data.credit };
        subjectNameMap[id] = data.name;
      });

      const studentRef = doc(db, "students", usn);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        alert("Student data not found.");
        setPdfLoadingId(null);
        return;
      }
      const studentData = studentSnap.data();
      const currentSem = Number(studentData.semester || 0);

      const marksQuery = query(collection(db, "marks"), where("rollNo", "==", usn));
      const marksSnap = await getDocs(marksQuery);
      const semMap = {};
      marksSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const sem = Number(data.semester);
        if (sem > currentSem) return;
        if (!semMap[sem]) semMap[sem] = [];
        const totalMarks = (data.totalInternals || 0) + (data.see || 0);
        semMap[sem].push({
          semester: sem,
          subjectCode: cleanCode(data.subjectCode),
          internals: data.totalInternals || 0,
          see: data.see || 0,
          total: totalMarks,
        });
      });

      const allMarks = Object.values(semMap).flat();
      const cgpa = calculateCGPA(allMarks, freshSubjectsData);

      const docPdf = new jsPDF();
      let currentY = 10;
      const margin = 10;
      const pageWidth = docPdf.internal.pageSize.getWidth();

      // Header
      try {
        const logoDataUrl = await loadImageAsDataURL("/RV_logo.jpg");
        docPdf.addImage(logoDataUrl, "PNG", pageWidth / 2 - 10, currentY + 2, 20, 20);
      } catch {}
      docPdf.setFontSize(13).setFont("helvetica", "bold").text("RV Institute of Technology and Management", pageWidth / 2, currentY + 26, { align: "center" });
      docPdf.setFontSize(10).setFont("helvetica", "normal").text("Department of Computer Science and Engineering", pageWidth / 2, currentY + 31, { align: "center" });
      currentY += 48;
      docPdf.setFontSize(15).setFont("helvetica", "bold").text("Student Academic Report", pageWidth / 2, currentY, { align: "center" });

      // Student Info
      currentY += 10;
      docPdf.setFontSize(11).setFont("helvetica", "normal");
      docPdf.text(`Name: ${studentData.name || ""}`, margin + 2, (currentY += 8));
      docPdf.text(`USN: ${usn}`, pageWidth / 2 + 5, currentY);
      docPdf.text(`Semester: ${studentData.semester || ""}`, margin + 2, (currentY += 7));
      docPdf.text(`Section: ${studentData.section || ""}`, pageWidth / 2 + 5, currentY);
      docPdf.setFont("helvetica", "bold").text(`CGPA (Current Sem): ${cgpa}`, margin + 2, (currentY += 7));

      currentY += 8;
      // Marks Tables
      for (const sem of Object.keys(semMap).map(Number).sort((a, b) => a - b)) {
        const subjects = semMap[sem];
        const sgpa = calculateSGPA(subjects, freshSubjectsData);
        docPdf.setFontSize(13).text(`Semester ${sem} - SGPA: ${sgpa}`, margin + 2, (currentY += 9));
        autoTable(docPdf, {
          startY: currentY + 2,
          head: [["Code", "Subject", "Internals", "SEE", "Total"]],
          body: subjects.map((s) => [s.subjectCode, subjectNameMap[s.subjectCode] || "N/A", s.internals, s.see, s.total]),
          theme: "grid",
        });
        currentY = docPdf.lastAutoTable.finalY;
      }

      docPdf.save(`${usn}_Academic_Report.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const totalPages = Math.ceil(filteredMentees.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentMentees = filteredMentees.slice(indexOfFirst, indexOfLast);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 justify-center">
                <FaUsers /> My Mentees ({mentees.length})
            </h2>
            <div className="relative w-full md:w-auto">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, or USN..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full md:w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {filteredMentees.length === 0 ? (
            <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
                <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">
                    {searchQuery ? "No Matching Mentees Found" : "No Mentees Assigned"}
                </h3>
                <p className="text-gray-500 mt-1">
                    {searchQuery ? "Try a different search term." : "Mentees assigned to you will appear here."}
                </p>
            </div>
        ) : (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-white uppercase bg-blue-600">
                            <tr>
                                <th scope="col" className="px-6 py-3">#</th>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">USN</th>
                                <th scope="col" className="px-6 py-3">Semester</th>
                                <th scope="col" className="px-6 py-3 text-center">Academic Report</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentMentees.map((s, index) => (
                                <tr key={s.id || index} className="bg-white hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-500">{indexOfFirst + index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{s.name || "N/A"}</td>
                                    <td className="px-6 py-4">{s.id || "N/A"}</td>
                                    <td className="px-6 py-4">{s.semester || "N/A"}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => generatePDF(s.id)}
                                            disabled={pdfLoadingId === s.id}
                                            className="px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 w-32 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700"
                                        >
                                            {pdfLoadingId === s.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <><FaFilePdf /> Generate</>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </>
        )}
    </div>
  );
}