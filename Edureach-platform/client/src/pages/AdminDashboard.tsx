import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { User, Phone, LogOut, CheckCircle, Clock, Star, MessageSquare, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone: string;
  callStatus: "Pending" | "Done";
  priority: number;
  chatSummary: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<number | "All">("All");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchStudents();
  }, [user, navigate]);

  const fetchStudents = async () => {
    try {
      const res = await API.get("/admin/users");
      setStudents(res.data.data.users);
    } catch (error) {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "Pending" | "Done") => {
    try {
      await API.patch(`/admin/users/${id}`, { callStatus: newStatus });
      setStudents(students.map(s => s._id === id ? { ...s, callStatus: newStatus } : s));
      toast.success("Status updated!");
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const handlePriorityChange = async (id: string, newPriority: number) => {
    try {
      await API.patch(`/admin/users/${id}`, { priority: newPriority });
      setStudents(students.map(s => s._id === id ? { ...s, priority: newPriority } : s));
      toast.success("Priority updated!");
    } catch (error) {
      toast.error("Failed to update priority.");
    }
  };

  const handleSummarize = async (student: Student) => {
    setSummarizing(true);
    setSelectedStudent(student);
    try {
      const res = await API.post(`/admin/users/${student._id}/summarize`);
      const newSummary = res.data.data.summary;
      setStudents(students.map(s => s._id === student._id ? { ...s, chatSummary: newSummary } : s));
      setSelectedStudent(prev => prev ? { ...prev, chatSummary: newSummary } : null);
    } catch (error) {
      toast.error("Failed to generate summary.");
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white"><Loader2 className="animate-spin w-8 h-8 text-amber-300" /></div>;

  const filteredStudents = students.filter(s => priorityFilter === "All" || s.priority === priorityFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a0f14] to-maroon-dark text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">EduReach Admin Hub</h1>
            <p className="text-gray-400 mt-1">Manage admissions, calls, and track student interactions.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-white/10">
              <span className="text-sm text-gray-400">Filter:</span>
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value === "All" ? "All" : Number(e.target.value))}
                className="bg-transparent text-amber-300 text-sm focus:outline-none appearance-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-gray-800">All Priorities</option>
                <option value="5" className="bg-gray-800">5 Stars</option>
                <option value="4" className="bg-gray-800">4 Stars</option>
                <option value="3" className="bg-gray-800">3 Stars</option>
                <option value="2" className="bg-gray-800">2 Stars</option>
                <option value="1" className="bg-gray-800">1 Star</option>
              </select>
            </div>
            <button onClick={() => { logout(); navigate("/login"); }} className="flex items-center gap-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors border border-red-500/30">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-300 text-sm uppercase tracking-wider border-b border-white/10">
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Summary</th>
                  <th className="px-6 py-4 font-semibold">Call Status</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-100">{student.name}</p>
                          <p className="text-xs text-gray-400">Joined {new Date(student.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm text-gray-300">
                        <span className="hover:text-amber-300 transition-colors cursor-pointer">{student.email}</span>
                        <span className="flex items-center gap-1 hover:text-amber-300 transition-colors cursor-pointer">
                          <Phone className="w-3 h-3" /> {student.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {student.chatSummary ? (
                        <p className="text-sm text-gray-400 truncate" title={student.chatSummary}>
                          {student.chatSummary}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 font-bold">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={student.callStatus} 
                        onChange={(e) => handleStatusChange(student._id, e.target.value as "Pending" | "Done")}
                        className={`text-sm rounded-full px-3 py-1 font-medium border focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer ${
                          student.callStatus === "Done" 
                          ? "bg-green-500/20 text-green-300 border-green-500/30" 
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        <option value="Pending" className="bg-gray-800 text-amber-300">Pending</option>
                        <option value="Done" className="bg-gray-800 text-green-300">Done</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => handlePriorityChange(student._id, star)} className="focus:outline-none transition-transform hover:scale-110">
                            <Star className={`w-5 h-5 ${star <= student.priority ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-gray-600"}`} />
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedStudent(student); if(!student.chatSummary) handleSummarize(student); }}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-white/10"
                      >
                        <MessageSquare className="w-4 h-4" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No students registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" /> {selectedStudent.name}'s Details
              </h2>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contact Info</p>
                  <p className="text-sm font-medium">{selectedStudent.email}</p>
                  <p className="text-sm font-medium">{selectedStudent.phone}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {selectedStudent.callStatus === "Done" ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                    Call {selectedStudent.callStatus}
                  </p>
                  <p className="text-sm font-medium flex items-center gap-1 mt-1">
                    Priority: {selectedStudent.priority} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> AI Chat Summary
                  </h3>
                  <button 
                    onClick={() => handleSummarize(selectedStudent)}
                    disabled={summarizing}
                    className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {summarizing ? <><Loader2 className="w-3 h-3 animate-spin"/> Summarizing...</> : "Re-summarize"}
                  </button>
                </div>
                
                <div className="bg-black/30 p-5 rounded-xl border border-white/5 prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed min-h-[150px]">
                  {summarizing ? (
                     <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 py-10">
                       <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                       <p>Analyzing conversation and extracting key insights...</p>
                     </div>
                  ) : selectedStudent.chatSummary ? (
                    <ReactMarkdown>{selectedStudent.chatSummary}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-500 italic py-10 text-center">Student hasn't chatted yet or summary is pending.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-white/5 text-right flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30">
                <Phone className="w-4 h-4" /> {selectedStudent.phone}
              </div>
              <button onClick={() => setSelectedStudent(null)} className="bg-white/10 text-white px-6 py-2 rounded-lg text-sm hover:bg-white/20 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
