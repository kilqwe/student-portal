import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { FaFileUpload, FaFileExcel, FaInfoCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const Icon = isSuccess ? FaCheckCircle : FaTimesCircle;
    const colorClasses = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
    return (
      <div className={`p-4 rounded-md mt-4 flex items-center gap-3 text-sm font-semibold ${colorClasses}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};


export default function UpdateSeeMarks() {
  const [uploadStatus, setUploadStatus] = useState("");
  const [statusType, setStatusType] = useState("info"); // 'info', 'success', 'error'
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const normalizeStr = (str) => str?.toString().toUpperCase().trim();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus("Processing file...");
    setStatusType("info");
    setProgress(10); // Initial progress

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

        if (rawRows.length === 0) {
          setUploadStatus("Excel sheet is empty or improperly formatted.");
          setStatusType("error");
          return;
        }

        const headerKeys = Object.keys(rawRows[0]);
        const usnKey = headerKeys.find((h) => h.toLowerCase().includes("usn"));
        const subjectKey = headerKeys.find((h) => h.toLowerCase().includes("subject"));
        const seeKey = headerKeys.find((h) => h.toLowerCase().includes("see"));

        if (!usnKey || !subjectKey || !seeKey) {
          setUploadStatus("Required headers missing (USN, SubjectCode, SEE_Marks).");
          setStatusType("error");
          return;
        }

        setUploadStatus("Fetching database records...");
        setProgress(30);
        const marksSnapshot = await getDocs(collection(db, "marks"));
        const marksDocs = marksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUploadStatus("Matching records and preparing updates...");
        setProgress(50);
        const batch = writeBatch(db);
        let updatedCount = 0;

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const USN = normalizeStr(row[usnKey]);
          const SubjectCode = normalizeStr(row[subjectKey]).replace(/\s+/g, "");
          const SEE = parseInt(row[seeKey], 10);

          if (!USN || !SubjectCode || isNaN(SEE)) {
            console.warn("Skipping invalid row:", row);
            continue;
          }

          const matchedDoc = marksDocs.find(
            (doc) =>
              normalizeStr(doc.rollNo) === USN &&
              normalizeStr(doc.subjectCode).replace(/\s+/g, "") === SubjectCode
          );

          if (!matchedDoc) {
            console.warn(`No matching document found for USN: ${USN}, Subject: ${SubjectCode}`);
            continue;
          }

          const markDocRef = doc(db, "marks", matchedDoc.id);
          batch.set(markDocRef, { see: SEE }, { merge: true });
          updatedCount++;
          setProgress(50 + Math.round(((i + 1) / rawRows.length) * 40));
        }

        if (updatedCount === 0) {
          setUploadStatus("No matching records found in the database to update.");
          setStatusType("error");
          return;
        }

        setUploadStatus("Committing changes to database...");
        setProgress(95);
        await batch.commit();

        setProgress(100);
        setUploadStatus(`SEE marks updated successfully for ${updatedCount} records.`);
        setStatusType("success");

        setTimeout(() => {
          setFileName("");
          setUploadStatus("");
          setProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }, 4000);
      } catch (error) {
        console.error("Error updating SEE marks:", error);
        setUploadStatus("Error updating SEE marks. See console for details.");
        setStatusType("error");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleLabelClick = () => {
    // Trigger the hidden file input
    fileInputRef.current.click();
  };

  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-3 justify-center">
                <FaFileUpload /> Upload SEE Marks
            </h2>
            <p className="text-sm text-gray-500 mb-6 flex items-center justify-center">
                Upload an Excel file to bulk-update the SEE (Semester End Examination) marks for students.
            </p>

            {/* Instructions Box */}
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6 rounded-r-lg">
                <div className="flex items-start">
                    <FaInfoCircle className="h-5 w-5 mr-3 mt-1 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Excel File Requirements</p>
                        <p className="text-sm">
                            1. The file must be in `.xlsx` or `.xls` format.
                        </p>
                        <p className="text-sm">
                            2. It must contain columns with headers that include: `USN`, `SubjectCode`, and `SEE_Marks`.
                        </p>
                         <p className="text-sm">
                            3. The system will match records based on USN and Subject Code.
                        </p>
                    </div>
                </div>
            </div>

            {/* File Upload Area */}
            <div className="space-y-4">
                <input
                    type="file"
                    id="file-upload"
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden" // The actual input is hidden
                />

                {/* This is the visible, styled upload button/area */}
                <label
                    htmlFor="file-upload"
                    className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue-600 rounded-lg shadow-sm tracking-wide border-2 border-dashed border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition"
                >
                    <FaFileExcel className="w-10 h-10 mb-3" />
                    <span className="text-base font-semibold">
                        {fileName ? `Selected: ${fileName}` : "Click to select an Excel file"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                        or drag and drop
                    </span>
                </label>
            </div>
            
            {/* Progress and Status Display */}
            {(uploadStatus || progress > 0) && (
                <div className="mt-6">
                    {progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}
                    <StatusMessage message={uploadStatus} type={statusType} />
                </div>
            )}
        </div>
    </div>
  );
}