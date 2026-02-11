
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
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [], status: 'ACTIVE',
    workingDays: [1, 2, 3, 4, 5, 6], 
    shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 50000,
    phone: '', email: '', address: '', instagram: '', telegram: '', tiktok: '', emergencyContactName: '', emergencyContactPhone: ''
  });

  const handleSave = () => {
    if (!formData.name || !formData.username) return alert("Lengkapi data!");
    const permissions = getPermissionsByRole(formData.role || UserRole.CASHIER);
    if (editingStaff) updateStaff({ ...editingStaff, ...formData, permissions } as StaffMember);
    else addStaff({ ...formData, id: `s-${Date.now()}`, permissions, joinedAt: new Date() } as StaffMember);
    setShowModal(false);
    setEditingStaff(null);
  };

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => {
      const current = prev.workingDays || [];
      const next = current.includes(dayIndex) ? current.filter(d => d !== dayIndex) : [...current, dayIndex];
      return { ...prev, workingDays: next };
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingLeaves = useMemo(() => (leaveRequests || []).filter(l => l.status === 'PENDING'), [leaveRequests]);

  const archiveLeaves = useMemo(() => {
    return (leaveRequests || []).filter(l => {
      const ld = new Date(l.startDate);
      const isArchived = l.status !== 'PENDING';
      const outletMatches = selectedOutletId === 'all' || l.outletId === selectedOutletId;
      const dateMatches = ld.getMonth() === selectedMonth && ld.getFullYear() === selectedYear;
      return isArchived && outletMatches && dateMatches;
    });
  }, [leaveRequests, selectedOutletId, selectedMonth, selectedYear]);

  const filteredAttendance = useMemo(() => {
    return (attendance || []).filter(a => {
      const d = new Date(a.date);
      // Filter Outlet Langsung dari Record Absensi (Lebih Akurat)
      const isCorrectOutlet = selectedOutletId === 'all' || a.outletId === selectedOutletId;
      if (!isCorrectOutlet) return false;
      
      if (attendanceView === 'daily') return a.date === todayStr;
      if (attendanceView === 'monthly') return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      return true;
    });
  }, [attendance, attendanceView, todayStr, selectedMonth, selectedYear, selectedOutletId]);

  const performanceScores = useMemo(() => {
    const now = new Date();
    let start = new Date();
    if (perfPeriod === 'day') start.setHours(0, 0, 0, 0);
    else if (perfPeriod === 'week') start.setDate(now.getDate() - 7);
    else if (perfPeriod === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);

    return staff
      .filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId))
      .map(s => {
        const periodTxs = transactions.filter(t => t.cashierId === s.id && t.status === OrderStatus.CLOSED && new Date(t.timestamp) >= start);
        const totalSales = periodTxs.reduce((acc, t) => acc + (t.total || 0), 0);
        const periodAttendance = attendance.filter(a => new Date(a.date) >= start && a.staffId === s.id);
        const lateCount = periodAttendance.filter(a => a.status === 'LATE').length;
        const finalScore = Math.max(0, Math.floor(totalSales / 10000) + (periodAttendance.length * 10) - (lateCount * 15));
        return { staff: s, totalSales, attendCount: periodAttendance.length, lateCount, finalScore };
      }).sort((a, b) => b.finalScore - a.finalScore);
  }, [staff, transactions, attendance, selectedOutletId, perfPeriod]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Enterprise HR Hub</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Kru, Absensi & Cuti</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
           {(['employees', 'attendance', 'leaves', 'performance'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveHRTab(tab)} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all relative ${activeHRTab === tab ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>
               {tab === 'employees' ? 'Kru' : tab === 'attendance' ? 'Absensi' : tab === 'leaves' ? 'Cuti' : 'Skor'}
               {tab === 'leaves' && pendingLeaves.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{pendingLeaves.length}</span>}
             </button>
           ))}
        </div>
      </div>

      {activeHRTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Kru</h3>
             <button onClick={() => { setEditingStaff(null); setFormData({name: '', username: '', role: UserRole.CASHIER, workingDays: [1,2,3,4,5,6]}); setShowModal(true); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">+ Kru Baru</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.filter(s => selectedOutletId === 'all' || s.assignedOutletIds.includes(selectedOutletId)).map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                      <img src={member.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} className="w-full h-full object-cover" />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate">{member.name}</h4>
                      <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">{member.role}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-6">
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Shift</p>
                      <p className="text-[10px] font-black text-slate-700">{member.shiftStartTime} - {member.shiftEndTime}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Status</p>
                      <p className={`text-[10px] font-black uppercase ${member.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'}`}>{member.status}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingStaff(member); setFormData(member); setShowModal(true); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Edit</button>
                   <button onClick={() => setStaffToDelete(member)} className="w-12 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeHRTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log Kehadiran</h3>
             <select className="bg-white border rounded-lg px-3 py-1.5 text-[9px] font-black uppercase outline-none" value={attendanceView} onChange={e => setAttendanceView(e.target.value as any)}>
                <option value="daily">Hari Ini</option>
                <option value="monthly">Bulanan</option>
                <option value="all">Semua</option>
             </select>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <tr>
                      <th className="py-5 px-8">Karyawan</th>
                      <th className="py-5 px-4">Tanggal</th>
                      <th className="py-5 px-4 text-center">Masuk</th>
                      <th className="py-5 px-4 text-center">Keluar</th>
                      <th className="py-5 px-8 text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                   {filteredAttendance.map(a => (
                     <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-8 font-black uppercase text-slate-800">{a.staffName}</td>
                        <td className="py-4 px-4 text-slate-400 font-bold">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-center font-mono font-black">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                        <td className="py-4 px-4 text-center font-mono font-black">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                        <td className="py-4 px-8 text-right">
                           <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${a.status === 'LATE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {a.status}
                           </span>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeHRTab === 'leaves' && (
        <div className="space-y-8">
           <section>
              <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4 ml-2">Menunggu Persetujuan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {pendingLeaves.map(l => (
                   <div key={l.id} className="bg-white p-6 rounded-[32px] border-2 border-orange-100 shadow-xl flex flex-col justify-between">
                      <div>
                         <div className="flex justify-between items-start mb-4">
                            <h4 className="text-sm font-black text-slate-800 uppercase">{l.staffName}</h4>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(l.requestedAt).toLocaleDateString()}</span>
                         </div>
                         <p className="text-[10px] font-bold text-slate-600 uppercase mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                         </p>
                         <p className="text-xs italic text-slate-500 mb-6">"{l.reason}"</p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => updateLeaveStatus(l.id, 'APPROVED')} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95">SETUJUI ✓</button>
                         <button onClick={() => updateLeaveStatus(l.id, 'REJECTED')} className="flex-1 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-[10px] uppercase active:scale-95">TOLAK ✕</button>
                      </div>
                   </div>
                 ))}
                 {pendingLeaves.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase italic py-10 text-center col-span-full border-2 border-dashed rounded-3xl">Tidak ada pengajuan cuti tertunda</p>}
              </div>
           </section>

           <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Arsip Cuti</h3>
              <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                       <tr>
                          <th className="py-4 px-8">Nama</th>
                          <th className="py-4 px-4">Alasan</th>
                          <th className="py-4 px-8 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px]">
                       {archiveLeaves.map(l => (
                         <tr key={l.id}>
                            <td className="py-4 px-8 font-black uppercase text-slate-800">{l.staffName}</td>
                            <td className="py-4 px-4 text-slate-400 italic truncate max-w-xs">"{l.reason}"</td>
                            <td className="py-4 px-8 text-right">
                               <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${l.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>{l.status}</span>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </section>
        </div>
      )}

      {activeHRTab === 'performance' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Papan Skor Kinerja</h3>
              <div className="flex bg-slate-200 p-1 rounded-lg">
                 <button onClick={() => setPerfPeriod('day')} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${perfPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Hari</button>
                 <button onClick={() => setPerfPeriod('week')} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${perfPeriod === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Minggu</button>
                 <button onClick={() => setPerfPeriod('month')} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${perfPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Bulan</button>
              </div>
           </div>
           <div className="space-y-3">
              {performanceScores.map((score, idx) => (
                <div key={score.staff.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg transform rotate-3">{idx + 1}</div>
                      <div>
                         <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{score.staff.name}</h4>
                         <div className="flex gap-4 mt-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Sales: Rp {score.totalSales.toLocaleString()}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Hadir: {score.attendCount}x</span>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black text-indigo-600 tracking-tighter">{score.finalScore}</p>
                      <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">PTS PERFORMA</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL EDIT KRU */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-5xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-8 border-b flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingStaff ? 'Update Kru' : 'Kru Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 custom-scrollbar">
                <div className="space-y-6">
                   <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">1. Akun Login</p>
                   <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block ml-1">Nama Lengkap</label>
                      <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Username</label>
                         <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Password</label>
                         <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      </div>
                   </div>
                </div>
                <div className="space-y-6">
                   <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">2. Shift & Jadwal</p>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Masuk</label>
                         <input type="time" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.shiftStartTime} onChange={e => setFormData({...formData, shiftStartTime: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Pulang</label>
                         <input type="time" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.shiftEndTime} onChange={e => setFormData({...formData, shiftEndTime: e.target.value})} />
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-1">
                      {shortDays.map((d, i) => (
                         <button key={i} onClick={() => toggleDay(i)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-[8px] font-black border-2 transition-all ${formData.workingDays?.includes(i) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {d[0]}
                         </button>
                      ))}
                   </div>
                </div>
                <div className="space-y-6">
                   <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b pb-2">3. Jabatan & Akses</p>
                   <select className="w-full p-3 bg-slate-50 border rounded-xl font-black text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                      {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                   <div className="p-4 bg-slate-900 rounded-3xl text-white">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Penempatan Cabang:</p>
                      <div className="flex flex-wrap gap-2">
                         {outlets.map(o => (
                           <button key={o.id} onClick={() => {
                             const curr = formData.assignedOutletIds || [];
                             const next = curr.includes(o.id) ? curr.filter(id => id !== o.id) : [...curr, o.id];
                             setFormData({...formData, assignedOutletIds: next});
                           }} className={`px-2 py-1 rounded-md text-[7px] font-black uppercase border transition-all ${formData.assignedOutletIds?.includes(o.id) ? 'bg-orange-50 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                              {o.name}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
             <div className="p-6 md:p-10 border-t bg-slate-50 shrink-0">
                <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all">SIMPAN DATA KRU 💾</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS */}
      {staffToDelete && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-800 uppercase mb-8">Hapus Kru?</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed">Data <span className="text-red-600 font-black">"{staffToDelete.name}"</span> akan dihapus permanen.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => { deleteStaff(staffToDelete.id); setStaffToDelete(null); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">YA, HAPUS 🗑️</button>
                 <button onClick={() => setStaffToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
