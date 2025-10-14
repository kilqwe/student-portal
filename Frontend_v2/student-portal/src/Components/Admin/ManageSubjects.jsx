import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import { db } from "../../firebase";
import {
  getDocs,
  collection,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import Pagination from "../helpers/Pagination";
import { FaSearch, FaTrash, FaChalkboardTeacher, FaBook, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const Icon = isSuccess ? FaCheckCircle : FaExclamationTriangle;
    const colorClasses = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
    return (
      <div className={`p-3 rounded-md mb-6 flex items-center gap-3 text-sm font-semibold ${colorClasses}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};


const ManageSubjects = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [subject, setSubject] = useState(null);
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teacherSnapshot, subjectSnapshot, assignmentSnapshot] =
          await Promise.all([
            getDocs(collection(db, "teachers")),
            getDocs(collection(db, "subjects")),
            getDocs(collection(db, "teachingAssignments")),
          ]);

        setTeachers(
          teacherSnapshot.docs.map((doc) => ({
            value: doc.id,
            label: `${doc.data().name} (${doc.id})`,
            ...doc.data(),
          }))
        );

        setSubjects(
          subjectSnapshot.docs.map((doc) => ({
            value: doc.id,
            label: `${doc.data().name} (${doc.id})`,
            name: doc.data().name,
          }))
        );

        setAssignments(
          assignmentSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error("Error fetching data: ", error);
        displayMessage("Failed to load data.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const filteredAssignments = useMemo(() => 
    assignments.filter((assign) => {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        assign.teacherName?.toLowerCase().includes(lowerSearch) ||
        assign.employeeId?.toLowerCase().includes(lowerSearch) ||
        assign.subject?.toLowerCase().includes(lowerSearch) ||
        assign.semester?.toString().includes(lowerSearch) ||
        assign.section?.toLowerCase().includes(lowerSearch)
      );
    }), [assignments, searchTerm]);

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAssignments = filteredAssignments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const displayMessage = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacher || !subject || !semester || !section) {
      displayMessage("Please fill in all fields.", "error");
      return;
    }

    try {
      const docId = `${teacher.value}_${subject.value}_${semester}_${section}`;
      const newAssignment = {
        employeeId: teacher.value,
        teacherName: teacher.label.split(" (")[0],
        subject: subject.value,
        semester: Number(semester),
        section,
        department: "CSE",
      };

      await setDoc(doc(db, "teachingAssignments", docId), newAssignment);

      displayMessage("Assignment added successfully!");
      
      setAssignments(prev => [...prev, { id: docId, ...newAssignment }]);
      
      setTeacher(null);
      setSubject(null);
      setSemester("");
      setSection("");
    } catch (error) {
      console.error("Error adding assignment: ", error);
      displayMessage("Failed to add assignment. Please try again.", "error");
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await deleteDoc(doc(db, "teachingAssignments", assignmentId));
      displayMessage("Assignment deleted successfully!");
      setAssignments(assignments.filter(assign => assign.id !== assignmentId));
    } catch (error) {
      console.error("Error deleting assignment: ", error);
      displayMessage("Failed to delete assignment.", "error");
    }
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  const selectStyles = {
    control: (provided) => ({ ...provided, minHeight: '42px' }),
  };

  return (
    <div className="space-y-8">
      {/* --- ASSIGN TEACHER FORM CARD --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaChalkboardTeacher /> Assign Teacher to Subject</h2>
        
        <StatusMessage message={message} type={messageType} />

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Teacher</label>
              <Select options={teachers} value={teacher} onChange={setTeacher} placeholder="Select a teacher..." styles={selectStyles} />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Subject</label>
              <Select options={subjects} value={subject} onChange={setSubject} placeholder="Select a subject..." styles={selectStyles} />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-[42px]">
                <option value="" disabled>Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-[42px]">
                <option value="" disabled>Select Section</option>
                {["A", "B", "C"].map((sec) => (<option key={sec} value={sec}>{sec}</option>))}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <button type="submit" className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-sm">
              Assign Teacher
            </button>
          </div>
        </form>
      </div>

      {/* --- EXISTING ASSIGNMENTS CARD --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <div className="hidden md:block w-64"></div> {/* Invisible spacer */}
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 justify-center"><FaBook /> Existing Assignments</h3>
            <div className="relative mt-4 md:mt-0 w-full md:w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className="text-xs text-white uppercase bg-blue-600">
                    <tr>
                        <th scope="col" className="px-6 py-3">Teacher</th>
                        <th scope="col" className="px-6 py-3">Subject</th>
                        <th scope="col" className="px-6 py-3">Sem & Sec</th>
                        <th scope="col" className="px-6 py-3">Department</th>
                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentAssignments.map((assign) => {
                        const subjectDetails = subjects.find(sub => sub.value === assign.subject);
                        const subjectName = subjectDetails?.name || "Unknown";
                        const subjectCode = subjectDetails?.value || assign.subject;

                        return (
                            <tr key={assign.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{assign.teacherName} <span className="text-gray-500">({assign.employeeId})</span></td>
                                <td className="px-6 py-4">{subjectName} ({subjectCode})</td>
                                <td className="px-6 py-4">{assign.semester} {assign.section}</td>
                                <td className="px-6 py-4">{assign.department}</td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleDelete(assign.id)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete Assignment"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredAssignments.length === 0 && (
                        <tr>
                            <td colSpan="5" className="text-center py-10 text-gray-500">
                                No assignments found.
                            </td>
                        </tr>
                    )}
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
      </div>
    </div>
  );
};

export default ManageSubjects;