import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FiDownload } from "react-icons/fi";

const InfoChip = ({ label, value }) => (
  <div className="bg-blue-50 p-3 rounded-lg text-center">
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

export default function CgpaSection({ studentId }) {
  const [allMarksData, setAllMarksData] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [semesters] = useState([1, 2, 3, 4, 5, 6, 7, 8]);
  const [subjectsData, setSubjectsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);

  // 🔹 Fetch attendance for a student (From File 1)
  async function fetchAttendance(studentId, semester, section) {
    const attendanceSnapshot = await getDocs(
      query(
        collection(db, "attendance"),
        where("semester", "==", semester),
        where("section", "==", section)
      )
    );

    let attendanceMap = {}; // { subjectCode: percentage }

    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      const attended = data.attendanceByStudent?.[studentId] ?? 0;
      const total = data.totalClasses ?? 0;
      if (total > 0) {
        attendanceMap[data.subjectCode.trim()] = ((attended / total) * 100).toFixed(2);
      }
    });

    return attendanceMap;
  }

  // Comprehensive useEffect from File 1
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Step 1: get marks + subjects
        const marksQ = query(collection(db, "marks"), where("rollNo", "==", studentId));
        const marksSnap = await getDocs(marksQ);
        const marks = marksSnap.docs.map(doc => doc.data());

        const subjectSnap = await getDocs(collection(db, "subjects"));
        const subjects = subjectSnap.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id.trim()] = {
            name: data.name,
            credits: data.credit,
            maxMarks: { // Get detailed max marks
              CIE1: data.cieStructure?.CIE1?.maxMarks ?? null,
              CIE2: data.cieStructure?.CIE2?.maxMarks ?? null,
              CIE3: data.cieStructure?.CIE3?.maxMarks ?? null,
              labMarks: data.cieStructure?.labMarks?.maxMarks ?? null,
              assignmentMarks: data.cieStructure?.assignmentMarks?.maxMarks ?? null,
            },
          };
          return acc;
        }, {});

        setSubjectsData(subjects);

        // Step 2: get student info
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        const student = studentSnap.exists() ? studentSnap.data() : null;
        setStudentData(student);

        // Step 3: get attendance only if student exists
        let attendanceData = {};
        if (student) {
          attendanceData = await fetchAttendance(studentId, student.semester, student.section);
        }

        // Step 4: merge attendance into marks
        const mergedMarks = marks.map(m => ({
          ...m,
          attendance: attendanceData[m.subjectCode?.trim()] ?? "N/A",
        }));

        setAllMarksData(mergedMarks);
      } catch (err) {
        setError("Error loading data.");
        console.error(err); // Log error for debugging
      } finally {
        setLoading(false);
      }
    };

    if (studentId) fetchData();
  }, [studentId]);

  // useEffect for filtering (From File 1)
  useEffect(() => {
    if (!studentData) {
      setMarksData([]);
      return;
    }

    const filtered = allMarksData.filter(
      (m) =>
        Number(m.semester ?? studentData.semester) === selectedSemester // Use robust logic
    );
    setMarksData(filtered);
  }, [allMarksData, selectedSemester, studentData]);


  const handleSemesterChange = (e) => setSelectedSemester(Number(e.target.value));

  // getGradePoint from File 1
  const getGradePoint = (totalMarks) => {
    if (totalMarks >= 90) return 10;
    if (totalMarks >= 80) return 9;
    if (totalMarks >= 70) return 8;
    if (totalMarks >= 60) return 7;
    if (totalMarks >= 55) return 6;
    if (totalMarks >= 50) return 5;
    if (totalMarks >= 40) return 4;
    if (totalMarks >= 30) return 3;
    if (totalMarks >= 20) return 2;
    if (totalMarks >= 10) return 1;
    return 0;
  };

  // SGPA logic from File 1, adapted to useMemo
  const sgpa = useMemo(() => {
    let totalGradePoints = 0;
    let totalCredits = 0;

    marksData.forEach((mark) => {
      const subject = subjectsData[mark.subjectCode?.trim()];
      if (!subject) return;
      const total = (mark.totalInternals || 0) + (mark.see || 0);
      const grade = getGradePoint(total);
      totalGradePoints += grade * subject.credits;
      totalCredits += subject.credits;
    });

    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
  }, [marksData, subjectsData]); // Dependencies remain the same

  // CGPA logic from File 1, adapted to useMemo
  const cgpa = useMemo(() => {
    const semesterMap = {};
    allMarksData.forEach((m) => {
      if (!semesterMap[m.semester]) semesterMap[m.semester] = [];
      semesterMap[m.semester].push(m);
    });

    let sgpaSum = 0;
    let count = 0;

    for (const sem in semesterMap) {
      let gp = 0,
        credits = 0;
      semesterMap[sem].forEach((m) => {
        const sub = subjectsData[m.subjectCode];
        if (!sub) return;
        const total = (m.totalInternals || 0) + (m.see || 0);
        const grade = getGradePoint(total);
        gp += grade * sub.credits;
        credits += sub.credits;
      });
      if (credits > 0) {
        sgpaSum += gp / credits;
        count++;
      }
    }
    return count > 0 ? (sgpaSum / count).toFixed(2) : "0.00";
  }, [allMarksData, subjectsData]); // Dependencies remain the same

  // loadImageAsDataURL helper function from File 1
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

  const downloadPdfReport = async () => {
    const doc = new jsPDF();

    // Margins and sizing
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const boxWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Outer border
    doc.setDrawColor(180);
    doc.setLineWidth(0.4);
    doc.rect(margin, margin, boxWidth, doc.internal.pageSize.getHeight() - 2 * margin, "S");

    // Logo (smaller size)
    let logoDataUrl;
    try {
      logoDataUrl = await loadImageAsDataURL("/RV_logo.jpg");
      doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - 10, currentY + 2, 20, 20); // smaller, centered
    } catch { }

    // Centered college details
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("RV Institute of Technology and Management", pageWidth / 2, currentY + 26, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Rashtriya Sikshana Samithi Trust", pageWidth / 2, currentY + 31, { align: "center" });
    doc.text("Department of Computer Science and Engineering", pageWidth / 2, currentY + 36, { align: "center" });
    doc.text("Bengaluru - 560076", pageWidth / 2, currentY + 41, { align: "center" });

    // Centered report title
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("PROGRESS REPORT", pageWidth / 2, currentY + 52, { align: "center" });

    // "To" and parent block (next line after To)
    currentY += 60;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("To,", margin + 7, currentY, { maxWidth: boxWidth - 14 });

    currentY += 6;
    // Student info next line, bold
    doc.setFont("helvetica", "bold");
    const studentName = studentData?.name ?? "N/A";
    doc.text(`Parent / Guardian of ${studentName}`, margin + 7, currentY, { maxWidth: boxWidth - 14 });

    // Paragraph for letter - new paragraph after name
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const studentUSN = studentId || "N/A";
    const introText = `Dear Sir / Madam,
I am herewith furnishing the progress report of your ward Mr./Ms. ${studentName} (USN/SIN: ${studentUSN}) for the Internal Assessment Examination as under.
You are hereby requested to go through the report and give us your feedback.`;
    doc.text(introText, margin + 7, currentY, { maxWidth: boxWidth - 14, lineHeightFactor: 1.4 });
    currentY += 20;

    // Table
    const hasCIE1 = marksData.some((m) => typeof m.cieMarks?.CIE1 === "number");
    const hasCIE2 = marksData.some((m) => typeof m.cieMarks?.CIE2 === "number");
    const hasCIE3 = marksData.some((m) => typeof m.cieMarks?.CIE3 === "number");
    const hasLab = marksData.some((m) => typeof m.labMarks === "number");
    const hasAssignment = marksData.some((m) => typeof m.assignmentMarks === "number");
    
    // --- 1. "Total Marks (100)" REMOVED from headers ---
    const tableColumn = [
      "Subject",
      ...(hasCIE1 ? ["CIE1"] : []),
      ...(hasCIE2 ? ["CIE2"] : []),
      ...(hasCIE3 ? ["CIE3"] : []),
      ...(hasLab ? ["Lab Marks"] : []),
      ...(hasAssignment ? ["Assignment Marks"] : []),
      "Total Internals (50)",
      "Attendance (%)",
      "Credits",
    ];
    const formatMarkForPdf = (mark, max) => {
      if (mark == null || (typeof mark !== "number" && mark !== 0)) return "N/A";
      if (max != null) return `${mark}/${max}`;
      return mark;
    };
    const tableRows = marksData
      .map((mark) => {
        const subject = subjectsData[mark.subjectCode];
        if (!subject) return null;
        // const totalMarks = (mark.totalInternals || 0) + (mark.see || 0); // No longer needed here
        const row = [`${subject.name} (${mark.subjectCode})`];
        if (hasCIE1) row.push(formatMarkForPdf(mark.cieMarks?.CIE1, mark.maxMarks?.CIE1));
        if (hasCIE2) row.push(formatMarkForPdf(mark.cieMarks?.CIE2, mark.maxMarks?.CIE2));
        if (hasCIE3) row.push(formatMarkForPdf(mark.cieMarks?.CIE3, mark.maxMarks?.CIE3));
        if (hasLab) row.push(formatMarkForPdf(mark.labMarks, mark.maxMarks?.labMarks));
        if (hasAssignment)
          row.push(formatMarkForPdf(mark.assignmentMarks, mark.maxMarks?.assignmentMarks));
        
        // --- 2. totalMarks REMOVED from row data ---
        row.push(
          mark.totalInternals ?? "N/A",
          mark.attendance !== "N/A" ? `${Math.round(mark.attendance)}%` : "N/A",
          subject.credits
        );
        return row;
      })
      .filter(Boolean);

    autoTable(doc, {
      startY: currentY,
      head: [tableColumn],
      body: tableRows,
      margin: { left: margin + 4, right: margin + 4 },
      tableLineWidth: 0.20,
      styles: {
        fontSize: 9,
        cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
        lineColor: [80, 80, 80],
        lineWidth: 0.20,
        halign: 'center',
        valign: 'middle',
        cellWidth: 'auto',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        lineColor: [80, 80, 80],
        lineWidth: 0.20,
        cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
        lineColor: [80, 80, 80],
        lineWidth: 0.20,
      },
      rowPageBreak: 'avoid',
      didDrawCell: (data) => {
        const { cell, doc: d } = data;
        d.setDrawColor(80, 80, 80);
        d.setLineWidth(0.20);
        d.rect(cell.x, cell.y, cell.width, cell.height);
      },
    });

    // Get position below table
    currentY = doc.lastAutoTable.finalY + 8;

    // --- (Rest of the function is unchanged) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Important Instructions:", margin + 7, currentY);

    const instructions = [
      "If your ward has secured less than 50% marks and less than 85% attendance, please meet the HOD/Counselor.",
      "Minimum 85% attendance and CIE marks greater than 40% are mandatory to appear for Semester End Examination.",
      "Kindly monitor your ward's academic progress regularly and advise accordingly.",
    ];

    let instructionY = currentY + 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const textIndent = margin + 7;
    const indentAfterNumber = textIndent + doc.getTextWidth("1. ");
    let currY = instructionY;

    instructions.forEach((line, idx) => {
      const bullet = `${idx + 1}. `;
      const availableWidth = boxWidth - (indentAfterNumber - margin);
      const lines = doc.splitTextToSize(line, availableWidth);

      doc.text(bullet + lines[0], textIndent, currY);

      for (let i = 1; i < lines.length; i++) {
        doc.text(lines[i], indentAfterNumber, currY + i * 7);
      }
      currY += lines.length * 7;
    });
    
    let signY = instructionY + instructions.length * 8 + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Head of the Department", margin + 7, signY);
    doc.text("Counselor", pageWidth - margin - 45, signY);

    let remarksY = signY + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Remarks of the Parents / Guardian", margin + 7, remarksY);
    doc.setDrawColor(170);
    doc.setLineWidth(0.2);
    doc.rect(margin + 7, remarksY + 2, boxWidth - 26, 25);

    const spaceForParentSignature = 45;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Signature of Parent / Guardian", pageWidth - margin - 60, remarksY + spaceForParentSignature);

    doc.save(`GradeReport_Semester${selectedSemester}_${studentUSN}.pdf`);
  };

  // formatMarks from File 1
  const formatMarks = (mark, max) => {
    if (mark == null || (typeof mark !== "number" && mark !== 0)) return "N/A";
    if (max != null) return `${mark}/${max}`;
    return mark;
  };

  // hasCIE... logic from File 1, adapted to useMemo
  const hasCIE1 = useMemo(() => marksData.some(m => typeof m.cieMarks?.CIE1 === "number"), [marksData]);
  const hasCIE2 = useMemo(() => marksData.some(m => typeof m.cieMarks?.CIE2 === "number"), [marksData]);
  const hasCIE3 = useMemo(() => marksData.some(m => typeof m.cieMarks?.CIE3 === "number"), [marksData]);
  const hasLab = useMemo(() => marksData.some(m => typeof m.labMarks === "number"), [marksData]);
  const hasAssignment = useMemo(() => marksData.some(m => typeof m.assignmentMarks === "number"), [marksData]);

  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <div className="spinner"></div>
    </div>
  )
  if (error) return <div className="p-6 text-red-600 text-center">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
            <img src="/program.png" alt="Performance Icon" className="w-12 h-12" />
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Academic Performance</h2>
                <p className="text-sm text-gray-500">View and download your semester-wise grade report.</p>
            </div>
        </div>
        <div className="flex gap-4">
          <InfoChip label="Overall CGPA" value={cgpa} />
          <InfoChip label={`Semester ${selectedSemester} SGPA`} value={sgpa} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
        <label htmlFor="semester" className="font-medium text-gray-700">Select Semester:</label>
        <select
          id="semester"
          value={selectedSemester}
          onChange={handleSemesterChange}
          className="w-full sm:w-auto border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {semesters.map((sem) => (
            <option key={sem} value={sem}>
              Semester {sem}
            </option>
          ))}
        </select>
        <button
          onClick={downloadPdfReport}
          className="w-full sm:w-auto ml-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-semibold"
        >
          <FiDownload />
          Download Report
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-blue-50 text-gray-600 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">Subject</th>
              {hasCIE1 && <th className="px-4 py-3 font-semibold text-center">CIE1</th>}
              {hasCIE2 && <th className="px-4 py-3 font-semibold text-center">CIE2</th>}
              {hasCIE3 && <th className="px-4 py-3 font-semibold text-center">CIE3</th>}
              {hasLab && <th className="px-4 py-3 font-semibold text-center">Lab</th>}
              {hasAssignment && <th className="px-4 py-3 font-semibold text-center">Assignment</th>}
              <th className="px-4 py-3 font-semibold text-center">Total Internals</th>
              <th className="px-4 py-3 font-semibold text-center">SEE</th>
              <th className="px-4 py-3 font-semibold text-center">Total Marks</th>
              <th className="px-4 py-3 font-semibold text-center">Credits</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {marksData.length > 0 ? (
              marksData.map((mark, i) => {
                const sub = subjectsData[mark.subjectCode];
                if (!sub) return null;
                const totalMarks = (mark.totalInternals || 0) + (mark.see || 0);

                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{sub.name}</div>
                      <div className="text-xs text-gray-500">{mark.subjectCode}</div>
                    </td>
                    {/* Use dynamic maxMarks from fetched subjectData */}
                    {hasCIE1 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE1, sub.maxMarks?.CIE1)}</td>}
                    {hasCIE2 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE2, sub.maxMarks?.CIE2)}</td>}
                    {hasCIE3 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE3, sub.maxMarks?.CIE3)}</td>}
                    {hasLab && <td className="px-4 py-3 text-center">{formatMarks(mark.labMarks, sub.maxMarks?.labMarks)}</td>}
                    {hasAssignment && <td className="px-4 py-3 text-center">{formatMarks(mark.assignmentMarks, sub.maxMarks?.assignmentMarks)}</td>}
                    
                    <td className="px-4 py-3 text-center font-semibold">{formatMarks(mark.totalInternals)}</td>
                    <td className="px-4 py-3 text-center font-semibold">{formatMarks(mark.see)}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{formatMarks(totalMarks)}</td>
                    <td className="px-4 py-3 text-center">{sub.credits}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10 + (hasCIE1 ? 1 : 0) + (hasCIE2 ? 1 : 0) + (hasCIE3 ? 1 : 0) + (hasLab ? 1 : 0) + (hasAssignment ? 1 : 0)} className="text-center py-10 text-gray-500">
                  No marks found for this semester.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
