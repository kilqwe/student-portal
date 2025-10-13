import React, { useEffect, useState, useMemo } from "react";
import { FaSearch, FaUserPlus, FaTrash, FaUsers } from "react-icons/fa";
import { collection, getDocs, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Select from "react-select";
import Pagination from "../helpers/Pagination"; 

export default function Mentor() {
    // --- STATE MANAGEMENT (No changes to logic) ---
    const [mentorCurrentPage, setMentorCurrentPage] = useState(1);
    const [studentPages, setStudentPages] = useState({});
    const mentorsPerPage = 3;
    const studentsPerPage = 10; 
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [mentorships, setMentorships] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [mentorSearch, setMentorSearch] = useState("");
    const [studentSearchInTable, setStudentSearchInTable] = useState("");
    const [filterSemesterInTable, setFilterSemesterInTable] = useState("");
    const [startUSN, setStartUSN] = useState("");
    const [endUSN, setEndUSN] = useState("");
    const [checkedStudentIds, setCheckedStudentIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    // --- DATA FETCHING & MEMOIZATION (No changes to logic) ---
    const assignedStudentEmails = useMemo(() => {
        return new Set(mentorships.flatMap((m) => m.students?.map((s) => s.email) || []));
    }, [mentorships]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [teacherSnap, studentSnap, mentorSnap] = await Promise.all([
                    getDocs(collection(db, "teachers")),
                    getDocs(collection(db, "students")),
                    getDocs(collection(db, "mentorships")),
                ]);

                setTeachers(teacherSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                setStudents(studentSnap.docs.map((doc) => ({ id: doc.id, USN: doc.id, ...doc.data() })));
                setMentorships(mentorSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                setError("Failed to fetch data from server.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredUnassignedStudents = useMemo(() => {
        return students
            .filter((s) => s.email && !assignedStudentEmails.has(s.email))
            .filter((s) => (selectedSemester ? String(s.semester) === selectedSemester : true))
            .filter((s) => (selectedSection ? String(s.section) === selectedSection : true))
            .filter((s) => (s.name?.toLowerCase() || "").includes(studentSearch.toLowerCase()));
    }, [students, assignedStudentEmails, selectedSemester, selectedSection, studentSearch]);

    const studentsInUSNRange = useMemo(() => {
        if (!startUSN || !endUSN) return [];
        const start = startUSN.trim().toUpperCase();
        const end = endUSN.trim().toUpperCase();
        return filteredUnassignedStudents.filter((s) => {
            const usn = s.USN?.toUpperCase();
            if (!usn) return false;
            return usn >= start && usn <= end;
        });
    }, [startUSN, endUSN, filteredUnassignedStudents]);

    useEffect(() => {
        setCheckedStudentIds((prevChecked) => {
            const newChecked = new Set(prevChecked);
            studentsInUSNRange.forEach((s) => {
                if (s.id) {
                    newChecked.add(s.id);
                }
            });
            return newChecked;
        });
    }, [studentsInUSNRange]);

    useEffect(() => {
        if (successMessage || error) {
            const timer = setTimeout(() => {
                setSuccessMessage("");
                setError("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, error]);

    useEffect(() => {
        setMentorCurrentPage(1);
        setStudentPages({});
    }, [mentorSearch, studentSearchInTable, filterSemesterInTable]);
    
    // --- EVENT HANDLERS (No changes to logic) ---
    const toggleStudentChecked = (studentId) => {
        setCheckedStudentIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const handleAssignMentor = async () => {
        setError(null);
        setSuccessMessage("");
        if (!selectedTeacher) {
            setError("Please select a teacher.");
            return;
        }
        if (checkedStudentIds.size === 0) {
            setError("Please select at least one student.");
            return;
        }
        const selectedStudentsData = filteredUnassignedStudents.filter((s) => checkedStudentIds.has(s.id));
        if (selectedStudentsData.length === 0) {
            setError("No valid students selected.");
            return;
        }
        try {
            const mentorshipDoc = mentorships.find((m) => m.id === selectedTeacher.id);
            const existingStudents = mentorshipDoc?.students || [];
            const studentMap = new Map();
            [...existingStudents, ...selectedStudentsData].forEach((s) => {
                if (s.email) {
                    studentMap.set(s.email, s);
                }
            });
            const mergedStudents = Array.from(studentMap.values());
            const mentorshipRef = doc(db, "mentorships", selectedTeacher.id);
            if (mentorshipDoc) {
                await updateDoc(mentorshipRef, { students: mergedStudents });
            } else {
                await setDoc(mentorshipRef, {
                    teacherName: selectedTeacher.name,
                    department: selectedTeacher.department,
                    students: mergedStudents,
                });
            }
            setMentorships((prev) => {
                const found = prev.find((m) => m.id === selectedTeacher.id);
                if (found) {
                    return prev.map((m) => m.id === selectedTeacher.id ? { ...m, students: mergedStudents } : m);
                } else {
                    return [...prev, { id: selectedTeacher.id, teacherName: selectedTeacher.name, department: selectedTeacher.department, students: mergedStudents }];
                }
            });
            setStartUSN("");
            setEndUSN("");
            setSelectedTeacher(null);
            setSelectedSemester("");
            setSelectedSection("");
            setStudentSearch("");
            setCheckedStudentIds(new Set());
            setSuccessMessage(`Successfully assigned ${selectedStudentsData.length} student(s) to ${selectedTeacher.name}`);
        } catch (err) {
            console.error(err);
            setError("Failed to assign mentor. Please try again.");
        }
    };

    const handleDeleteStudent = async (mentorId, studentEmail) => {
        // ... (logic unchanged)
        const mentorship = mentorships.find((m) => m.id === mentorId);
        if (!mentorship) { setError("Mentorship not found."); return; }
        const updatedStudents = mentorship.students.filter((s) => s.email !== studentEmail);
        try {
            const mentorshipRef = doc(db, "mentorships", mentorId);
            await updateDoc(mentorshipRef, { students: updatedStudents });
            setMentorships((prev) => prev.map((m) => m.id === mentorId ? { ...m, students: updatedStudents } : m));
            setSuccessMessage(`Removed student ${studentEmail} from mentor.`);
        } catch (err) {
            console.error(err);
            setError("Failed to remove student from mentor.");
        }
    };

    const handleDeleteAllStudents = async (mentorId) => {
        // ... (logic unchanged)
        if (!window.confirm("Are you sure you want to remove all students from this mentor?")) return;
        const mentorship = mentorships.find((m) => m.id === mentorId);
        if (!mentorship) { setError("Mentorship not found."); return; }
        try {
            const mentorshipRef = doc(db, "mentorships", mentorId);
            await updateDoc(mentorshipRef, { students: [] });
            setMentorships((prev) => prev.map((m) => (m.id === mentorId ? { ...m, students: [] } : m)));
            setSuccessMessage(`Removed all students from mentor.`);
        } catch (err) {
            console.error(err);
            setError("Failed to remove all students from mentor.");
        }
    };

    const teacherOptions = teachers.map((t) => ({ value: t, label: `${t.name} (${t.department})` }));

    const handleStudentPageChange = (mentorId, newPage) => {
        setStudentPages(prevPages => ({ ...prevPages, [mentorId]: newPage }));
    };

    const filteredMentorships = useMemo(() => {
        return mentorships
            .map(m => {
                const filteredMentees = m.students.filter(
                    (s) =>
                        (s.name?.toLowerCase() || "").includes(studentSearchInTable.toLowerCase()) &&
                        (filterSemesterInTable ? String(s.semester) === filterSemesterInTable : true)
                );
                return { ...m, filteredMentees };
            })
            .filter(m => m.students.length > 0)
            .filter(m => (m.teacherName?.toLowerCase() || "").includes(mentorSearch.toLowerCase()))
            .filter(m => studentSearchInTable || filterSemesterInTable ? m.filteredMentees.length > 0 : true);
    }, [mentorships, mentorSearch, studentSearchInTable, filterSemesterInTable]);
    
    // --- PAGINATION LOGIC (No changes to logic) ---
    const totalMentorPages = Math.ceil(filteredMentorships.length / mentorsPerPage);
    const paginatedMentorships = filteredMentorships.slice((mentorCurrentPage - 1) * mentorsPerPage, mentorCurrentPage * mentorsPerPage);

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <section className="space-y-8">
            {/* --- ASSIGN MENTOR CARD --- */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaUserPlus /> Assign Mentor to Students</h2>
                
                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-center">{error}</div>}
                {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center">{successMessage}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    {/* Teacher Select */}
                    <div className="flex flex-col">
                        <label htmlFor="teacherSelect" className="mb-2 font-semibold text-gray-700">Select Teacher</label>
                        <Select
                            inputId="teacherSelect"
                            options={teacherOptions}
                            value={selectedTeacher ? { value: selectedTeacher, label: `${selectedTeacher.name} (${selectedTeacher.department})` } : null}
                            onChange={(option) => setSelectedTeacher(option ? option.value : null)}
                            placeholder="Search teacher..."
                            isClearable
                        />
                    </div>

                    {/* Semester Filter */}
                    <div className="flex flex-col">
                        <label htmlFor="semesterSelect" className="mb-2 font-semibold text-gray-700">Filter by Semester</label>
                        <select id="semesterSelect" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="p-2 h-[38px] border rounded-md border-gray-300">
                            <option value="">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
                        </select>
                    </div>

                    {/* Section Filter */}
                    <div className="flex flex-col">
                        <label htmlFor="sectionSelect" className="mb-2 font-semibold text-gray-700">Filter by Section</label>
                        <select id="sectionSelect" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="p-2 h-[38px] border rounded-md border-gray-300">
                            <option value="">All Sections</option>
                            {[...new Set(students.map((s) => s.section))].sort().map((section) => (<option key={section} value={section}>{section}</option>))}
                        </select>
                    </div>

                    {/* USN Range Filter */}
                    <div className="flex flex-col">
                        <label className="mb-2 font-semibold text-gray-700">Select by USN Range</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Start USN" value={startUSN} onChange={(e) => setStartUSN(e.target.value.toUpperCase())} className="p-2 border rounded-md border-gray-300 w-full" />
                            <input type="text" placeholder="End USN" value={endUSN} onChange={(e) => setEndUSN(e.target.value.toUpperCase())} className="p-2 border rounded-md border-gray-300 w-full" />
                        </div>
                    </div>
                </div>

                {/* Unassigned Students List */}
                <div className="mt-6">
                    <label className="font-semibold text-gray-700">Unassigned Students ({filteredUnassignedStudents.length})</label>
                    <p className="text-sm text-gray-500 mb-2">Select students from the list below to assign them to the chosen mentor.</p>
                    <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50/50 text-sm space-y-2">
                        {filteredUnassignedStudents.length > 0 ? (
                            filteredUnassignedStudents.map((s) => (
                                <label key={s.id ?? s.email} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" checked={checkedStudentIds.has(s.id)} onChange={() => toggleStudentChecked(s.id)} className="mr-3 h-4 w-4 rounded" />
                                    <span className="font-medium text-gray-800">{s.name}</span>
                                    <span className="ml-2 text-gray-500">({s.id || "N/A"})</span>
                                </label>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No unassigned students match the current filters.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        disabled={!selectedTeacher || checkedStudentIds.size === 0}
                        onClick={handleAssignMentor}
                        className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-300 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Assign {checkedStudentIds.size > 0 ? `${checkedStudentIds.size} Student(s)` : ''} to {selectedTeacher?.name || 'Mentor'}
                    </button>
                </div>
            </div>

            {/* --- CURRENT ASSIGNMENTS CARD --- */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaUsers /> Current Mentor Assignments</h3>
                
                {/* Filters for the table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by mentor name..." value={mentorSearch} onChange={(e) => setMentorSearch(e.target.value)} className="w-full p-2 border rounded-lg border-gray-300 pl-10" />
                    </div>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by student name..." value={studentSearchInTable} onChange={(e) => setStudentSearchInTable(e.target.value)} className="w-full p-2 border rounded-lg border-gray-300 pl-10" />
                    </div>
                    <select value={filterSemesterInTable} onChange={(e) => setFilterSemesterInTable(e.target.value)} className="p-2 border rounded-lg border-gray-300">
                        <option value="">Filter by Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<option key={s} value={s}>Semester {s}</option>))}
                    </select>
                </div>

                <div className="space-y-6">
                    {paginatedMentorships.map((m) => {
                        const currentStudentPage = studentPages[m.id] || 1;
                        const totalStudentPages = Math.ceil(m.filteredMentees.length / studentsPerPage);
                        const paginatedMentees = m.filteredMentees.slice((currentStudentPage - 1) * studentsPerPage, currentStudentPage * studentsPerPage);

                        return (
                            <div key={m.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50/30">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                                    <h4 className="text-xl font-bold text-blue-700">{m.teacherName}</h4>
                                    <button onClick={() => handleDeleteAllStudents(m.id)} className="flex items-center gap-2 mt-2 md:mt-0 bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition text-sm font-semibold">
                                        <FaTrash /> Remove All
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-700">
                                        <thead className="text-xs text-white uppercase bg-blue-600">
                                            <tr>
                                                <th scope="col" className="px-4 py-3">Name</th>
                                                <th scope="col" className="px-4 py-3">USN</th>
                                                <th scope="col" className="px-4 py-3">Email & Phone</th>
                                                <th scope="col" className="px-4 py-3">Sem</th>
                                                <th scope="col" className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedMentees.map((s) => (
                                                <tr key={s.id ?? s.email} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{s.name}</td>
                                                    <td className="px-4 py-3">{s.id || "N/A"}</td>
                                                    <td className="px-4 py-3">
                                                        <div>{s.email}</div>
                                                        <div className="text-gray-500">{s.phone}</div>
                                                    </td>
                                                    <td className="px-4 py-3">{s.semester}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => handleDeleteStudent(m.id, s.email)} className="text-red-500 hover:text-red-700" title="Remove Student">
                                                            <FaTrash />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {m.filteredMentees.length === 0 && (
                                                <tr><td colSpan="5" className="text-center py-6 text-gray-500 bg-white">No students match the current filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalStudentPages > 1 && (
                                    <div className="flex justify-end mt-4">
                                        <Pagination currentPage={currentStudentPage} totalPages={totalStudentPages} onPageChange={(page) => handleStudentPageChange(m.id, page)} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {totalMentorPages > 1 && (
                    <div className="flex justify-center mt-6">
                        <Pagination currentPage={mentorCurrentPage} totalPages={totalMentorPages} onPageChange={setMentorCurrentPage} />
                    </div>
                )}
                 {filteredMentorships.length === 0 && !loading && (
                    <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No mentor assignments match the current filters.</p>
                    </div>
                )}
            </div>
        </section>
    );
}