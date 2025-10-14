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

  useEffect(() => {
    const fetchAllData = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const marksQuery = query(collection(db, "marks"), where("rollNo", "==", studentId));
        const marksSnapshot = await getDocs(marksQuery);
        const marks = marksSnapshot.docs.map((doc) => doc.data());
        setAllMarksData(marks);

        const subjectQuery = query(collection(db, "subjects"));
        const subjectSnapshot = await getDocs(subjectQuery);
        const subjects = subjectSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id.trim()] = { name: data.name, credits: data.credit };
          return acc;
        }, {});
        setSubjectsData(subjects);

        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) setStudentData(studentSnap.data());
      } catch (err) {
        setError("Error fetching data. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [studentId]);
  
  useEffect(() => {
    const filtered = allMarksData.filter((m) => Number(m.semester) === selectedSemester);
    setMarksData(filtered);
  }, [allMarksData, selectedSemester]);

  const handleSemesterChange = (e) => setSelectedSemester(Number(e.target.value));

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

  const sgpa = useMemo(() => {
    let totalGradePoints = 0;
    let totalCredits = 0;
    marksData.forEach((mark) => {
      const subject = subjectsData[mark.subjectCode?.trim()];
      if (!subject || !subject.credits) return;
      const total = (mark.totalInternals || 0) + (mark.see || 0);
      const grade = getGradePoint(total);
      totalGradePoints += grade * subject.credits;
      totalCredits += subject.credits;
    });
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
  }, [marksData, subjectsData]);

  const cgpa = useMemo(() => {
    let totalGradePoints = 0;
    let totalCredits = 0;
    allMarksData.forEach((mark) => {
      const subject = subjectsData[mark.subjectCode?.trim()];
      if (!subject || !subject.credits) return;
      const total = (mark.totalInternals || 0) + (mark.see || 0);
      const grade = getGradePoint(total);
      totalGradePoints += grade * subject.credits;
      totalCredits += subject.credits;
    });
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
  }, [allMarksData, subjectsData]);


  const downloadPdfReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Academic Performance Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    if(studentData){
      doc.text(`Name: ${studentData.name}`, 14, 32);
      doc.text(`USN: ${studentId}`, 14, 38);
      doc.text(`Semester: ${selectedSemester}`, 120, 32)
      doc.text(`Overall CGPA: ${cgpa}`, 120, 38);
    }
    
    const tableData = marksData.map(mark => {
      const subject = subjectsData[mark.subjectCode?.trim()];
      if (!subject) return [];
      const totalMarks = (mark.totalInternals || 0) + (mark.see || 0);
      return [
        subject.name,
        mark.subjectCode,
        mark.totalInternals || "N/A",
        mark.see || "N/A",
        totalMarks,
        subject.credits
      ];
    }).filter(row => row.length > 0);

    autoTable(doc, {
      startY: 50,
      head: [['Subject', 'Code', 'Total Internals', 'SEE', 'Total Marks', 'Credits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }
    });
    
    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Semester ${selectedSemester} SGPA: ${sgpa}`, 14, finalY + 10);

    doc.save(`report_${studentId}_sem${selectedSemester}.pdf`);
  };

  const formatMarks = (mark, max) => {
    if (mark == null || (typeof mark !== "number" && mark !== 0)) return "N/A";
    if (max != null) return `${mark} / ${max}`;
    return mark;
  };
  
  const hasCIE1 = useMemo(() => marksData.some(m => m.cieMarks?.CIE1 != null), [marksData]);
  const hasCIE2 = useMemo(() => marksData.some(m => m.cieMarks?.CIE2 != null), [marksData]);
  const hasCIE3 = useMemo(() => marksData.some(m => m.cieMarks?.CIE3 != null), [marksData]);
  const hasLab = useMemo(() => marksData.some(m => m.labMarks != null), [marksData]);
  const hasAssignment = useMemo(() => marksData.some(m => m.assignmentMarks != null), [marksData]);

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
                    {hasCIE1 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE1, 50)}</td>}
                    {hasCIE2 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE2, 50)}</td>}
                    {hasCIE3 && <td className="px-4 py-3 text-center">{formatMarks(mark.cieMarks?.CIE3, 50)}</td>}
                    {hasLab && <td className="px-4 py-3 text-center">{formatMarks(mark.labMarks, 25)}</td>}
                    {hasAssignment && <td className="px-4 py-3 text-center">{formatMarks(mark.assignmentMarks, 25)}</td>}
                    <td className="px-4 py-3 text-center font-semibold">{formatMarks(mark.totalInternals)}</td>
                    <td className="px-4 py-3 text-center font-semibold">{formatMarks(mark.see)}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{formatMarks(totalMarks)}</td>
                    <td className="px-4 py-3 text-center">{sub.credits}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-10 text-gray-500">
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