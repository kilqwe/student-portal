import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { FaBookOpen } from "react-icons/fa";

export default function AssignedSubjects({ employeeId }) {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedSubjects = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, "teachingAssignments"),
          where("employeeId", "==", employeeId)
        );
        const snapshot = await getDocs(q);

        const assignmentsWithDetails = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const assignment = docSnap.data();
            const subjectCode = assignment.subject;
            let subjectName = "Unknown";
            let subjectCredit = "N/A";

            try {
              const subjectDocRef = doc(db, "subjects", subjectCode);
              const subjectDoc = await getDoc(subjectDocRef);

              if (subjectDoc.exists()) {
                const subjectData = subjectDoc.data();
                subjectName = subjectData.name || "Unknown";
                subjectCredit = subjectData.credit !== undefined ? subjectData.credit : "N/A";
              } else {
                console.warn(`No subject found in 'subjects' for ID: ${subjectCode}`);
              }
            } catch (err) {
              console.error(`Failed to fetch subject ${subjectCode}:`, err);
            }

            return {
              id: docSnap.id,
              subjectCode,
              subjectName,
              subjectCredit,
              semester: assignment.semester,
              section: assignment.section,
              department: assignment.department,
            };
          })
        );
        
        // Sort subjects by semester, then by section
        assignmentsWithDetails.sort((a, b) => {
            if (a.semester < b.semester) return -1;
            if (a.semester > b.semester) return 1;
            if (a.section < b.section) return -1;
            if (a.section > b.section) return 1;
            return 0;
        });

        setAssignedSubjects(assignmentsWithDetails);
      } catch (err) {
        console.error("Error fetching assigned subjects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSubjects();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center">
        <FaBookOpen /> My Assigned Subjects
      </h2>

      {assignedSubjects.length === 0 ? (
        <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
            <FaBookOpen className="mx-auto text-4xl text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Subjects Assigned</h3>
            <p className="text-gray-500 mt-1">When an admin assigns you subjects, they will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-white uppercase bg-blue-600">
              <tr>
                <th scope="col" className="px-6 py-3">Subject Name</th>
                <th scope="col" className="px-6 py-3">Subject Code</th>
                <th scope="col" className="px-6 py-3">Semester</th>
                <th scope="col" className="px-6 py-3">Section</th>
                <th scope="col" className="px-6 py-3">Credits</th>
              </tr>
            </thead>
            <tbody>
              {assignedSubjects.map((subj) => (
                <tr key={subj.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{subj.subjectName}</td>
                  <td className="px-6 py-4">{subj.subjectCode}</td>
                  <td className="px-6 py-4">{subj.semester}</td>
                  <td className="px-6 py-4">{subj.section}</td>
                  <td className="px-6 py-4">{subj.subjectCredit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}