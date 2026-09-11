import React, { useState } from 'react';
import {
  CloudUpload, GraduationCap, RotateCcw, CheckCircle2,
  Sparkles, List, ChevronDown, ChevronUp, Loader2, AlertTriangle, Calculator
} from 'lucide-react';
import { marked } from 'marked';

// --- Utility Functions for Pre-calculating Grades ---
const getEvalType = (subj) => {
  if (subj.course_type === 'กิจกรรม' || subj.grade === 'ผ' || subj.grade === 'มผ') return 'ผ่าน/ไม่ผ่าน';
  if (subj.course_code && subj.course_name) return 'คำนวณเกรด';
  return null;
};

const calculateDetailActualPercent = (detail) => {
  if (detail.obtained_percentage !== undefined && detail.obtained_percentage !== null) {
    return parseFloat(detail.obtained_percentage);
  }
  const full = parseFloat(detail.full_score);
  const weight = parseFloat(detail.weight);
  const obt = parseFloat(detail.obtained_score);
  if (!isNaN(full) && !isNaN(weight) && !isNaN(obt) && full !== 0) {
    return (obt / full) * weight;
  }
  return null;
};

const calculateSubjectScore = (subject) => {
  const evalType = getEvalType(subject);
  if (evalType !== 'คำนวณเกรด' && evalType !== 'ผ่าน/ไม่ผ่าน') return null;

  let totalFinalPercentage = 0;
  let hasScores = false;

  if (subject.details && subject.details.length > 0) {
    subject.details.forEach(detail => {
      const actual = calculateDetailActualPercent(detail);
      if (actual !== null && !isNaN(actual)) {
        totalFinalPercentage += actual;
        hasScores = true;
      }
    });
  }

  if (!hasScores) {
    const fallback = parseFloat(subject.total_percentage);
    return !isNaN(fallback) ? fallback : null;
  }
  return totalFinalPercentage;
};

const getGradeString = (percent, gradingType) => {
  if (percent === null) return '-';

  if (gradingType === 'ผ่าน/ไม่ผ่าน') {
    return percent >= 50 ? 'ผ' : 'มผ';
  }

  if (percent >= 80) return '4.0';
  if (percent >= 75) return '3.5';
  if (percent >= 70) return '3.0';
  if (percent >= 65) return '2.5';
  if (percent >= 60) return '2.0';
  if (percent >= 55) return '1.5';
  if (percent >= 50) return '1.0';
  return '0.0';
};

const getGradeBadgeColor = (grade) => {
  switch (grade) {
    case '4.0': case '4': return 'bg-green-100 text-green-700';
    case '3.5': return 'bg-emerald-100 text-emerald-700';
    case '3.0': case '3': return 'bg-teal-100 text-teal-700';
    case '2.5': return 'bg-cyan-100 text-cyan-700';
    case '2.0': case '2': return 'bg-blue-100 text-blue-700';
    case '1.5': return 'bg-indigo-100 text-indigo-700';
    case '1.0': case '1': return 'bg-orange-100 text-orange-700';
    case '0.0': case '0': return 'bg-red-100 text-red-700';
    case 'ผ': return 'bg-green-100 text-green-700';
    case 'มผ': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-500';
  }
};


