
import React, { useState, useMemo } from 'react';
import { useApp, getPermissionsByRole } from '../store';
import { StaffMember, UserRole, LeaveRequest, Attendance, OrderStatus } from '../types';

export const StaffManagement: React.FC = () => {
  const { 
    staff, addStaff, updateStaff, deleteStaff, currentUser, outlets, 
    leaveRequests, updateLeaveStatus, attendance, transactions, selectedOutletId 
  } = useApp();
  
  const [activeHRTab, setActiveHRTab] = useState<'employees' | 'leaves' | 'attendance' | 'performance'>('employees');
  const [attendanceView, setAttendanceView] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [perfPeriod, setPerfPeriod] = useState<'day' | 'week' | 'month'>('month');
  
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Archive Filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [], status: 'ACTIVE',
    weeklyOffDay: 0, shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 50000,
    phone: '', email: '', address: '', instagram: '', telegram: '', tiktok: '', emergencyContactName: '', emergencyContactPhone: ''
  });

  const handleSave = () => {
    const permissions = getPermissionsByRole(formData.role || UserRole.CASHIER);
    if (editingStaff) updateStaff({ ...editingStaff, ...formData, permissions } as StaffMember);
    else addStaff({ ...formData, id: `s-${Date.now()}`, permissions, joinedAt: new Date() } as StaffMember);
    setShowModal(false);
    setEditingStaff(null);
  };

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const todayStr = new Date().toISOString().split('T')[0];

  // --- LEAVE LOGIC: FIXING VISIBILITY ---
  // PENDING leaves should be visible GLOBAL to managers so they don't miss any action
  const pendingLeaves = useMemo(() => {
    return (leaveRequests || []).filter(l => l.status === 'PENDING');
  }, [leaveRequests]);

  // Only archive (Approved/Rejected) follows the outlet & date filter
  const archiveLeaves = useMemo(() => {
    return (leaveRequests || []).filter(l => {
      const ld = new Date(l.startDate);
      const isArchived = l.status !== 'PENDING';
      const outletMatches = selectedOutletId === 'all' || l.outletId === selectedOutletId;
      const dateMatches = ld.getMonth() === selectedMonth && ld.getFullYear() === selectedYear;
      return isArchived && outletMatches && dateMatches;
    });
  }, [leaveRequests, selectedOutletId, selectedMonth, selectedYear]);

  // --- ATTENDANCE LOGIC ---
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const d = new Date(a.date);
      const staffMember = staff.find(s => s.id === a.staffId);
      if (!staffMember) return false;
      const isCorrectOutlet = selectedOutletId === 'all' || staffMember.assignedOutletIds.includes(selectedOutletId);
      if (!isCorrectOutlet) return false;
      if (attendanceView === 'daily') return a.date === todayStr;
      if (attendanceView === 'monthly') return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      if (attendanceView === 'weekly') {
         const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
         return d >= oneWeekAgo;
      }
      return true;
    });
  }, [attendance, attendanceView, todayStr, selectedMonth, selectedYear, selectedOutletId, staff]);

  const attendanceRecap = useMemo(() => {
    const map: Record<string, { present: number, late: number, hours: number, alpha: number, records: Attendance[] }> = {};
    staff.filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId)).forEach(s => {
       map[s.id] = { present: 0, late: 0, hours: 0, alpha: 0, records: [] };
    });
    filteredAttendance.forEach(a => {
       if (map[a.staffId]) {
          map[a.staffId].records.push(a);
          map[a.staffId].present += 1;
          if (a.status === 'LATE') map[a.staffId].late += 1;
          if (a.clockOut) {
             const diff = new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime();
             map[a.staffId].hours += (diff / (1000 * 60 * 60));
          }
       }
    });
    return map;
  }, [filteredAttendance, staff, selectedOutletId]);

  // Fix: Calculate performance scores for the leaderboard tab
  const performanceScores = useMemo(() => {
    const now = new Date();
    let start = new Date();
    if (perfPeriod === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (perfPeriod === 'week') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (perfPeriod === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return staff
      .filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId))
      .map(s => {
        const periodTxs = transactions.filter(t => 
          t.cashierId === s.id && 
          t.status === OrderStatus.CLOSED && 
          new Date(t.timestamp) >= start
        );
        const totalSales = periodTxs.reduce((acc, t) => acc + (t.total || 0), 0);
        
        const periodAttendance = attendance.filter(a => {
          const aDate = new Date(a.date);
          return a.staffId === s.id && aDate >= start;
        });
        const lateCount = periodAttendance.filter(a => a.status === 'LATE').length;
        const attendCount = periodAttendance.length;
        
        // Basic performance score: sales volume (1 pt per 10k) + attendance consistency
        const salesScore = Math.floor(totalSales / 10000);
        const disciplineScore = (attendCount * 10) - (lateCount * 15);
        const finalScore = Math.max(0, salesScore + disciplineScore);
        
        return { staff: s, totalSales, attendCount, lateCount, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }, [staff, transactions, attendance, selectedOutletId, perfPeriod]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Enterprise HR Hub</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Manajemen Kru, Absensi & Approval Cuti</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
           {(['employees', 'attendance', 'leaves', 'performance'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveHRTab(tab)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${activeHRTab === tab ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>
               {tab === 'employees' ? 'Database' : tab === 'attendance' ? 'Absensi' : tab === 'leaves' ? 'Approval Cuti' : 'Performance'}
               {tab === 'leaves' && pendingLeaves.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">{pendingLeaves.length}</span>}
             </button>
           ))}
        </div>
      </div>

      {/* TAB: EMPLOYEES */}
      {activeHRTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kru Terdaftar</h3>
             <button onClick={() => { setEditingStaff(null); setShowModal(true); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-orange-500 transition-all">+ Kru Baru</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId)).map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group active:scale-[0.99] transition-all">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-[24px] bg-slate-50 overflow-hidden border-2 border-white shadow-md shrink-0">
                      <img src={member.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt="Staff" className="w-full h-full object-cover" />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate">{member.name}</h4>
                      <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-0.5">{member.role}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-6 text-[10px]">
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Shift</p>
                      <p className="font-black text-slate-700">{member.shiftStartTime} - {member.shiftEndTime}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Off Day</p>
                      <p className="font-black text-indigo-600 uppercase">{days[member.weeklyOffDay || 0]}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingStaff(member); setFormData(member); setShowModal(true); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Kelola Profil</button>
                   <button onClick={() => confirm('Hapus karyawan ini?') && deleteStaff(member.id)} className="w-12 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xs">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: LEAVE APPROVAL */}
      {activeHRTab === 'leaves' && (
        <div className="space-y-8 animate-in fade-in">
           {/* ACTION QUEUE (ALWAYS VISIBLE REGARDLESS OF BRANCH FILTER) */}
           <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs shadow-lg">🔔</div>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Butuh Persetujuan Segera (Global)</h4>
                 </div>
                 {pendingLeaves.length > 0 && <span className="text-[8px] font-black text-orange-600 animate-pulse">ACTION REQUIRED</span>}
              </div>
              
              {pendingLeaves.length === 0 ? (
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-100 p-12 rounded-[40px] text-center">
                   <div className="text-3xl mb-3">✅</div>
                   <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">Antrean Bersih.<br/>Semua pengajuan cuti telah diproses.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {pendingLeaves.map(leave => {
                    const branchName = outlets.find(o => o.id === leave.outletId)?.name || 'Cabang Terhapus';
                    return (
                      <div key={leave.id} className="bg-white p-6 rounded-[32px] border-2 border-indigo-100 shadow-xl flex flex-col justify-between group animate-in zoom-in-95">
                         <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shrink-0">🗓️</div>
                            <div className="min-w-0 flex-1">
                               <div className="flex justify-between items-start">
                                  <h5 className="text-[13px] font-black text-slate-800 uppercase leading-none truncate pr-2">{leave.staffName}</h5>
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[7px] font-black uppercase">{branchName}</span>
                               </div>
                               <p className="text-[10px] font-bold text-indigo-600 mt-2">
                                  {new Date(leave.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})} 
                                  <span className="mx-1 text-slate-300">➔</span> 
                                  {new Date(leave.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                               </p>
                               <div className="mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <p className="text-[11px] text-slate-600 italic leading-relaxed">"{leave.reason}"</p>
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-2 pt-4 border-t border-slate-50">
                            <button onClick={() => updateLeaveStatus(leave.id, 'APPROVED')} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">SETUJUI ✓</button>
                            <button onClick={() => updateLeaveStatus(leave.id, 'REJECTED')} className="flex-1 py-4 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase border border-red-100 active:scale-95 transition-all">TOLAK ✕</button>
                         </div>
                      </div>
                    );
                   })}
                </div>
              )}
           </div>

           {/* HISTORY ARCHIVE (FILTERED BY SELECTED BRANCH & DATE) */}
           <div className="space-y-4 pt-10 border-t border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center text-xs">📂</div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Arsip Keputusan ({selectedOutletId === 'all' ? 'Semua Cabang' : outlets.find(o=>o.id===selectedOutletId)?.name})</h4>
                 </div>
                 <div className="flex gap-2">
                    <select className="p-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="p-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none shadow-sm" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                       {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>
              
              <div className="space-y-2">
                 {archiveLeaves.length === 0 ? (
                   <p className="text-center py-12 text-[9px] font-black text-slate-300 uppercase italic bg-white rounded-[32px] border-2 border-dashed border-slate-100">Tidak ada histori izin pada kriteria ini</p>
                 ) : (
                   archiveLeaves.map(l => (
                     <div key={l.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center opacity-70 group hover:opacity-100 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${l.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {l.status === 'APPROVED' ? '✅' : '❌'}
                           </div>
                           <div>
                              <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{l.staffName}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                                 {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status}</span>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* TAB: ATTENDANCE HUB (Sama seperti sebelumnya) */}
      {activeHRTab === 'attendance' && (
         <div className="space-y-6">
            {/* Logic tabel absen tetap sama untuk audit */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Audit Absensi Cabang</h4>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Monitor kedisiplinan kru di {selectedOutletId === 'all' ? 'Seluruh Cabang' : outlets.find(o=>o.id===selectedOutletId)?.name}</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                     {(['daily', 'weekly', 'monthly', 'all'] as const).map(v => (
                        <button key={v} onClick={() => setAttendanceView(v)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${attendanceView === v ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                           {v === 'daily' ? 'Hari Ini' : v === 'weekly' ? 'Mingguan' : v === 'monthly' ? 'Bulanan' : 'Semua'}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                     <tr>
                        <th className="py-4 px-6">Nama Karyawan</th>
                        <th className="py-4 px-4 text-center">Kehadiran</th>
                        <th className="py-4 px-4 text-center text-red-500">Terlambat</th>
                        <th className="py-4 px-4 text-center">Total Jam</th>
                        <th className="py-4 px-6 text-right">Efisiensi</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                     {(Object.entries(attendanceRecap) as [string, any][]).map(([staffId, data]) => {
                        const s = staff.find(st => st.id === staffId);
                        if (!s) return null;
                        const efficiency = data.present > 0 ? Math.round(((data.present - data.late) / data.present) * 100) : 0;
                        return (
                           <tr key={staffId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6 font-black text-slate-800 uppercase leading-none">
                                 {s.name}
                                 <p className="text-[7px] text-slate-400 mt-1 uppercase font-bold">{s.role}</p>
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-slate-600">{data.present} Hari</td>
                              <td className="py-4 px-4 text-center font-black text-red-600">{data.late}x</td>
                              <td className="py-4 px-4 text-center font-bold text-slate-500">{data.hours.toFixed(1)} Jam</td>
                              <td className="py-4 px-6 text-right">
                                 <div className="flex flex-col items-end gap-1">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                       <div className={`h-full ${efficiency > 90 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${efficiency}%`}}></div>
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-slate-400">{efficiency}% Disiplin</span>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {/* TAB: PERFORMANCE */}
      {activeHRTab === 'performance' && (
         <div className="animate-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-[32px] border-slate-100 shadow-sm flex justify-between items-center mb-6">
               <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Leaderboard Kontribusi</h4>
               <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['day', 'week', 'month'] as const).map(p => (
                    <button key={p} onClick={() => setPerfPeriod(p)} className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${perfPeriod === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                       {p === 'day' ? 'Hari Ini' : p === 'week' ? '7 Hari' : 'Bulan Ini'}
                    </button>
                  ))}
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {performanceScores.slice(0, 10).map((perf, idx) => (
                  <div key={perf.staff.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 group">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-orange-50 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</div>
                     <div className="flex-1">
                        <p className="text-[11px] font-black text-slate-800 uppercase">{perf.staff.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Sales: Rp {perf.totalSales.toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-black text-indigo-600">{perf.finalScore} PTS</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* MODAL: DATABASE EDITOR (Tetap komplit dengan data profil lengkap) */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-5xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0 bg-white sticky top-0 z-20">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingStaff ? 'Update Konfigurasi Kru' : 'Daftarkan Kru Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {/* SEKSI 1: IDENTITAS & SHIFT */}
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">1. Identitas & Shift</p>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Lengkap</label>
                         <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Username</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Password</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Shift Mulai</label>
                            <input type="time" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.shiftStartTime} onChange={e => setFormData({...formData, shiftStartTime: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Shift Selesai</label>
                            <input type="time" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.shiftEndTime} onChange={e => setFormData({...formData, shiftEndTime: e.target.value})} />
                         </div>
                      </div>
                   </div>

                   {/* SEKSI 2: SOSIAL MEDIA & KONTAK */}
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">2. Kontak & Media Sosial</p>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">No. WhatsApp</label>
                         <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0812..." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Instagram</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-[10px]" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="@user" />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">TikTok</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-[10px]" value={formData.tiktok} onChange={e => setFormData({...formData, tiktok: e.target.value})} placeholder="@user" />
                         </div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                         <p className="text-[8px] font-black text-orange-500 uppercase mb-2">Darurat (Emergency Contact):</p>
                         <div className="space-y-3">
                            <input type="text" className="w-full p-2.5 bg-white border border-orange-200 rounded-lg text-[10px] font-bold" placeholder="Nama Wali" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} />
                            <input type="text" className="w-full p-2.5 bg-white border border-orange-200 rounded-lg text-[10px] font-bold" placeholder="No. HP Wali" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} />
                         </div>
                      </div>
                   </div>
                   
                   {/* SEKSI 3: TARGET & PERMISSIONS */}
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b pb-2">3. Target & Hak Akses</p>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Target Sales</label>
                            <input type="number" className="w-full p-3 bg-white border-2 border-indigo-50 rounded-xl font-black text-xs" value={formData.dailySalesTarget} onChange={e => setFormData({...formData, dailySalesTarget: parseInt(e.target.value) || 0})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Bonus Target</label>
                            <input type="number" className="w-full p-3 bg-white border-2 border-green-50 rounded-xl font-black text-xs text-green-600" value={formData.targetBonusAmount} onChange={e => setFormData({...formData, targetBonusAmount: parseInt(e.target.value) || 0})} />
                         </div>
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Role Jabatan</label>
                         <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                         </select>
                      </div>
                      <div className="p-5 bg-slate-900 rounded-3xl text-white">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Penempatan Cabang:</p>
                         <div className="flex flex-wrap gap-2">
                            {outlets.map(o => (
                               <button 
                                key={o.id} 
                                onClick={() => {
                                  const current = formData.assignedOutletIds || [];
                                  const next = current.includes(o.id) ? current.filter(id => id !== o.id) : [...current, o.id];
                                  setFormData({...formData, assignedOutletIds: next});
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${formData.assignedOutletIds?.includes(o.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-transparent border-white/10 text-white/40'}`}>
                                 {o.name}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50 shrink-0">
                <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all">SIMPAN DOSSIER KRU 💾</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
