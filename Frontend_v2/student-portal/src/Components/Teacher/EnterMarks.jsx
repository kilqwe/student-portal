import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import { FaSearch, FaFilePdf, FaFileExcel, FaSave, FaEdit, FaFileImport } from "react-icons/fa";
import { Check, X } from "lucide-react";
import { collection, query, where, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import Pagination from "../helpers/Pagination";

export default function EnterMarks() {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [isMaxMarksSaved, setIsMaxMarksSaved] = useState(false);
  const [selectedCells, setSelectedCells] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [originalMarksData, setOriginalMarksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reducedMax, setReducedMax] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;
  // Logic from File 1: Includes totalInternals and reducedCIE for export logic
  const [fieldApplicability, setFieldApplicability] = useState({
    CIE1: true,
    CIE2: true,
    CIE3: true,
    assignmentMarks: true,
    labMarks: true,
    totalInternals: true,
    reducedCIE: true
  });

  const fileInputRef = useRef(null);

  // Logic from File 1: More robust safeInt
  function safeInt(value) {
    if (value === null || value === undefined || value === "" || value === "N/A") return 0;
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : n;
  }

  const [maxMarks, setMaxMarks] = useState({
    CIE1: "", CIE2: "", CIE3: "", assignmentMarks: "", labMarks: "",
  });
  const [subjectDetails, setSubjectDetails] = useState({});

  // UI logic from File 2
  useEffect(() => {
    if (submitStatus) {
      if (submitStatus !== "Saving marks...") {
        const timer = setTimeout(() => setSubmitStatus(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [submitStatus]);
  
  // UI logic from File 2 (combines File 1's two useEffects)
  useEffect(() => {
    const fetchInitialData = async () => {
        const user = auth.currentUser;
        if (!user) { setLoading(false); return; }

        try {
            // Fetch subjects for select dropdown
            const subjectsSnapshot = await getDocs(collection(db, "subjects"));
            const subjectMap = {};
            subjectsSnapshot.forEach((doc) => {
                subjectMap[doc.id] = doc.data().name;
            });
            setSubjectDetails(subjectMap);

            // Fetch teacher's assigned subjects
            const teacherQuery = query(collection(db, "teachers"), where("uid", "==", user.uid));
            const teacherSnap = await getDocs(teacherQuery);
            if (teacherSnap.empty) { setLoading(false); return; }
            
            const teacherDoc = teacherSnap.docs[0];
            const employeeId = teacherDoc.id;
            const assignmentQuery = query(collection(db, "teachingAssignments"), where("employeeId", "==", employeeId));
            const assignmentSnap = await getDocs(assignmentQuery);
            const subjects = assignmentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setAssignedSubjects(subjects);

        } catch (err) {
            console.error("Error fetching initial data:", err);
        }
        setLoading(false);
    };
    fetchInitialData();
  }, []);

  // Logic from File 1
  const exportToExcel = () => {
    if (!selectedSubject || students.length === 0) return;

    // Prepare data for excel
    const headers = [
      "slno.",
      "USN",
      "Name",
      ...(fieldApplicability.CIE1 ? ["CIE1"] : []),
      ...(fieldApplicability.CIE2 ? ["CIE2"] : []),
      ...(fieldApplicability.CIE3 ? ["CIE3"] : []),
      ...(fieldApplicability.reducedCIE ? ["Reduced CIE"] : []),
      ...(fieldApplicability.assignmentMarks ? ["Assignment"] : []),
      ...(fieldApplicability.labMarks ? ["Lab Marks"] : []),
      ...(fieldApplicability.totalInternals ? ["Total Internals"] : []),
    ];

    const data = students.map((student, index) => {
      const entry = marksData[student.id] || {};
      return [
        index + 1,
        student.id,
        student.name,
        ...(fieldApplicability.CIE1 ? [entry.CIE1 ?? ""] : []),
        ...(fieldApplicability.CIE2 ? [entry.CIE2 ?? ""] : []),
        ...(fieldApplicability.CIE3 ? [entry.CIE3 ?? ""] : []),
        ...(fieldApplicability.reducedCIE ? [entry.reducedCIE ?? ""] : []),
        ...(fieldApplicability.assignmentMarks ? [entry.assignmentMarks ?? ""] : []),
        ...(fieldApplicability.labMarks ? [entry.labMarks ?? ""] : []),
        ...(fieldApplicability.totalInternals ? [entry.totalInternals ?? ""] : []),
      ];
    });

    // Combine header and data
    const worksheetData = [headers, ...data];

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Save file
    const fileName = `MarksGradeReport_${selectedSubject.subject}_${selectedSubject.section}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // UI logic from File 2
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  // UI logic from File 2
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isMaxMarksSaved || students.length === 0) {
      alert("Please select a subject and save max marks before importing.");
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
        const json = XLSX.utils.sheet_to_json(worksheet);

        const newMarksData = { ...marksData };
        let recordsProcessed = 0;

        json.forEach((row) => {
          const usn = row.USN?.toString().trim();
          if (!usn) return; 

          const studentExists = students.find(s => s.id === usn);
          if (studentExists) {
            if (!newMarksData[usn]) newMarksData[usn] = {};

            const fieldMap = {
              'CIE1': 'CIE1',
              'CIE2': 'CIE2',
              'CIE3': 'CIE3',
              'Assignment': 'assignmentMarks',
              'Lab Marks': 'labMarks'
            };

            for (const [excelHeader, stateKey] of Object.entries(fieldMap)) {
              if (fieldApplicability[stateKey] && row[excelHeader] !== undefined) {
                const rawValue = row[excelHeader];
                let rawVal = rawValue === "" || rawValue === "N/A" ? "" : rawValue;
                let valInt = parseInt(rawVal, 10);
                const maxAllowed = maxMarks[stateKey];

                if (isNaN(valInt)) {
                  newMarksData[usn][stateKey] = "";
                } else if (maxAllowed !== "" && !isNaN(maxAllowed) && valInt > maxAllowed) {
                  alert(`Error for ${usn}: ${excelHeader} marks (${valInt}) exceed max marks (${maxAllowed}). This value will be skipped.`);
                } else {
                  newMarksData[usn][stateKey] = valInt;
                }
              }
            }
            recordsProcessed++;
          }
        });

        setMarksData(newMarksData);
        alert(`Successfully imported marks for ${recordsProcessed} students. Please review and click "Save Marks" to finalize.`);

      } catch (err) {
        console.error("Error processing Excel data:", err);
        alert("Failed to process Excel file. Ensure columns are correct (USN, CIE1, CIE2, CIE3, Assignment, Lab Marks).");
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Failed to read the file.");
    };

    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  // Logic from File 1
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

  // --- MODIFIED PDF FUNCTION ---
  const downloadReportAsPDF = async () => {
    if (!selectedSubject || students.length === 0) return;

    // 1. Set orientation to landscape
    const doc = new jsPDF({ orientation: "landscape" });
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const boxWidth = pageWidth - 2 * margin;

    // 2. Border drawing logic is REMOVED from here and put in didDrawPage

    try {
      const logoX = margin + 5;
      const logoY = margin + 2;
      const logoDataUrl = await loadImageAsDataURL("/RV_logo.jpg");
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, 20, 20);
    } catch {
      // Ignore if logo not loaded
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");

    const headerTextY = margin + 10;
    doc.text(
      "RV Institute of Technology and Management",
      pageWidth / 2,
      headerTextY,
      { align: "center" }
    );
    const lineSpacing = 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(
      "Rashtriya Sikshana Samithi Trust",
      pageWidth / 2,
      headerTextY + lineSpacing,
      { align: "center" }
    );
    doc.text(
      "Department of Computer Science and Engineering",
      pageWidth / 2,
      headerTextY + 2 * lineSpacing,
      { align: "center" }
    );
    doc.text(
      "Bengaluru - 560076",
      pageWidth / 2,
      headerTextY + 3 * lineSpacing,
      { align: "center" }
    );

    const lastHeaderY = headerTextY + 3 * lineSpacing;
    const lineMargin = margin + 5;
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.7);
    doc.line(
      lineMargin,
      lastHeaderY + 4,
      pageWidth - lineMargin,
      lastHeaderY + 4
    );
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("MARKS GRADE REPORT", pageWidth / 2, 52, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // 3. Use subjectDetails state (more efficient)
    doc.setFontSize(10);
    const subjectName = subjectDetails[selectedSubject.subject] || "";
    const infoRow = `Subject: ${subjectName || ""} (${selectedSubject.subject})   Semester: ${selectedSubject.semester}   Section: ${selectedSubject.section}`;
    doc.text(infoRow, pageWidth / 2, margin + 48, { align: "center" });

    const tableHead = [
      [
        "slno.",
        "USN",
        "Name",
        ...(fieldApplicability.CIE1 ? ["CIE1"] : []),
        ...(fieldApplicability.CIE2 ? ["CIE2"] : []),
        ...(fieldApplicability.CIE3 ? ["CIE3"] : []),
        ...(fieldApplicability.reducedCIE ? ["Reduced CIE"] : []),
        ...(fieldApplicability.assignmentMarks ? ["Assignment"] : []),
        ...(fieldApplicability.labMarks ? ["Lab Marks"] : []),
        ...(fieldApplicability.totalInternals ? ["Total Internals"] : []),
      ]
    ];

    const tableRows = students.map((student, index) => {
      const entry = marksData[student.id] || {};
      return [
        index + 1,
        student.id,
        student.name,
        ...(fieldApplicability.CIE1 ? [entry.CIE1 ?? ""] : []),
        ...(fieldApplicability.CIE2 ? [entry.CIE2 ?? ""] : []),
        ...(fieldApplicability.CIE3 ? [entry.CIE3 ?? ""] : []),
        ...(fieldApplicability.reducedCIE ? [entry.reducedCIE ?? ""] : []),
        ...(fieldApplicability.assignmentMarks ? [entry.assignmentMarks ?? ""] : []),
        ...(fieldApplicability.labMarks ? [entry.labMarks ?? ""] : []),
        ...(fieldApplicability.totalInternals ? [entry.totalInternals ?? ""] : []),
      ];
    });

    // 4. Define dynamic column styles
    const columnStyles = {
      0: { cellWidth: 15 }, // slno.
      1: { cellWidth: 35 }, // USN
      2: { cellWidth: 55 }, // Name
    };

    // 5. Add all updates to autoTable call
    autoTable(doc, {
      startY: 65,
      head: tableHead,
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 9, // Set font size
      },
      bodyStyles: {
        fontSize: 9, // Set font size
        halign: "center"
      },
      columnStyles: columnStyles, // Use dynamic styles
      margin: { left: 12, right: 12 }, // Set margin
      didDrawPage: function (data) { // Add border to every page
        doc.setDrawColor(180);
        doc.setLineWidth(0.4);
        doc.rect(margin, margin, boxWidth, doc.internal.pageSize.getHeight() - 2 * margin, "S");
      }
    });
    const fileName = `MarksGradeReport_${selectedSubject.subject}_${selectedSubject.section}.pdf`;
    doc.save(fileName);
  };

  // Logic from File 1
  const handleSubjectSelect = async (subject) => {
    setSelectedSubject(subject);
    setSubmitStatus(null);
    setIsMaxMarksSaved(false);
    setCurrentPage(1); // Reset page on new subject
  
    const q = query(
      collection(db, "students"),
      where("semester", "==", Number(subject.semester)),
      where("section", "==", subject.section)
    );
    const snapshot = await getDocs(q);
    const studentsList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setStudents(studentsList);
  
    const newMarksData = {};
    for (const student of studentsList) {
      const docId = `${student.id}_${subject.subject.trim()}`;
      const docRef = doc(db, "marks", docId);
      const docSnap = await getDoc(docRef);
      newMarksData[student.id] = docSnap.exists()
        ? {
          CIE1: docSnap.data().cieMarks?.CIE1, // Keep as-is (could be "", null, N/A, or number)
          CIE2: docSnap.data().cieMarks?.CIE2,
          CIE3: docSnap.data().cieMarks?.CIE3,
          assignmentMarks: docSnap.data().assignmentMarks,
          labMarks: docSnap.data().labMarks,
          reducedCIE: docSnap.data().reducedCIE,
          totalInternals: docSnap.data().totalInternals,
          maxMarks: docSnap.data().maxMarks ?? {},
        }
        : {
          CIE1: "",
          CIE2: "",
          CIE3: "",
          assignmentMarks: "",
          labMarks: "",
          reducedCIE: "",
          totalInternals: "",
          maxMarks: {},
        };
    }
    setMarksData(newMarksData);
    // Use first student's data to populate max marks, or empty if no students
    const firstStudentId = studentsList[0]?.id;
    if (firstStudentId && newMarksData[firstStudentId]) {
      setMaxMarks(newMarksData[firstStudentId].maxMarks || {});
      setReducedMax(newMarksData[firstStudentId].reducedMax ?? ""); // Load reducedMax
    } else {
      setMaxMarks({ CIE1: "", CIE2: "", CIE3: "", assignmentMarks: "", labMarks: "" });
      setReducedMax("");
    }
    setOriginalMarksData(JSON.parse(JSON.stringify(newMarksData)));
  };
  
  // Logic from File 1
  const handleMarkChange = (studentId, field, value) => {
    let rawVal = value === "" || value === "N/A" ? "" : value;
  
    // Parse the entered value as integer
    let valInt = parseInt(rawVal, 10);
  
    // Retrieve max allowed marks for this field
    const maxAllowed = maxMarks[field];
  
    // If max marks is defined and number, and entered value exceeds it
    if (
      maxAllowed !== "" &&
      maxAllowed !== undefined &&
      !isNaN(maxAllowed) &&
      !isNaN(valInt) &&
      valInt > maxAllowed
    ) {
      alert(`Marks entered (${valInt}) cannot be more than the maximum allowed (${maxAllowed}) for ${field}.`);
      // Do NOT update the state with invalid value; just return early.
      return;
    }
  
    // If value is empty or "N/A" or a valid number less than or equal maxAllowed, update state
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: valInt === undefined || isNaN(valInt) ? "" : valInt,
      },
    }));
  };

  // Logic from File 1 (with max mark check from File 2)
  const handleFillAll = (field, value) => {
    const val = value === "" ? "" : parseInt(value, 10);
    if (!isNaN(val) && maxMarks[field] && val > maxMarks[field]) {
        alert(`Marks (${val}) cannot exceed max marks (${maxMarks[field]}) for ${field}.`);
        return;
    }

    setMarksData((prev) => {
      const updated = { ...prev };
      for (const studentId of Object.keys(updated)) {
        updated[studentId] = { ...updated[studentId], [field]: val };
      }
      return updated;
    });
  };

  // Logic from File 1
  const toggleFieldApplicability = (field) => {
    const isActive = fieldApplicability[field];
    setFieldApplicability((prev) => ({ ...prev, [field]: !isActive }));
    setMarksData((prev) => {
      const updated = { ...prev };
      for (const studentId of Object.keys(updated)) {
        if(!updated[studentId]) updated[studentId] = {}; // Ensure student object exists
        updated[studentId][field] = isActive ? "N/A" : originalMarksData[studentId]?.[field] ?? 0;
      }
      return updated;
    });
  };

  // Logic from File 1, adapted for File 2's setSubmitStatus
  const saveMaxMarksToFirestore = async () => {
    const applicableFields = ["CIE1", "CIE2", "CIE3", "labMarks", "assignmentMarks"].filter(
      (field) => fieldApplicability[field]
    );
  
    const allFilled = applicableFields.every(
      (field) => maxMarks[field] !== undefined && maxMarks[field] !== "" && !isNaN(maxMarks[field])
    );
    const isReducedMaxValid = reducedMax !== "" && !isNaN(reducedMax);
  
    if (!allFilled || !isReducedMaxValid) {
      alert("Please enter max marks for all applicable fields and reduced CIE max marks before saving.");
      return;
    }
  
    try {
      for (const student of students) {
        const docId = `${student.id}_${selectedSubject.subject.trim()}`;
        const docRef = doc(db, "marks", docId);
  
        await setDoc(
          docRef,
          {
            maxMarks: Object.fromEntries(
              Object.entries(maxMarks)
                .map(([k, v]) => [k, v === "" ? "" : parseInt(v, 10)])
            ),
            reducedMax: parseInt(reducedMax, 10),
          },
          { merge: true }
        );
      }
  
      setSubmitStatus("Max marks saved successfully!"); // Use setSubmitStatus
      setIsMaxMarksSaved(true);
    } catch (error) {
      console.error("Error saving max marks:", error);
      setSubmitStatus("Failed to save max marks."); // Use setSubmitStatus
    }
  };

  // Logic from File 1
  const handleSubmit = async () => {
    if (!selectedSubject) return;
    setSubmitStatus("Saving marks..."); // Use setSubmitStatus
    try {
      const reducedMaxInt = safeInt(reducedMax);
  
      for (const student of students) {
        const markEntry = marksData[student.id] || {};
        const docId = `${student.id}_${selectedSubject.subject.trim()}`;
        const docRef = doc(db, "marks", docId);
        const updatePayload = {};
  
        const cieKeys = ["CIE1", "CIE2", "CIE3"].filter(k => fieldApplicability[k]);
        const cieMarks = {};
        cieKeys.forEach((key) => {
          cieMarks[key] = safeInt(markEntry[key]);
        });
        updatePayload.cieMarks = cieMarks;
  
        const assignmentVal = fieldApplicability.assignmentMarks ? safeInt(markEntry.assignmentMarks) : 0;
        const labVal = fieldApplicability.labMarks ? safeInt(markEntry.labMarks) : 0;
        updatePayload.assignmentMarks = fieldApplicability.assignmentMarks ? assignmentVal : "N/A";
        updatePayload.labMarks = fieldApplicability.labMarks ? labVal : "N/A";
  
        const cieTotal = cieKeys.reduce((sum, key) => sum + cieMarks[key], 0);
        const cieMax = cieKeys.reduce((sum, key) => sum + safeInt(maxMarks[key]), 0);
        const reducedCIE = (cieMax && reducedMaxInt) ? (cieTotal / cieMax) * reducedMaxInt : 0;
        updatePayload.reducedCIE = Math.round(reducedCIE);
        const totalInternals = Math.round(reducedCIE + assignmentVal + labVal);
        updatePayload.totalInternals = totalInternals;
  
        updatePayload.maxMarks = Object.fromEntries(
          Object.entries(maxMarks).map(([k, v]) => [k, v === "" ? "" : safeInt(v)])
        );

        // Add reducedMax to the payload
        updatePayload.reducedMax = reducedMaxInt;
  
        await setDoc(
          docRef,
          {
            ...updatePayload,
            rollNo: student.id,
            semester: selectedSubject.semester,
            subjectCode: selectedSubject.subject.trim(),
          },
          { merge: true }
        );
        setMarksData((prev) => ({
          ...prev,
          [student.id]: {
            ...prev[student.id],
            reducedCIE: Math.round(reducedCIE),
            totalInternals: totalInternals,
          }
        }));
  
      }
  
      setSubmitStatus("Marks updated successfully!");
    } catch (err) {
      console.error("Error updating marks:", err);
      setSubmitStatus("Error updating marks. Try again.");
    }
  };

  // UI logic from File 2
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // UI logic from File 2
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + studentsPerPage);

  // UI logic from File 2
  const visibleFields = [
    "CIE1", "CIE2", "CIE3", "labMarks", "assignmentMarks"
  ].filter(field => fieldApplicability[field]);

  // UI logic from File 2
  const handleKeyDown = (e, studentIndex, currentField) => {
    const { key } = e;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      return;
    }

    e.preventDefault(); 

    const currentFieldIndex = visibleFields.indexOf(currentField);
    let nextStudentIndex = studentIndex;
    let nextFieldIndex = currentFieldIndex;

    switch (key) {
      case "ArrowUp":
        if (studentIndex > 0) nextStudentIndex = studentIndex - 1;
        break;
      case "ArrowDown":
        if (studentIndex < currentStudents.length - 1) nextStudentIndex = studentIndex + 1;
        break;
      case "ArrowLeft":
        if (currentFieldIndex > 0) nextFieldIndex = currentFieldIndex - 1;
        break;
      case "ArrowRight":
        if (currentFieldIndex < visibleFields.length - 1) nextFieldIndex = currentFieldIndex + 1;
        break;
      default:
        return;
    }

    const nextField = visibleFields[nextFieldIndex];
    const nextStudentId = currentStudents[nextStudentIndex].id;

    if (nextField && nextStudentId) {
      const nextInputId = `input-${nextStudentId}-${nextField}`;
      const nextInput = document.getElementById(nextInputId);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };
  
  // UI logic from File 2
  const handleMaxMarksKeyDown = (e, currentField) => {
    const { key } = e;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      return;
    }

    e.preventDefault();

    if (key === "ArrowUp" || key === "ArrowDown") {
      return;
    }

    const visibleMaxMarksFields = [
      "CIE1", "CIE2", "CIE3", "assignmentMarks", "labMarks"
    ].filter(field => fieldApplicability[field]);
    visibleMaxMarksFields.push("reducedMax"); 

    const currentFieldIndex = visibleMaxMarksFields.indexOf(currentField);
    let nextFieldIndex = currentFieldIndex;

    switch (key) {
      case "ArrowLeft":
        if (currentFieldIndex > 0) nextFieldIndex = currentFieldIndex - 1;
        break;
      case "ArrowRight":
        if (currentFieldIndex < visibleMaxMarksFields.length - 1) nextFieldIndex = currentFieldIndex + 1;
        break;
      default:
        return;
    }

    if (nextFieldIndex === currentFieldIndex) return; 

    const nextField = visibleMaxMarksFields[nextFieldIndex];
    if (nextField) {
      const nextInputId = `max-marks-${nextField}`; 
      const nextInput = document.getElementById(nextInputId);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // UI from File 2
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".xlsx, .xls, .csv"
        />

        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaEdit /> Enter CIE Marks</h2>

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
                    if (selected) handleSubjectSelect({ ...selected, semester: Number(selected.semester) });
                }}
                defaultValue=""
                className="w-full max-w-lg p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
                <option value="" disabled>-- Choose a subject --</option>
                {assignedSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                        {subjectDetails[subj.subject] ?? "Loading..."} ({subj.subject}) - Sem {subj.semester} Sec {subj.section}
                    </option>
                ))}
            </select>
        </div>

        {selectedSubject && (
            <>
                {/* --- Step 2: Configure Fields & Max Marks --- */}
                <div className="border-t pt-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-3">
                        <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">2</span>
                        Configure Fields & Max Marks
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2 text-gray-600">Select Applicable Fields:</h4>
                            <div className="flex flex-wrap gap-2">
                                {[{ key: "CIE1", label: "CIE1" }, { key: "CIE2", label: "CIE2" }, { key: "CIE3", label: "CIE3" }, { key: "assignmentMarks", label: "Assignment" }, { key: "labMarks", label: "Lab" }].map(({ key, label }) => (
                                    <button key={key} onClick={() => toggleFieldApplicability(key)} className={`text-sm px-3 py-1.5 rounded-md text-white flex items-center gap-2 transition-colors ${fieldApplicability[key] ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 hover:bg-gray-500"}`}>
                                        {fieldApplicability[key] ? <Check size={16} /> : <X size={16} />} {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-600">Set Max Marks for Applicable Fields:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                                {[{ field: "CIE1", label: "CIE1" }, { field: "CIE2", label: "CIE2" }, { field: "CIE3", label: "CIE3" }, { field: "assignmentMarks", label: "Assignment" }, { field: "labMarks", label: "Lab" }].map(({ field, label }) =>
                                    fieldApplicability[field] && (
                                        <div key={field}>
                                            <label className="text-xs font-medium text-gray-500">{label}</label>
                                            <input 
                                                type="number" 
                                                id={`max-marks-${field}`}
                                                onKeyDown={(e) => handleMaxMarksKeyDown(e, field)}
                                                value={maxMarks[field] ?? ""} 
                                                onChange={(e) => { setMaxMarks({ ...maxMarks, [field]: e.target.value }); setIsMaxMarksSaved(false); }} 
                                                className="w-full border border-gray-300 p-2 rounded text-sm" 
                                                min={0} 
                                            />
                                        </div>
                                    )
                                )}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-medium text-gray-500">Reduced CIE</label>
                                    <input 
                                        type="number" 
                                        id="max-marks-reducedMax"
                                        onKeyDown={(e) => handleMaxMarksKeyDown(e, "reducedMax")}
                                        value={reducedMax} 
                                        onChange={(e) => { setReducedMax(e.target.value); setIsMaxMarksSaved(false); }} 
                                        placeholder="e.g. 25" 
                                        className="w-full border border-gray-300 p-2 rounded text-sm" 
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1 lg:col-span-1">
                                    <button onClick={saveMaxMarksToFirestore} className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                        <FaSave /> Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Step 3: Enter Student Marks --- */}
                <fieldset disabled={!isMaxMarksSaved} className={`border-t pt-6 ${!isMaxMarksSaved && "opacity-50"}`}>
                        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-3">
                            <span className="text-white bg-blue-600 rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">3</span>
                            Enter Student Marks
                        </h3>
                    {!isMaxMarksSaved && <p className="text-sm text-red-600 mb-4 font-semibold animate-pulse">You must save "Max Marks" in Step 2 to enable this section.</p>}

                        <div className="relative max-w-md mb-4">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search by Name or USN" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" disabled={!isMaxMarksSaved}/>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-white uppercase bg-blue-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">USN</th>
                                        <th scope="col" className="px-4 py-3">Name</th>
                                        {["CIE1", "CIE2", "CIE3"].map(cie => fieldApplicability[cie] && (
                                            <th key={cie} scope="col" className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{`${cie} (${maxMarks[cie] || "-"})`}</span>
                                                    <input type="number" placeholder="Fill All" onChange={(e) => handleFillAll(cie, e.target.value)} onWheel={(e) => e.target.blur()} className="w-20 text-xs p-1 border rounded text-gray-800" />
                                                </div>
                                            </th>
                                        ))}
                                        <th scope="col" className="px-4 py-3 text-center">{`Reduced CIE (${reducedMax || "-"})`}</th>
                                        {fieldApplicability.labMarks && (
                                            <th scope="col" className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{`Lab (${maxMarks.labMarks || "-"})`}</span>
                                                    <input type="number" placeholder="Fill All" onChange={(e) => handleFillAll("labMarks", e.target.value)} onWheel={(e) => e.target.blur()} className="w-20 text-xs p-1 border rounded text-gray-800" />
                                                </div>
                                            </th>
                                        )}
                                        {fieldApplicability.assignmentMarks && (
                                            <th scope="col" className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{`Assignment (${maxMarks.assignmentMarks || "-"})`}</span>
                                                    <input type="number" placeholder="Fill All" onChange={(e) => handleFillAll("assignmentMarks", e.target.value)} onWheel={(e) => e.target.blur()} className="w-20 text-xs p-1 border rounded text-gray-800" />
                                                </div>
                                            </th>
                                        )}
                                        <th scope="col" className="px-4 py-3 text-center">Total (50)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentStudents.map((student, studentIndex) => {
                                        const studentMarks = marksData[student.id] || {};
                                        return (
                                        <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">{student.id}</td>
                                            <td className="px-4 py-2">{student.name}</td>
                                            {["CIE1", "CIE2", "CIE3"].map(cie => fieldApplicability[cie] && (
                                                <td key={cie} className="p-1 border-x text-center">
                                                    <input 
                                                        type="number" 
                                                        id={`input-${student.id}-${cie}`}
                                                        onKeyDown={(e) => handleKeyDown(e, studentIndex, cie)}
                                                        value={studentMarks[cie] === "N/A" ? "" : studentMarks[cie] ?? ""} 
                                                        onChange={(e) => handleMarkChange(student.id, cie, e.target.value)} 
                                                        className="w-20 p-1 border rounded text-center"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-1 border-x text-center font-semibold">{studentMarks.reducedCIE ?? ""}</td>
                                            {fieldApplicability.labMarks && (
                                                <td className="p-1 border-x text-center">
                                                    <input 
                                                        type="number" 
                                                        id={`input-${student.id}-labMarks`}
                                                        onKeyDown={(e) => handleKeyDown(e, studentIndex, "labMarks")}
                                                        value={studentMarks.labMarks === "N/A" ? "" : studentMarks.labMarks ?? ""} 
                                                        onChange={(e) => handleMarkChange(student.id, "labMarks", e.target.value)} 
                                                        className="w-20 p-1 border rounded text-center"
                                                    />
                                                </td>
                                            )}
                                            {fieldApplicability.assignmentMarks && (
                                                <td className="p-1 border-x text-center">
                                                    <input 
                                                        type="number" 
                                                        id={`input-${student.id}-assignmentMarks`}
                                                        onKeyDown={(e) => handleKeyDown(e, studentIndex, "assignmentMarks")}
                                                        value={studentMarks.assignmentMarks === "N/A" ? "" : studentMarks.assignmentMarks ?? ""} 
                                                        onChange={(e) => handleMarkChange(student.id, "assignmentMarks", e.target.value)} 
                                                        className="w-20 p-1 border rounded text-center"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-1 border-x text-center font-bold text-blue-700">{studentMarks.totalInternals ?? ""}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredStudents.length === 0 && <p className="text-center text-gray-500 py-10">No students found for this class.</p>}
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                            <div className="flex flex-wrap gap-4">
                                <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition">
                                    <FaSave /> Save Marks
                                </button>
                                <button onClick={downloadReportAsPDF} className="flex items-center gap-2 bg-red-600 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700 transition">
                                    <FaFilePdf /> Download PDF
                                </button>
                                <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2 rounded-md hover:bg-green-700 transition">
                                    <FaFileExcel /> Export Excel
                                </button>
                                <button 
                                  onClick={handleImportClick} 
                                  className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-md hover:bg-emerald-700 transition"
                                >
                                    <FaFileImport /> Import Excel
                                </button>
                            </div>
                            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                        </div>
                        
                        {submitStatus && (
                          <div className="flex justify-center items-center mt-4">
                            {submitStatus === "Saving marks..." ? (
                              // Loading state: Spinner + Text
                              <div className="flex items-center justify-center gap-2 p-2 bg-blue-100 text-blue-800 rounded-md font-semibold text-sm">
                                <div className="w-4 h-4 border-2 border-t-transparent border-blue-800 rounded-full animate-spin"></div>
                                <span>Saving marks...</span>
                              </div>
                            ) : (
                              // Success or Error state: Just Text
                              <p className={`font-semibold text-center rounded-md p-2 ${submitStatus.includes("success") ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {submitStatus}
                              </p>
                            )}
                          </div>
                        )}
                        
                </fieldset>
            </>
        )}
    </div>
  );
}