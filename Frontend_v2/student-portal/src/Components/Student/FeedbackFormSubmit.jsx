import React, { useEffect, useState, useRef } from "react";
import { FaCheckCircle, FaArrowLeft, FaArrowRight, FaPaperPlane } from "react-icons/fa";
import { motion } from "framer-motion";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { showErrorToast, showSuccessToast } from "../helpers/Toast";

const FeedbackFormSubmit = ({ student }) => {
  const [forms, setForms] = useState([]);
  const [formStatus, setFormStatus] = useState({});
  const [responses, setResponses] = useState({});
  const [criteriaList, setCriteriaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherIndexes, setTeacherIndexes] = useState({});
  const topRef = useRef(null);

  useEffect(() => {
    const fetchFormsAndTemplate = async () => {
      setLoading(true);
      try {
        const templateDoc = await getDoc(doc(db, "feedbackTemplates", "default"));
        if (templateDoc.exists()) {
          setCriteriaList(templateDoc.data().questions || []);
        }

        const q = query(
          collection(db, "feedbackForms"),
          where("semester", "==", parseInt(student.semester)),
          where("section", "==", student.section),
          where("formStatus", "==", "active")
        );

        const snapshot = await getDocs(q);
        const formsData = [];
        const statusMap = {};
        const teacherIndexMap = {};

        for (const docSnap of snapshot.docs) {
          const data = { id: docSnap.id, ...docSnap.data() };
          formsData.push(data);

          const statusRef = doc(db, "feedbackStatus", `${student.id}_${data.id}`);
          const statusSnap = await getDoc(statusRef);
          statusMap[data.id] = statusSnap.exists() && statusSnap.data().status === "filled";

          teacherIndexMap[data.id] = 0;
        }

        setForms(formsData);
        setFormStatus(statusMap);
        setTeacherIndexes(teacherIndexMap);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
      setLoading(false);
    };

    if (student) fetchFormsAndTemplate();
  }, [student]);
  
  useEffect(() => {
    if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [teacherIndexes]);


  const handleScoreChange = (subjectKey, criterionKey, value) => {
    setResponses((prev) => ({
      ...prev,
      [subjectKey]: {
        ...(prev[subjectKey] || {}),
        [criterionKey]: value,
      },
    }));
  };

  const validateCurrentTeacher = (form, teacher) => {
    const key = `${form.id}_${teacher.subjectCode}`;
    return criteriaList.every((_, idx) => responses[key]?.[`C${idx + 1}`] !== undefined);
  };

  const handleNext = (form, teacher) => {
    if (!validateCurrentTeacher(form, teacher)) {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      showErrorToast("Please rate all criteria before continuing.");
      return;
    }

    setTeacherIndexes((prev) => ({
      ...prev,
      [form.id]: Math.min((prev[form.id] || 0) + 1, form.subforms.length - 1),
    }));
  };

  const handleSubmitForm = async (form) => {
    const formId = form.id;

    const filledAll = form.subforms.every((sub) => {
        const key = `${formId}_${sub.subjectCode}`;
        return criteriaList.every((_, idx) => responses[key]?.[`C${idx + 1}`] !== undefined);
    });

    if (!filledAll) {
        if (topRef.current) {
            topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        showErrorToast("Please fill all fields before submitting.");
        return;
    }
    
    try {
        for (const sub of form.subforms) {
            const key = `${formId}_${sub.subjectCode}`;
            const selectedOptions = responses[key];
            const scoreMap = {};
            let total = 0;
            criteriaList.forEach((criterion, idx) => {
                const critKey = `C${idx + 1}`;
                const selectedLabel = selectedOptions[critKey];
                const optionIndex = criterion.options.indexOf(selectedLabel);
                const score = [40, 30, 20, 10][optionIndex] || 0;
                scoreMap[critKey] = score;
                total += score;
            });
            await addDoc(collection(db, "feedbackResponses"), {
                studentId: student.id,
                feedbackFormId: formId,
                subjectCode: sub.subjectCode,
                teacherName: sub.teacherName,
                ratings: scoreMap,
                total,
                timestamp: serverTimestamp(),
            });
        }
        await setDoc(doc(db, "feedbackStatus", `${student.id}_${formId}`), {
            studentId: student.id,
            feedbackFormId: formId,
            status: "filled",
            submittedAt: serverTimestamp(),
        });
        setFormStatus((prev) => ({ ...prev, [formId]: true }));
        showSuccessToast("Feedback submitted successfully!");
    } catch (err) {
        console.error("Error submitting feedback:", err);
        showErrorToast("Failed to submit feedback. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const unfilledForms = forms.filter((form) => !formStatus[form.id]);

  if (unfilledForms.length === 0) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl mx-auto mt-20 p-10 rounded-2xl shadow-xl 
                       bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 text-center"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 10, delay: 0.3 }}
                className="flex justify-center mb-6"
            >
                <div className="bg-white p-5 rounded-full shadow-lg">
                    <FaCheckCircle className="text-emerald-500" size={50} />
                </div>
            </motion.div>

            <h3 className="text-3xl font-extrabold text-emerald-800 mb-3">Feedback Completed!</h3>
            <p className="text-lg text-gray-700 leading-relaxed max-w-sm mx-auto">
                Thank you for submitting your valuable feedback. Your input helps us improve!
            </p>
        </motion.div>
    );
  }

  return (
    <div ref={topRef} className="max-w-5xl mx-auto font-sans text-sm">
      {unfilledForms.map((form) => {
        const currentTeacherIndex = teacherIndexes[form.id] || 0;
        const totalTeachers = form.subforms.length;
        const teacher = form.subforms[currentTeacherIndex];
        const progressPercentage = ((currentTeacherIndex + 1) / totalTeachers) * 100;

        return (
          <div key={form.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Student Feedback Form
            </h2>
            <p className="text-gray-500 mb-6">Semester {form.semester} | Section {form.section}</p>
            
            <div className="mb-6">
                <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-medium text-gray-700">{currentTeacherIndex + 1} of {totalTeachers}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
              <h3 className="font-bold text-lg text-blue-800 mb-2">
                {teacher.subjectName} ({teacher.subjectCode})
              </h3>
              <p className="text-md text-gray-600 mb-4">Faculty: <span className="font-semibold">{teacher.teacherName}</span></p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs text-white uppercase bg-blue-600">
                    <tr>
                      <th scope="col" className="px-4 py-3 w-16 text-center">#</th>
                      <th scope="col" className="px-4 py-3">Question</th>
                      <th scope="col" className="px-4 py-3">Your Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteriaList.map((item, idx) => {
                      const key = `C${idx + 1}`;
                      const subjectKey = `${form.id}_${teacher.subjectCode}`;
                      return (
                        <tr key={key} className="bg-white border-b hover:bg-blue-50/50">
                          <td className="px-4 py-3 font-medium text-center">{key}</td>
                          <td className="px-4 py-3">{item.question}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              {item.options.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer text-gray-800">
                                  <input
                                    type="radio"
                                    name={`${subjectKey}_${key}`}
                                    value={opt}
                                    checked={responses[subjectKey]?.[key] === opt}
                                    onChange={() => handleScoreChange(subjectKey, key, opt)}
                                    className="h-4 w-4 accent-blue-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setTeacherIndexes((prev) => ({ ...prev, [form.id]: Math.max(currentTeacherIndex - 1, 0) }))}
                disabled={currentTeacherIndex === 0}
                className="flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                <FaArrowLeft /> Prev
              </button>

              {currentTeacherIndex === totalTeachers - 1 ? (
                <button
                  onClick={() => handleSubmitForm(form)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                >
                  <FaPaperPlane /> Submit Feedback
                </button>
              ) : (
                <button
                  onClick={() => handleNext(form, teacher)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Next <FaArrowRight />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FeedbackFormSubmit;