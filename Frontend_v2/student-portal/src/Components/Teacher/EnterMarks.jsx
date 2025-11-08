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
// <-- 1. IMPORT REMOVED

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
  const [fieldApplicability, setFieldApplicability] = useState({
    CIE1: true,
    CIE2: true,
    CIE3: true,
    assignmentMarks: true,
    labMarks: true,
  });

  const fileInputRef = useRef(null);

  function safeInt(value) {
    if (value === null || value === undefined || value === "" || value === "N/A") return 0;
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : n;
  }

  const [maxMarks, setMaxMarks] = useState({
    CIE1: "", CIE2: "", CIE3: "", assignmentMarks: "", labMarks: "",
  });
  const [subjectDetails, setSubjectDetails] = useState({});

  useEffect(() => {
    if (submitStatus) {
      // Keep the timer, but only clear success/error messages, not the loading one
      if (submitStatus !== "Saving marks...") {
        const timer = setTimeout(() => setSubmitStatus(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [submitStatus]);
  
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

  const exportToExcel = () => {
    if (!selectedSubject || students.length === 0) return;

    const headers = [
      "slno.", "USN", "Name",
      ...(fieldApplicability.CIE1 ? ["CIE1"] : []),
      ...(fieldApplicability.CIE2 ? ["CIE2"] : []),
      ...(fieldApplicability.CIE3 ? ["CIE3"] : []),
      ["Reduced CIE"],
      ...(fieldApplicability.assignmentMarks ? ["Assignment"] : []),
      ...(fieldApplicability.labMarks ? ["Lab Marks"] : []),
      ["Total Internals"],
    ];

    const data = students.map((student, index) => {
        const entry = marksData[student.id] || {};
        return [
          index + 1, student.id, student.name,
          ...(fieldApplicability.CIE1 ? [entry.CIE1 ?? ""] : []),
          ...(fieldApplicability.CIE2 ? [entry.CIE2 ?? ""] : []),
          ...(fieldApplicability.CIE3 ? [entry.CIE3 ?? ""] : []),
          [entry.reducedCIE ?? ""],
          ...(fieldApplicability.assignmentMarks ? [entry.assignmentMarks ?? ""] : []),
          ...(fieldApplicability.labMarks ? [entry.labMarks ?? ""] : []),
          [entry.totalInternals ?? ""],
        ];
    });
    
    const worksheetData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const fileName = `MarksGradeReport_${selectedSubject.subject}_${selectedSubject.section}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

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

  const downloadReportAsPDF = async () => {
    if (!selectedSubject || students.length === 0) return;
    const doc = new jsPDF();
    // ... PDF generation logic remains unchanged ...
  };

  const handleSubjectSelect = async (subject) => {
    setSelectedSubject(subject);
    setSubmitStatus(null);
    setIsMaxMarksSaved(false);
    setCurrentPage(1);

    const q = query(collection(db, "students"), where("semester", "==", subject.semester), where("section", "==", subject.section));
    const snapshot = await getDocs(q);
    const studentsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStudents(studentsList);

    const newMarksData = {};
    for (const student of studentsList) {
      const docId = `${student.id}_${subject.subject.trim()}`;
      const docRef = doc(db, "marks", docId);
      const docSnap = await getDoc(docRef);
      newMarksData[student.id] = docSnap.exists() ? {
          CIE1: docSnap.data().cieMarks?.CIE1,
          CIE2: docSnap.data().cieMarks?.CIE2,
          CIE3: docSnap.data().cieMarks?.CIE3,
          assignmentMarks: docSnap.data().assignmentMarks,
          labMarks: docSnap.data().labMarks,
          reducedCIE: docSnap.data().reducedCIE,
          totalInternals: docSnap.data().totalInternals,
          maxMarks: docSnap.data().maxMarks ?? {},
        } : { CIE1: "", CIE2: "", CIE3: "", assignmentMarks: "", labMarks: "", reducedCIE: "", totalInternals: "", maxMarks: {} };
    }
    setMarksData(newMarksData);
    const firstStudentId = studentsList[0]?.id;
    if (firstStudentId && newMarksData[firstStudentId]) {
        setMaxMarks(newMarksData[firstStudentId].maxMarks || {});
    } else {
        setMaxMarks({ CIE1: "", CIE2: "", CIE3: "", assignmentMarks: "", labMarks: "" });
    }
    setOriginalMarksData(JSON.parse(JSON.stringify(newMarksData)));
  };

  const handleMarkChange = (studentId, field, value) => {
    let rawVal = value === "" || value === "N/A" ? "" : value;
    let valInt = parseInt(rawVal, 10);
    const maxAllowed = maxMarks[field];

    if (maxAllowed !== "" && maxAllowed !== undefined && !isNaN(maxAllowed) && !isNaN(valInt) && valInt > maxAllowed) {
      alert(`Marks (${valInt}) cannot exceed max marks (${maxAllowed}) for ${field}.`);
      return;
    }

    setMarksData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: isNaN(valInt) ? "" : valInt },
    }));
  };

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
  
  const toggleFieldApplicability = (field) => {
    const isActive = fieldApplicability[field];
    setFieldApplicability((prev) => ({ ...prev, [field]: !isActive }));
    setMarksData((prev) => {
      const updated = { ...prev };
      for (const studentId of Object.keys(updated)) {
          if(!updated[studentId]) updated[studentId] = {};
          updated[studentId][field] = isActive ? "N/A" : originalMarksData[studentId]?.[field] ?? "";
      }
      return updated;
    });
  };

  const saveMaxMarksToFirestore = async () => {
    const applicableFields = ["CIE1", "CIE2", "CIE3", "labMarks", "assignmentMarks"].filter((field) => fieldApplicability[field]);
    const allFilled = applicableFields.every((field) => maxMarks[field] !== "" && !isNaN(maxMarks[field]));
    const isReducedMaxValid = reducedMax !== "" && !isNaN(reducedMax);

    if (!allFilled || !isReducedMaxValid) {
      alert("Please enter valid numbers for all applicable max marks fields and for the Reduced CIE max marks before saving.");
      return;
    }

    try {
      for (const student of students) {
        const docId = `${student.id}_${selectedSubject.subject.trim()}`;
        const docRef = doc(db, "marks", docId);
        await setDoc(docRef, {
            maxMarks: Object.fromEntries(Object.entries(maxMarks).map(([k, v]) => [k, v === "" ? "" : parseInt(v, 10)])),
            reducedMax: parseInt(reducedMax, 10),
          }, { merge: true });
      }
      setSubmitStatus("Max marks saved successfully!");
      setIsMaxMarksSaved(true);
    } catch (error) {
      console.error("Error saving max marks:", error);
      setSubmitStatus("Failed to save max marks.");
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;
    setSubmitStatus("Saving marks...");
    try {
      const reducedMaxInt = safeInt(reducedMax);
      for (const student of students) {
        const markEntry = marksData[student.id] || {};
        const docId = `${student.id}_${selectedSubject.subject.trim()}`;
        const docRef = doc(db, "marks", docId);
        
        const cieKeys = ["CIE1", "CIE2", "CIE3"].filter((k) => fieldApplicability[k]);
        const cieMarks = {};
        cieKeys.forEach((key) => { cieMarks[key] = safeInt(markEntry[key]); });
        
        const assignmentVal = fieldApplicability.assignmentMarks ? safeInt(markEntry.assignmentMarks) : 0;
        const labVal = fieldApplicability.labMarks ? safeInt(markEntry.labMarks) : 0;
        
        const cieTotal = cieKeys.reduce((sum, key) => sum + cieMarks[key], 0);
        const cieMax = cieKeys.reduce((sum, key) => sum + safeInt(maxMarks[key]), 0);
        
        const reducedCIE = cieMax > 0 && reducedMaxInt > 0 ? (cieTotal / cieMax) * reducedMaxInt : 0;
        const totalInternals = Math.round(reducedCIE + assignmentVal + labVal);

        const updatePayload = {
            cieMarks: cieMarks,
            assignmentMarks: fieldApplicability.assignmentMarks ? assignmentVal : "N/A",
            labMarks: fieldApplicability.labMarks ? labVal : "N/A",
            reducedCIE: Math.round(reducedCIE),
            totalInternals: totalInternals,
            rollNo: student.id,
            semester: selectedSubject.semester,
            subjectCode: selectedSubject.subject.trim(),
        };

        await setDoc(docRef, updatePayload, { merge: true });

        setMarksData((prev) => ({
          ...prev,
          [student.id]: {
            ...prev[student.id],
            reducedCIE: Math.round(reducedCIE),
            totalInternals: totalInternals,
          },
        }));
      }
      setSubmitStatus("Marks updated successfully!");
    } catch (err) {
      console.error("Error updating marks:", err);
      setSubmitStatus("Error updating marks. Please try again.");
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + studentsPerPage);

  const visibleFields = [
    "CIE1", "CIE2", "CIE3", "labMarks", "assignmentMarks"
  ].filter(field => fieldApplicability[field]);

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
                                        placeholder="e.g. 50" 
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
                        
                        {/* --- 2. MODIFIED STATUS BLOCK --- */}
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