function App() {
  const [studentData, setStudentData] = useState(null);
  const [fileName, setFileName] = useState('คลิกเพื่อเลือกไฟล์ JSON');

  const [apiKey, setApiKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');

  const [selectedSemester, setSelectedSemester] = useState(0);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(`กำลังโหลด: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.all_semesters) {
          setStudentData(json);
          setSelectedSemester(0);
          setExpandedSubjects(new Set());
          setAiResult('');
          setAiError('');
        } else {
          alert("รูปแบบไฟล์ JSON ไม่ถูกต้อง (ต้องมีฟิลด์ all_semesters)");
          setFileName("คลิกเพื่อเลือกไฟล์ JSON");
        }
      } catch (err) {
        alert("ไม่สามารถอ่านไฟล์ JSON ได้: " + err.message);
        setFileName("คลิกเพื่อเลือกไฟล์ JSON");
      }
    };
    reader.readAsText(file);
  };

  const toggleDetails = (index) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleAnalyze = async () => {
    if (!apiKey.trim()) {
      alert("กรุณาใส่ API Key ของ Google Gemini ก่อนครับ");
      return;
    }

    setIsAnalyzing(true);
    setAiResult('');
    setAiError('');

    const compressedData = studentData.all_semesters.map(sem => ({
      semester: sem.semester,
      subjects: sem.subjects.map(s => {
        const scorePercent = calculateSubjectScore(s);
        const evalType = getEvalType(s);
        const grade = getGradeString(scorePercent, evalType);
        return {
          name: s.course_name || s.course_type,
          pre_calculated_percent: scorePercent !== null ? scorePercent.toFixed(2) + '%' : 'N/A',
          expected_grade: grade,
          scores: s.details ? s.details.map(d => `${d.item}: ${d.obtained_score || '-'}/${d.full_score || '-'} (${calculateDetailActualPercent(d) || '-'}%)`) : []
        };
      })
    }));

    const prompt = `ในฐานะที่ปรึกษาด้านการเรียน (Academic Advisor) กรุณาวิเคราะห์ข้อมูลผลการเรียนของนักเรียนคนนี้จากข้อมูล JSON ที่แนบมานี้ (สังเกตว่ามี pre_calculated_percent และ expected_grade ที่ระบบคำนวณล่วงหน้าไว้ให้แล้วจากคะแนนเก็บ)
            
จงวิเคราะห์ตามหัวข้อต่อไปนี้ (ใช้ภาษาไทย จัดหน้าด้วย Markdown ให้น่าอ่าน):
1. **ภาพรวมการเรียน**: สรุปสั้นๆ ว่าการเรียนเป็นอย่างไร เกรดเฉลี่ยคร่าวๆ น่าจะอยู่ในระดับไหน
2. **จุดแข็ง (Strengths)**: วิชาหรือทักษะที่ทำคะแนนได้ดี (ดูจากคะแนนรวม % และเกรดที่คาดหวัง)
3. **จุดอ่อน/สิ่งที่ต้องระวัง (Weaknesses)**: วิชาหรืองานที่คะแนนหายไปมาก หรือไม่ได้ส่ง
4. **คำแนะนำในการพัฒนา (Recommendations)**: แนะนำวิธีพัฒนาเจาะจงรายวิชา

ข้อมูล JSON: 
${JSON.stringify(compressedData)}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:batchGenerateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const markdownText = data.candidates[0].content.parts[0].text;

      setAiResult(marked.parse(markdownText));
    } catch (error) {
      setAiError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!studentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-100">
          <div className="text-blue-500 mb-4 flex justify-center">
            <CloudUpload size={64} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold mb-2">อัพโหลดข้อมูลผลการเรียน</h1>
          <p className="text-gray-500 mb-6 text-sm">อัพโหลดไฟล์ JSON ของคุณเพื่อเปิดดู Dashboard และวิเคราะห์ด้วย AI</p>

          <label className="block w-full cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-3 px-4 rounded-xl border-2 border-dashed border-blue-300 transition duration-300">
            <span>{fileName}</span>
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    );
  }

  const totalSemesters = studentData.all_semesters.length;
  const currentSemester = studentData.all_semesters[selectedSemester] || { subjects: [] };

  const validSubjects = currentSemester.subjects.filter(s => {
    return getEvalType(s) !== null;
  });

  const totalSubjectsAcrossAll = studentData.all_semesters.reduce((acc, sem) => {
    return acc + sem.subjects.filter(s => getEvalType(s) !== null).length;
  }, 0);

  // --- Calculate Expected GPA ---
  let semesterCredits = 0;
  let semesterGradePoints = 0;
  let totalScoreCollected = 0;

  validSubjects.forEach(subj => {
    const evalType = getEvalType(subj);
    const scorePercent = calculateSubjectScore(subj);

    if (scorePercent !== null) {
      totalScoreCollected += scorePercent;
    }

    if (evalType === 'คำนวณเกรด') {
      const credits = parseFloat(subj.credits) || 0;
      const expectedGrade = getGradeString(scorePercent, evalType);
      const gradeVal = parseFloat(expectedGrade);

      if (!isNaN(credits) && !isNaN(gradeVal)) {
        semesterCredits += credits;
        semesterGradePoints += (gradeVal * credits);
      }
    }
  });

  const expectedGPA = semesterCredits > 0 ? (semesterGradePoints / semesterCredits).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <GraduationCap className="text-blue-500 mr-2" size={28} /> Academic Dashboard
          </h1>
          <button
            onClick={() => { setStudentData(null); setFileName('คลิกเพื่อเลือกไฟล์ JSON'); }}
            className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition"
          >
            <RotateCcw className="mr-1" size={16} /> อัพโหลดใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 fade-in">
            <p className="text-gray-500 text-sm">จำนวนภาคเรียนทั้งหมด</p>
            <h2 className="text-3xl font-bold text-gray-800 mt-1">{totalSemesters}</h2>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="text-gray-500 text-sm">จำนวนวิชาทั้งหมด (ทุกเทอม)</p>
            <h2 className="text-3xl font-bold text-gray-800 mt-1">{totalSubjectsAcrossAll}</h2>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-gray-500 text-sm">โครงสร้างข้อมูล</p>
            <h2 className="text-xl font-bold text-gray-800 mt-1 text-purple-600 flex items-center">
              ตรวจสอบแล้ว <CheckCircle2 className="ml-2" size={20} />
            </h2>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100 fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-indigo-900 flex items-center">
                <Sparkles className="text-indigo-500 mr-2" size={20} /> AI วิเคราะห์ผลการเรียน
              </h2>
              <p className="text-sm text-indigo-700">ใช้ Gemini AI ในการวิเคราะห์จุดแข็ง จุดอ่อน และข้อเสนอแนะจากคะแนนของคุณ</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ใส่ Gemini API Key ที่นี่..."
                className="px-4 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center min-w-[120px]"
              >
                {isAnalyzing ? <><Loader2 className="animate-spin mr-2" size={18} /> กำลังคิด...</> : 'วิเคราะห์เลย'}
              </button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="text-center py-8 text-indigo-500 fade-in">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p>AI กำลังวิเคราะห์ข้อมูลทั้งหมดของคุณ...</p>
            </div>
          )}

          {aiError && (
            <div className="bg-red-50 p-4 rounded-xl text-red-600 border border-red-100 flex items-start fade-in">
              <AlertTriangle className="mr-2 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-bold">เกิดข้อผิดพลาด: {aiError}</div>
                <div className="text-sm text-red-500 mt-1">โปรดตรวจสอบว่า API Key ถูกต้องและสามารถใช้งานได้</div>
              </div>
            </div>
          )}

          {aiResult && !isAnalyzing && !aiError && (
            <div
              className="bg-white p-6 rounded-xl shadow-inner border border-indigo-100 text-gray-700 ai-content text-sm md:text-base fade-in"
              dangerouslySetInnerHTML={{ __html: aiResult }}
            />
          )}
        </div>

        {/* Data Table Section */}
        <div className="bg-white rounded-xl shadow-sm fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <List className="text-gray-400 mr-2" size={20} /> รายละเอียดรายวิชา
            </h2>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(Number(e.target.value));
                setExpandedSubjects(new Set());
              }}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full md:w-auto min-w-[200px]"
            >
              {studentData.all_semesters.map((sem, index) => (
                <option key={index} value={index}>
                  ภาคเรียนที่ {sem.semester || index + 1}
                </option>
              ))}
            </select>
          </div>

          {/* GPA Summary Banner */}
          <div className="bg-blue-50 border-b border-blue-100 p-4 md:px-6 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">หน่วยกิตรวม (เทอมนี้)</p>
              <p className="text-2xl font-bold text-blue-900">{semesterCredits.toFixed(1)}</p>
            </div>
            <div className="hidden md:block w-px h-10 bg-blue-200"></div>
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">คะแนนรวมทั้งหมดที่เก็บได้</p>
              <p className="text-2xl font-bold text-blue-900">{totalScoreCollected.toFixed(1)} <span className="text-base text-blue-600 font-normal">%</span></p>
            </div>
            <div className="hidden md:block w-px h-10 bg-blue-200"></div>
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">เกรดเฉลี่ยที่คาดหวัง (GPA)</p>
              <p className="text-3xl font-extrabold text-blue-700">{expectedGPA}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4">รหัสวิชา</th>
                  <th scope="col" className="px-6 py-4">ชื่อวิชา</th>
                  <th scope="col" className="px-6 py-4 text-center">หน่วยกิต</th>
                  <th scope="col" className="px-6 py-4 text-center">% คะแนนรวม</th>
                  <th scope="col" className="px-6 py-4 text-center">เกรดคาดหวัง</th>
                  <th scope="col" className="px-6 py-4 text-center">ดูรายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {validSubjects.map((subj, subjIndex) => {
                  const evalType = getEvalType(subj);
                  const scorePercent = calculateSubjectScore(subj);
                  const grade = getGradeString(scorePercent, evalType);

                  return (
                    <React.Fragment key={subjIndex}>
                      <tr className="bg-white border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{subj.course_code || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-800">{subj.course_name || '-'}</div>
                          <div className="text-xs text-gray-400">{subj.course_type || ''}</div>
                        </td>
                        <td className="px-6 py-4 text-center">{subj.credits || '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">
                          {scorePercent !== null ? scorePercent.toFixed(2) + '%' : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeBadgeColor(grade)}`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleDetails(subjIndex)}
                            className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-full transition"
                          >
                            {expandedSubjects.has(subjIndex) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Details Sub-Row */}
                      {expandedSubjects.has(subjIndex) && (
                        <tr className="bg-gray-50 border-b fade-in">
                          <td colSpan="6" className="p-6">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <table className="w-full text-xs text-left text-gray-500">
                                <thead className="bg-gray-100 text-gray-700">
                                  <tr>
                                    <th className="px-4 py-3">รายการประเมิน</th>
                                    <th className="px-4 py-3 text-center">คะแนนดิบ (ได้/เต็ม)</th>
                                    <th className="px-4 py-3 text-center">สัดส่วน % เต็ม</th>
                                    <th className="px-4 py-3 text-center">% ที่ได้จริง</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subj.details && subj.details.length > 0 ? (
                                    subj.details
                                      .filter(d => (d.item && d.item.trim() !== '') || d.weight === 100 || d.full_score !== null)
                                      .map((detail, dIndex) => {
                                        const actual = calculateDetailActualPercent(detail);
                                        return (
                                          <tr key={dIndex} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium text-gray-700">
                                              {detail.item || (!detail.section && detail.weight === 100 ? 'รวมทั้งหมด (Total)' : '-')} <br />
                                              <span className="text-gray-400 text-[10px]">{detail.section}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              {detail.obtained_score !== null && detail.obtained_score !== undefined ? detail.obtained_score : '-'}
                                              /
                                              {detail.full_score || '-'}
                                            </td>
                                            <td className="px-4 py-2 text-center text-gray-500">{detail.weight || '-'}%</td>
                                            <td className="px-4 py-2 text-center font-bold text-blue-600">
                                              {actual !== null ? actual.toFixed(2) + '%' : '-'}
                                            </td>
                                          </tr>
                                        );
                                      })
                                  ) : (
                                    <tr>
                                      <td colSpan="4" className="px-4 py-4 text-center text-gray-400">ไม่มีข้อมูลคะแนนย่อย</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
