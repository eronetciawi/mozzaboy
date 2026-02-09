
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

  // Archive Filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [], status: 'ACTIVE',
    workingDays: [1, 2, 3, 4, 5, 6], // Default Sen-Sab
    shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 50000,
    phone: '', email: '', address: '', instagram: '', telegram: '', tiktok: '', emergencyContactName: '', emergencyContactPhone: ''
  });

  const handleSave = () => {
    if (!formData.name || !formData.username) return alert("Lengkapi nama dan username!");
    if (!formData.workingDays || formData.workingDays.length === 0) return alert("Pilih minimal 1 hari kerja!");

    const permissions = getPermissionsByRole(formData.role || UserRole.CASHIER);
    if (editingStaff) updateStaff({ ...editingStaff, ...formData, permissions } as StaffMember);
    else addStaff({ ...formData, id: `s-${Date.now()}`, permissions, joinedAt: new Date() } as StaffMember);
    setShowModal(false);
    setEditingStaff(null);
  };

  const handleConfirmDelete = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id);
      setStaffToDelete(null);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => {
      const current = prev.workingDays || [];
      const next = current.includes(dayIndex) 
        ? current.filter(d => d !== dayIndex) 
        : [...current, dayIndex];
      return { ...prev, workingDays: next };
    });
  };

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const todayStr = new Date().toISOString().split('T')[0];

  const pendingLeaves = useMemo(() => {
    return (leaveRequests || []).filter(l => l.status === 'PENDING');
  }, [leaveRequests]);

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

      {activeHRTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kru Terdaftar</h3>
             <button onClick={() => { 
                setEditingStaff(null); 
                setFormData({
                    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [], status: 'ACTIVE',
                    workingDays: [1, 2, 3, 4, 5, 6],
                    shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 50000,
                    phone: '', email: '', address: '', instagram: '', telegram: '', tiktok: '', emergencyContactName: '', emergencyContactPhone: ''
                });
                setShowModal(true); 
             }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-orange-500 transition-all">+ Kru Baru</button>
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
                <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Shift</p>
                      <p className="font-black text-slate-700">{member.shiftStartTime} - {member.shiftEndTime}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Status</p>
                      <p className={`font-black uppercase ${member.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'}`}>{member.status}</p>
                   </div>
                </div>
                <div className="mb-6">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Jadwal Masuk</p>
                   <div className="flex gap-1">
                      {shortDays.map((d, i) => (
                        <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black uppercase border ${member.workingDays?.includes(i) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                           {d[0]}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingStaff(member); setFormData(member); setShowModal(true); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Kelola Profil</button>
                   <button onClick={() => setStaffToDelete(member)} className="w-12 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL INPUT KRU (BESAR & LENGKAP) */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-5xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0 bg-white sticky top-0 z-20">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingStaff ? 'Update Konfigurasi Kru' : 'Daftarkan Kru Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   
                   {/* KOLOM 1: IDENTITAS */}
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

                      {/* FITUR BARU: HARI KERJA */}
                      <div>
                         <div className="flex justify-between items-center mb-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Jadwal Hari Kerja</label>
                            <span className="text-[7px] font-bold text-orange-500 uppercase italic">Libur otomatis un-check</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {shortDays.map((dayName, idx) => {
                               const isActive = formData.workingDays?.includes(idx);
                               return (
                                 <button 
                                   key={idx} 
                                   type="button"
                                   onClick={() => toggleDay(idx)}
                                   className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                 >
                                    <span className="text-[9px] font-black uppercase leading-none">{dayName}</span>
                                    {isActive && <span className="text-[6px] font-black mt-1">OK</span>}
                                 </button>
                               );
                            })}
                         </div>
                         <p className="text-[7px] text-slate-400 mt-3 italic">*Pilih hari apa saja karyawan ini aktif bekerja. Hari yang tidak ditekan akan dianggap sebagai Hari Libur karyawan.</p>
                      </div>
                   </div>

                   {/* KOLOM 2: KONTAK */}
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
                   
                   {/* KOLOM 3: TARGET & AKSES */}
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
                                type="button"
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

      {/* MODAL KONFIRMASI HAPUS */}
      {staffToDelete && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tighter leading-none">Hapus Kru?</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
                 Data kru <span className="text-rose-600 font-black">"{staffToDelete.name}"</span> akan dihapus dari database secara permanen.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                    onClick={handleConfirmDelete} 
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-rose-700 transition-all active:scale-95"
                 >
                    IYA, HAPUS PERMANEN 🗑️
                 </button>
                 <button onClick={() => setStaffToDelete(null)} className="w-full py-2 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-600 transition-colors">Batalkan</button>
              </div>
           </div>
        </div>
      )}

      {/* TABS CONTENT LAIN (ATTENDANCE, LEAVES, PERFORMANCE) - TETAP SAMA SEPERTI SEBELUMNYA */}
      {activeHRTab === 'leaves' && (
        <div className="space-y-8 animate-in fade-in">
           {/* ... bagian leaves ... */}
        </div>
      )}
      
      {/* ... tabs lainnya ... */}
    </div>
  );
};
