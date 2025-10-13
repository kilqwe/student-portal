import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, query, where,
} from "firebase/firestore";
import Pagination from "../helpers/Pagination";
import { FaUpload, FaUserEdit, FaUserSlash, FaFileExcel, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type, errors = [] }) => {
    if (!message) return null;
    let bgColor, textColor, Icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; Icon = FaCheckCircle;
            break;
        case 'error':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; Icon = FaExclamationTriangle;
            break;
        default:
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; Icon = FaInfoCircle;
    }
  
    return (
      <div className={`p-4 rounded-md mt-4 flex flex-col gap-3 text-sm font-semibold ${bgColor} ${textColor}`}>
        <div className="flex items-center gap-3">
            <Icon />
            <span>{message}</span>
        </div>
        {errors.length > 0 && (
            <div className="mt-2 pl-8 border-l-2 border-red-300">
                <h4 className="font-bold mb-1">Error Details:</h4>
                <ul className="list-disc list-inside text-xs font-normal space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((err, i) => (<li key={i}>{err.email}: {err.error}</li>))}
                </ul>
            </div>
        )}
      </div>
    );
};


const UploadStudents = () => {
    const [activeTab, setActiveTab] = useState('upload');
    // ... all other state variables remain unchanged
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState("info");
    const [errors, setErrors] = useState([]);
    const semList = [1, 2, 3, 4, 5, 6, 7, 8];
    const sectionList = ["A", "B", "C"];
    const STUDENTS_PER_PAGE = 10;
    const [updateSelectedSem, setUpdateSelectedSem] = useState("");
    const [updateSelectedSection, setUpdateSelectedSection] = useState("");
    const [updateSemStudents, setUpdateSemStudents] = useState([]);
    const [updateCheckedStudents, setUpdateCheckedStudents] = useState([]);
    const [updateSelectAll, setUpdateSelectAll] = useState(false);
    const [newSem, setNewSem] = useState("");
    const [updateCurrentPage, setUpdateCurrentPage] = useState(1);
    const [deleteSelectedSem, setDeleteSelectedSem] = useState("");
    const [deleteSelectedSection, setDeleteSelectedSection] = useState("");
    const [deleteSemStudents, setDeleteSemStudents] = useState([]);
    const [deleteCheckedStudents, setDeleteCheckedStudents] = useState([]);
    const [deleteSelectAll, setDeleteSelectAll] = useState(false);
    const [deletionConfirmed, setDeletionConfirmed] = useState(false);
    const [deleteCurrentPage, setDeleteCurrentPage] = useState(1);

    // Helper to show styled messages
    const showMessage = (msg, type = "info", errs = [], duration = 5000) => {
        setStatus(msg);
        setStatusType(type);
        setErrors(errs);
        if (duration) {
            setTimeout(() => {
                setStatus("");
                setErrors([]);
            }, duration);
        }
    };

    // --- All useEffect and handler logic remains the same, just with updated messaging ---
    useEffect(() => {
        if (!updateSelectedSem) { setUpdateSemStudents([]); return; }
        const fetchStudents = async () => { /* ... logic unchanged ... */ };
        fetchStudents();
    }, [updateSelectedSem, updateSelectedSection]);

    useEffect(() => {
        if (!deleteSelectedSem) { setDeleteSemStudents([]); return; }
        const fetchStudents = async () => { /* ... logic unchanged ... */ };
        fetchStudents();
    }, [deleteSelectedSem, deleteSelectedSection]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus("");
        setErrors([]);
    };

    const handleUpload = async () => {
        if (!file) return showMessage("Please select an Excel file.", "error");
        showMessage("Uploading and processing...", "info", [], null); // No timeout
        // ... all file processing logic is unchanged
        // On success: showMessage(`Upload completed: ${successCount} processed, ${failed.length} failed.`, "success", failed);
        // On failure: showMessage("Upload failed: " + err.message, "error");
    };

    const handleUpdateSemester = async () => {
        if (updateCheckedStudents.length === 0 || newSem === "") return showMessage("Please select students and a new semester.", "error");
        if (Number(newSem) > 8 || Number(newSem) < 1) return showMessage("Semester must be between 1 and 8.", "error");
        try {
            // ... update logic is unchanged
            showMessage(`Updated ${updateCheckedStudents.length} students to semester ${newSem}`, "success");
            // ... reset state
        } catch (err) {
            showMessage("Update failed: " + err.message, "error");
        }
    };
    
    const handleDeleteStudents = async () => {
        if (!deletionConfirmed) return showMessage("Please confirm deletion by checking the box.", "error");
        if (deleteCheckedStudents.length === 0) return showMessage("Please select at least one student to delete.", "error");
        if (!window.confirm(`Are you sure you want to permanently delete ${deleteCheckedStudents.length} students and all their related data? This action cannot be undone.`)) return;
        
        showMessage(`Deleting ${deleteCheckedStudents.length} students... This may take a moment.`, "info", [], null);
        try {
            // ... deletion logic is unchanged
            showMessage(`Successfully deleted ${deleteCheckedStudents.length} students and their related data.`, "success");
            // ... reset state
        } catch (err) {
            showMessage(`Deletion failed: ${err.message}`, "error");
        }
    };
    
    // All other helper functions (toggles, pagination logic) remain unchanged
    const toggleUpdateStudentCheck = (id) => { /* ... */ };
    const toggleUpdateSelectAll = (checked) => { /* ... */ };
    const toggleDeleteStudentCheck = (id) => { /* ... */ };
    const toggleDeleteSelectAll = (checked) => { /* ... */ };
    const deleteStudentMarks = async (studentId) => { /* ... */ };

    const totalUpdatePages = Math.ceil(updateSemStudents.length / STUDENTS_PER_PAGE);
    const paginatedUpdateStudents = updateSemStudents.slice((updateCurrentPage - 1) * STUDENTS_PER_PAGE, updateCurrentPage * STUDENTS_PER_PAGE);
    const totalDeletePages = Math.ceil(deleteSemStudents.length / STUDENTS_PER_PAGE);
    const paginatedDeleteStudents = deleteSemStudents.slice((deleteCurrentPage - 1) * STUDENTS_PER_PAGE, deleteCurrentPage * STUDENTS_PER_PAGE);


    const TabButton = ({ tabName, label, icon: Icon }) => (
        <button
          onClick={() => setActiveTab(tabName)}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-lg border-b-4 transition-colors ${
            activeTab === tabName
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon /> {label}
        </button>
    );

    return (
        <div className="space-y-8">
            <div className="flex border-b border-gray-200">
                <TabButton tabName="upload" label="Upload New Students" icon={FaUpload} />
                <TabButton tabName="update" label="Update Semesters" icon={FaUserEdit} />
                <TabButton tabName="delete" label="Delete Students" icon={FaUserSlash} />
            </div>

            <StatusMessage message={status} type={statusType} errors={errors} />

            {/* --- UPLOAD TAB --- */}
            {activeTab === 'upload' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Students via Excel</h2>
                    <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6 rounded-r-lg text-sm">
                        <div className="flex items-start"><FaInfoCircle className="h-5 w-5 mr-3 mt-1 flex-shrink-0" />
                            <div><p className="font-bold">Instructions:</p>
                                <p>Upload an `.xlsx` or `.xls` file with columns for: `Document ID` (USN), `email`, `name`, `semester`, `section`, etc.</p>
                                <p>The system will create new students or update existing ones based on the `Document ID`.</p>
                            </div>
                        </div>
                    </div>
                    <input type="file" id="student-file-upload" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="student-file-upload" className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue-600 rounded-lg shadow-sm border-2 border-dashed border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition">
                        <FaFileExcel className="w-10 h-10 mb-3" />
                        <span className="text-base font-semibold">{file ? `Selected: ${file.name}` : "Click to select an Excel file"}</span>
                    </label>
                    <button onClick={handleUpload} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">Upload File</button>
                </div>
            )}

            {/* --- UPDATE TAB --- */}
            {activeTab === 'update' && (
                 <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Update Student Semesters</h2>
                    <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-gray-50 p-4 rounded-lg">
                        <select value={updateSelectedSem} onChange={(e) => setUpdateSelectedSem(e.target.value)} className="w-full md:w-auto p-2 border border-gray-300 rounded-md">
                            <option value="">Filter by Semester</option>
                            {semList.map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
                        </select>
                        <select value={updateSelectedSection} onChange={(e) => setUpdateSelectedSection(e.target.value)} className="w-full md:w-auto p-2 border border-gray-300 rounded-md">
                            <option value="">Filter by Section</option>
                            {sectionList.map((section) => (<option key={section} value={section}>{section}</option>))}
                        </select>
                        <div className="flex-grow"></div>
                        <input type="number" value={newSem} onChange={(e) => setNewSem(e.target.value)} placeholder="New Semester" className="w-full md:w-48 p-2 border border-gray-300 rounded-md" min={1} max={8} />
                        <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold" onClick={handleUpdateSemester}>Update Selected</button>
                    </div>
                    {updateSemStudents.length > 0 && (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-700">
                                    <thead className="text-xs text-white uppercase bg-blue-600">
                                        <tr>
                                            <th scope="col" className="p-4"><input type="checkbox" checked={updateSelectAll} onChange={(e) => toggleUpdateSelectAll(e.target.checked)} /></th>
                                            <th scope="col" className="px-6 py-3">USN</th><th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Email</th><th scope="col" className="px-6 py-3">Section</th><th scope="col" className="px-6 py-3">Semester</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUpdateStudents.map((s) => (
                                            <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="w-4 p-4"><input type="checkbox" checked={updateCheckedStudents.includes(s.id)} onChange={() => toggleUpdateStudentCheck(s.id)} /></td>
                                                <td className="px-6 py-4 font-medium">{s.id}</td><td className="px-6 py-4">{s.name}</td><td className="px-6 py-4">{s.email}</td><td className="px-6 py-4">{s.section}</td><td className="px-6 py-4">{s.semester}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalUpdatePages > 1 && (<div className="flex justify-center mt-4"><Pagination currentPage={updateCurrentPage} totalPages={totalUpdatePages} onPageChange={setUpdateCurrentPage} /></div>)}
                        </div>
                    )}
                </div>
            )}
            
            {/* --- DELETE TAB --- */}
{activeTab === 'delete' && (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-red-700">Delete Students</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-red-50 p-4 rounded-lg">
            <select value={deleteSelectedSem} onChange={(e) => setDeleteSelectedSem(e.target.value)} className="w-full md:w-auto p-2 border-gray-300 rounded-md">
                <option value="">Filter by Semester</option>
                {semList.map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
            </select>
            <select value={deleteSelectedSection} onChange={(e) => setDeleteSelectedSection(e.target.value)} className="w-full md:w-auto p-2 border-gray-300 rounded-md">
                <option value="">Filter by Section</option>
                {sectionList.map((section) => (<option key={section} value={section}>{section}</option>))}
            </select>
        </div>

        {deleteSemStudents.length > 0 && (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-white uppercase bg-red-600">
                        <tr>
                            <th scope="col" className="p-4"><input type="checkbox" checked={deleteSelectAll} onChange={(e) => toggleDeleteSelectAll(e.target.checked)} /></th>
                            <th scope="col" className="px-6 py-3">USN</th><th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Email</th><th scope="col" className="px-6 py-3">Section</th><th scope="col" className="px-6 py-3">Semester</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedDeleteStudents.map((s) => (
                            <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="w-4 p-4"><input type="checkbox" checked={deleteCheckedStudents.includes(s.id)} onChange={() => toggleDeleteStudentCheck(s.id)} /></td>
                                <td className="px-6 py-4 font-medium">{s.id}</td><td className="px-6 py-4">{s.name}</td><td className="px-6 py-4">{s.email}</td><td className="px-6 py-4">{s.section}</td><td className="px-6 py-4">{s.semester}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {deleteSemStudents.length === 0 && deleteSelectedSem && (
             <p className="text-center text-gray-500 py-10">No students found for the selected filter.</p>
        )}

        {totalDeletePages > 1 && (<div className="flex justify-center mt-4"><Pagination currentPage={deleteCurrentPage} totalPages={totalDeletePages} onPageChange={setDeleteCurrentPage} /></div>)}
        
        {/* ✅ CORRECTED DELETE ACTION AREA */}
        <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 rounded-r-lg flex flex-col md:flex-row items-center gap-4">
            <label className="flex-grow font-semibold text-red-800">
                <input type="checkbox" checked={deletionConfirmed} onChange={(e) => setDeletionConfirmed(e.target.checked)} className="mr-2 h-4 w-4 accent-red-600" />
                I understand this will permanently delete the students and all their related data.
            </label>
            <button 
                disabled={!deletionConfirmed || deleteCheckedStudents.length === 0} 
                className={`w-full md:w-auto px-6 py-2 rounded-md font-bold text-white transition flex items-center justify-center gap-2 ${
                    (deletionConfirmed && deleteCheckedStudents.length > 0) 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-gray-400 cursor-not-allowed"
                }`} 
                onClick={handleDeleteStudents}
            >
                <FaUserSlash />
                Delete Selected ({deleteCheckedStudents.length})
            </button>
        </div>
    </div>
)}
        </div>
    );
};

export default UploadStudents;