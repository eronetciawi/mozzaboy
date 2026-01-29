
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
    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [selectedOutletId], status: 'ACTIVE',
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

  // --- ANALYTICS LOGIC: FILTERED ATTENDANCE ---
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const d = new Date(a.date);
      const isCorrectOutlet = staff.find(s => s.id === a.staffId)?.assignedOutletIds.includes(selectedOutletId);
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
    
    staff.filter(s => s.assignedOutletIds.includes(selectedOutletId)).forEach(s => {
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

  // --- ANALYTICS LOGIC: LEAVE RECAP ---
  const leaveAnalytics = useMemo(() => {
     const map: Record<string, { totalDays: number, count: number }> = {};
     leaveRequests.forEach(l => {
        const d = new Date(l.startDate);
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && l.status === 'APPROVED') {
           if (!map[l.staffId]) map[l.staffId] = { totalDays: 0, count: 0 };
           const diffTime = Math.abs(new Date(l.endDate).getTime() - new Date(l.startDate).getTime());
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
           map[l.staffId].totalDays += diffDays;
           map[l.staffId].count += 1;
        }
     });
     return map;
  }, [leaveRequests, selectedMonth, selectedYear]);

  // --- ANALYTICS LOGIC: PERFORMANCE PERIODIC SCORING ---
  const performanceScores = useMemo(() => {
    const now = new Date();
    const anchor = new Date();
    if (perfPeriod === 'week') anchor.setDate(now.getDate() - 7);
    if (perfPeriod === 'day') anchor.setHours(0,0,0,0);
    if (perfPeriod === 'month') anchor.setDate(1);

    const periodTxs = transactions.filter(tx => tx.outletId === selectedOutletId && tx.status === OrderStatus.CLOSED && new Date(tx.timestamp) >= anchor);
    const periodAttend = attendance.filter(a => new Date(a.date) >= anchor);
    
    return staff
      .filter(s => s.assignedOutletIds.includes(selectedOutletId))
      .map(s => {
        // Sales Score
        const totalSales = periodTxs.filter(tx => tx.cashierId === s.id).reduce((acc, tx) => acc + tx.total, 0);
        const targetPerMonth = s.dailySalesTarget || 1500000;
        let periodTarget = targetPerMonth;
        if (perfPeriod === 'day') periodTarget = targetPerMonth / 30;
        if (perfPeriod === 'week') periodTarget = (targetPerMonth / 30) * 7;
        
        const salesProgress = Math.min(100, (totalSales / periodTarget) * 100);

        // discipline Score
        const myAttends = periodAttend.filter(a => a.staffId === s.id);
        const lates = myAttends.filter(a => a.status === 'LATE').length;
        const disciplineScore = myAttends.length > 0 ? Math.round(((myAttends.length - lates) / myAttends.length) * 100) : 100;

        const finalScore = Math.round((salesProgress * 0.6) + (disciplineScore * 0.4)); // Sales weighted more

        return { staff: s, totalSales, disciplineScore, salesProgress, finalScore };
      }).sort((a, b) => b.finalScore - a.finalScore);
  }, [staff, transactions, attendance, selectedOutletId, perfPeriod]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Enterprise HR Hub</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Pusat Kendali Kru, Absensi & Performa Analytics</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveHRTab('employees')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'employees' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Database</button>
           <button onClick={() => setActiveHRTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'attendance' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Absensi</button>
           <button onClick={() => setActiveHRTab('leaves')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${activeHRTab === 'leaves' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Izin/Cuti {leaveRequests.filter(l => l.status === 'PENDING').length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">{leaveRequests.filter(l => l.status === 'PENDING').length}</span>}</button>
           <button onClick={() => setActiveHRTab('performance')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'performance' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Score</button>
        </div>
      </div>

      {/* TAB: DATABASE EMPLOYEES */}
      {activeHRTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kru Terdaftar</h3>
             <button onClick={() => { setEditingStaff(null); setShowModal(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase shadow-lg hover:bg-orange-500 transition-all">+ Kru Baru</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group active:scale-[0.99] transition-all">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-[24px] bg-slate-50 overflow-hidden border-2 border-white shadow-md">
                      <img src={member.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt="Staff" className="w-full h-full object-cover" />
                   </div>
                   <div>
                      <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{member.name}</h4>
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

      {/* TAB: ATTENDANCE HUB (PERIODIC ANALYTICS) */}
      {activeHRTab === 'attendance' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Audit Absensi Cabang</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Laporan kedisiplinan dan riwayat jam kerja karyawan</p>
                 </div>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly', 'all'] as const).map(v => (
                       <button key={v} onClick={() => setAttendanceView(v)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${attendanceView === v ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>
                          {v === 'daily' ? 'Hari Ini' : v === 'weekly' ? 'Mingguan' : v === 'monthly' ? 'Bulanan' : 'Semua'}
                       </button>
                    ))}
                 </div>
              </div>

              {(attendanceView === 'monthly' || attendanceView === 'all') && (
                 <div className="flex gap-2 justify-center border-t pt-4">
                    <select className="p-2 bg-slate-50 border rounded-lg text-[10px] font-black uppercase" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="p-2 bg-slate-50 border rounded-lg text-[10px] font-black uppercase" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                       {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              )}
           </div>

           {attendanceView === 'daily' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 {staff.filter(s => s.assignedOutletIds.includes(selectedOutletId)).map(s => {
                    const record = filteredAttendance.find(a => a.staffId === s.id);
                    return (
                       <div key={s.id} className={`bg-white p-5 rounded-3xl border-2 transition-all ${record ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-60'}`}>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{record ? '👤' : '💤'}</div>
                                <div>
                                   <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{s.name}</h5>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">Shift: {s.shiftStartTime}</p>
                                </div>
                             </div>
                             {record && (
                                <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${record.status === 'LATE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                   {record.status}
                                </span>
                             )}
                          </div>
                          {record ? (
                             <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                   <div className="bg-slate-50 p-2 rounded-xl text-center">
                                      <p className="text-[6px] font-black text-slate-400 uppercase">Clock In</p>
                                      <p className="text-[10px] font-black text-slate-700">{new Date(record.clockIn).toLocaleTimeString()}</p>
                                   </div>
                                   <div className="bg-slate-50 p-2 rounded-xl text-center">
                                      <p className="text-[6px] font-black text-slate-400 uppercase">Clock Out</p>
                                      <p className="text-[10px] font-black text-slate-700">{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '--:--'}</p>
                                   </div>
                                </div>
                                {record.latitude && (
                                   <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
                                      <span className="text-[10px]">📍</span>
                                      <p className="text-[7px] font-black text-indigo-600 uppercase">Audit Lokasi: Terverifikasi Cabang</p>
                                   </div>
                                )}
                             </div>
                          ) : <div className="py-4 text-center text-[9px] text-slate-300 font-black uppercase italic tracking-widest">Belum Datang</div>}
                       </div>
                    );
                 })}
              </div>
           ) : (
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
           )}
        </div>
      )}

      {/* TAB: LEAVE & PERMISSIONS (ANALYTICS) */}
      {activeHRTab === 'leaves' && (
        <div className="space-y-6">
           {/* RECAP ANALYTICS */}
           <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl transform rotate-12">🗓️</div>
              <h4 className="text-sm font-black uppercase tracking-tighter mb-8 text-orange-500">Rekapitulasi Izin {months[selectedMonth]} {selectedYear}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {staff.filter(s => s.assignedOutletIds.includes(selectedOutletId)).map(s => {
                    const data = leaveAnalytics[s.id] || { totalDays: 0, count: 0 };
                    return (
                       <div key={s.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center">
                          <div>
                             <h5 className="text-[11px] font-black uppercase leading-tight">{s.name}</h5>
                             <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{data.count}x Izin Terdata</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-white">{data.totalDays}</p>
                             <p className="text-[7px] font-black text-slate-500 uppercase">Hari Libur</p>
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Log Pengajuan Izin</h4>
                 <div className="flex gap-2">
                    <select className="p-2 bg-slate-50 border rounded-lg text-[9px] font-black uppercase" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                 </div>
              </div>
              <div className="space-y-3">
                 {leaveRequests.length === 0 ? (
                   <div className="py-20 text-center opacity-30">
                      <span className="text-4xl mb-4 block">💌</span>
                      <p className="text-[10px] font-black uppercase italic">Tidak ada pengajuan izin</p>
                   </div>
                 ) : (
                   leaveRequests.filter(l => {
                      const ld = new Date(l.startDate);
                      return ld.getMonth() === selectedMonth && ld.getFullYear() === selectedYear;
                   }).map(leave => (
                    <div key={leave.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                       <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100">🗓️</div>
                          <div>
                             <h5 className="text-[11px] font-black text-slate-800 uppercase">{leave.staffName}</h5>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                             <p className="text-[10px] text-slate-500 italic mt-1 font-medium">"{leave.reason}"</p>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 w-full md:w-auto">
                          {leave.status === 'PENDING' ? (
                            <>
                               <button onClick={() => updateLeaveStatus(leave.id, 'APPROVED')} className="flex-1 px-6 py-2.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Setujui</button>
                               <button onClick={() => updateLeaveStatus(leave.id, 'REJECTED')} className="flex-1 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase border border-red-100">Tolak</button>
                            </>
                          ) : (
                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {leave.status}
                            </span>
                          )}
                       </div>
                    </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* TAB: PERFORMANCE SCORECARD (PERIODIC ANALYTICS) */}
      {activeHRTab === 'performance' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[32px] border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Leaderboard & Performa Detail</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Evaluasi berdasarkan target sales dan kedisiplinan</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {(['day', 'week', 'month'] as const).map(p => (
                   <button key={p} onClick={() => setPerfPeriod(p)} className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${perfPeriod === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                      {p === 'day' ? 'Hari Ini' : p === 'week' ? '7 Hari' : 'Bulan Ini'}
                   </button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col h-full">
                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8 border-b pb-4">Ranking Kontribusi Karyawan</h4>
                 <div className="space-y-4 flex-1">
                    {performanceScores.map((perf, idx) => (
                      <div key={perf.staff.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-orange-200 transition-all">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>
                            {idx + 1}
                         </div>
                         <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-white">
                            <img src={perf.staff.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${perf.staff.name}`} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-black text-slate-800 uppercase truncate leading-none">{perf.staff.name}</h5>
                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Sales: Rp {perf.totalSales.toLocaleString()}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-indigo-600 leading-none">{perf.finalScore} PTS</p>
                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Global Score</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white flex flex-col relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest mb-10 text-orange-500 border-b border-white/10 pb-4 relative z-10">Matrix Detail Performa</h4>
                 <div className="space-y-8 flex-1 relative z-10">
                    {performanceScores.map(perf => (
                       <div key={perf.staff.id} className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                             <span className="text-slate-400">{perf.staff.name}</span>
                             <div className="flex gap-4">
                                <span className="text-blue-400">{Math.round(perf.salesProgress)}% Sales</span>
                                <span className={perf.disciplineScore < 80 ? 'text-red-400' : 'text-green-400'}>{perf.disciplineScore}% Disiplin</span>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.round(perf.salesProgress)}%` }}></div>
                             <div className={`h-full transition-all duration-1000 ${perf.disciplineScore < 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${perf.disciplineScore}%` }}></div>
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="mt-10 p-5 bg-white/5 rounded-3xl border border-white/10 relative z-10">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Evaluasi System:</p>
                    <p className="text-[10px] text-slate-300 leading-relaxed italic">"Skor dihitung dari pencapaian target sales harian ({perfPeriod}) dan ketepatan jam masuk kerja. Pertimbangkan bonus bagi kru dengan skor > 90."</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FULL SCREEN MODAL: DATABASE EDITOR */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-4xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingStaff ? 'Update Konfigurasi Kru' : 'Daftarkan Kru Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">1. Identitas & Jadwal Shift</p>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Lengkap</label>
                         <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Username Login</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Password</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Jam Mulai Kerja</label>
                            <input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={formData.shiftStartTime} onChange={e => setFormData({...formData, shiftStartTime: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Jam Selesai Kerja</label>
                            <input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={formData.shiftEndTime} onChange={e => setFormData({...formData, shiftEndTime: e.target.value})} />
                         </div>
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Hari Libur Mingguan</label>
                         <select className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={formData.weeklyOffDay} onChange={e => setFormData({...formData, weeklyOffDay: parseInt(e.target.value)})}>
                            {days.map((day, i) => <option key={i} value={i}>{day}</option>)}
                         </select>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">2. Kompensasi & Target</p>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Target Sales Harian</label>
                            <input type="number" className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-sm" value={formData.dailySalesTarget} onChange={e => setFormData({...formData, dailySalesTarget: parseInt(e.target.value) || 0})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Bonus Target (Rp)</label>
                            <input type="number" className="w-full p-4 bg-white border-2 border-green-100 rounded-2xl font-black text-sm text-green-600" value={formData.targetBonusAmount} onChange={e => setFormData({...formData, targetBonusAmount: parseInt(e.target.value) || 0})} />
                         </div>
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Role & Jabatan</label>
                         <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                         </select>
                      </div>
                      <div className="p-6 bg-slate-900 rounded-3xl text-white">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Akses Cabang:</p>
                         <div className="flex flex-wrap gap-2">
                            {outlets.map(o => (
                               <button 
                                key={o.id} 
                                onClick={() => {
                                  const current = formData.assignedOutletIds || [];
                                  const next = current.includes(o.id) ? current.filter(id => id !== o.id) : [...current, o.id];
                                  setFormData({...formData, assignedOutletIds: next});
                                }}
                                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${formData.assignedOutletIds?.includes(o.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-transparent border-white/10 text-white/40'}`}>
                                 {o.name}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95 transition-all">SIMPAN PERUBAHAN DATABASE 💾</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
