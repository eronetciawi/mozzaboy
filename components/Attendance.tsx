
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { StaffMember } from '../types';

export const Attendance: React.FC = () => {
  const { currentUser, clockIn, clockOut, attendance, leaveRequests, submitLeave, transactions, updateStaff } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'clock' | 'performance' | 'leave' | 'profile'>('clock');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDates, setLeaveDates] = useState({ start: '', end: '' });

  // State for profile editing
  const [profileForm, setProfileForm] = useState<Partial<StaffMember>>(currentUser || {});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const myAttendanceRecords = useMemo(() => 
    [...attendance].filter(a => a.staffId === currentUser.id).sort((a,b) => b.date.localeCompare(a.date)),
    [attendance, currentUser.id]
  );
  
  const myAttendanceToday = myAttendanceRecords.find(a => a.date === todayStr);
  const myLeaveRequests = useMemo(() => 
    [...leaveRequests].filter(l => l.staffId === currentUser.id).sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [leaveRequests, currentUser.id]
  );

  const targetSales = currentUser.dailySalesTarget || 0;
  const bonusPerTarget = currentUser.targetBonusAmount || 0;

  const myTransactions = useMemo(() => 
    transactions.filter(tx => tx.cashierId === currentUser.id && tx.status === 'CLOSED'),
    [transactions, currentUser.id]
  );

  const salesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    myTransactions.forEach(tx => {
      const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
      map[dateKey] = (map[dateKey] || 0) + tx.total;
    });
    return map;
  }, [myTransactions]);

  const mySalesToday = salesByDate[todayStr] || 0;
  const progressPercent = targetSales > 0 ? Math.min(100, Math.round((mySalesToday / targetSales) * 100)) : 0;
  const isTargetAchievedToday = targetSales > 0 && mySalesToday >= targetSales;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const incentiveHistory = useMemo(() => {
    const dates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));
    return dates.map(date => {
      const sales = salesByDate[date];
      const reached = targetSales > 0 && sales >= targetSales;
      return { date, sales, reached, bonus: reached ? bonusPerTarget : 0 };
    });
  }, [salesByDate, targetSales, bonusPerTarget]);

  const totalBonusMonth = incentiveHistory
    .filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, h) => acc + h.bonus, 0);

  const totalAttends = myAttendanceRecords.length;
  const totalLates = myAttendanceRecords.filter(a => a.status === 'LATE').length;
  const perfScore = totalAttends > 0 ? Math.round(((totalAttends - totalLates) / totalAttends) * 100) : 100;

  const getDayName = (dayIdx: number) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayIdx];

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveDates.start || !leaveDates.end) return alert("Mohon lengkapi data izin!");
    submitLeave({
      startDate: new Date(leaveDates.start),
      endDate: new Date(leaveDates.end),
      reason: leaveReason
    });
    setLeaveReason('');
    setLeaveDates({ start: '', end: '' });
    alert("Pengajuan izin berhasil dikirim ke Manager!");
  };

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      updateStaff({ ...currentUser, ...profileForm } as StaffMember);
      setIsSavingProfile(false);
      alert("Profil Anda berhasil diperbarui!");
    }, 800);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">My Portal</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Employee Self-Service</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full w-full md:w-auto">
           <button onClick={() => setActiveSubTab('clock')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'clock' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400'}`}>Clock</button>
           <button onClick={() => setActiveSubTab('performance')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'performance' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Performa</button>
           <button onClick={() => setActiveSubTab('leave')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'leave' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Cuti</button>
           <button onClick={() => setActiveSubTab('profile')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'profile' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Profil</button>
        </div>
      </div>

      {activeSubTab === 'clock' && (
        <div className="flex flex-col gap-6">
           <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl mb-4">⏰</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-1">Shift Kerja</h3>
              <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black mb-4 uppercase tracking-widest">
                 {currentUser.shiftStartTime || '09:00'} - {currentUser.shiftEndTime || '18:00'}
              </div>
              
              {!myAttendanceToday ? (
                <button onClick={() => clockIn()} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">CHECK-IN MASUK 🚀</button>
              ) : (
                <div className="w-full space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                         <p className="text-[8px] font-black text-green-600 uppercase mb-1">Masuk</p>
                         <p className="text-sm font-black text-slate-800">{new Date(myAttendanceToday.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                         <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Pulang</p>
                         <p className="text-sm font-black text-slate-800">{myAttendanceToday.clockOut ? new Date(myAttendanceToday.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                      </div>
                   </div>
                   {!myAttendanceToday.clockOut && (
                     <button onClick={() => clockOut()} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">CHECK-OUT PULANG 👋</button>
                   )}
                </div>
              )}
           </div>

           <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">💰</div>
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-4">Target Penjualan Hari Ini</p>
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <p className="text-2xl font-black text-white">Rp {mySalesToday.toLocaleString()}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Tercapai dari Rp {targetSales.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-black text-green-400">{progressPercent}%</p>
                 </div>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 ${isTargetAchievedToday ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'performance' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           {/* Summary Cards */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                 <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Skor Disiplin</p>
                 <h4 className="text-2xl font-black text-slate-800">{perfScore}%</h4>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                 <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Bonus Bulan Ini</p>
                 <h4 className="text-lg font-black text-green-600">Rp {totalBonusMonth.toLocaleString()}</h4>
              </div>
           </div>

           {/* Incentive Logs */}
           <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Riwayat Insentif Harian</h4>
              <div className="space-y-2">
                 {incentiveHistory.length === 0 ? (
                    <p className="text-[10px] text-center py-10 bg-white rounded-3xl border border-dashed text-slate-300 italic">Belum ada riwayat penjualan.</p>
                 ) : (
                    incentiveHistory.map((h, i) => (
                       <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                          <div>
                             <p className="text-[10px] font-black text-slate-800">{new Date(h.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Sales: Rp {h.sales.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                             {h.reached ? (
                                <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded-lg">+Rp {h.bonus.toLocaleString()}</span>
                             ) : (
                                <span className="text-[8px] font-black text-slate-300 uppercase">Missed Target</span>
                             )}
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </section>

           {/* Attendance Logs */}
           <section className="pb-20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Log Absensi Terakhir</h4>
              <div className="space-y-2">
                 {myAttendanceRecords.slice(0, 10).map((a, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                       <div className="flex gap-3 items-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                             {a.status === 'LATE' ? '⏳' : '✅'}
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-800 uppercase">{new Date(a.date).toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short'})}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Active'}</p>
                          </div>
                       </div>
                       <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-md ${a.status === 'LATE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {a.status}
                       </span>
                    </div>
                 ))}
              </div>
           </section>
        </div>
      )}

      {activeSubTab === 'leave' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           {/* Leave Form */}
           <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ajukan Izin / Cuti Baru</h4>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Mulai</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black" value={leaveDates.start} onChange={e => setLeaveDates({...leaveDates, start: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sampai</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black" value={leaveDates.end} onChange={e => setLeaveDates({...leaveDates, end: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Alasan Izin</label>
                    <textarea className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold h-20" placeholder="Contoh: Acara keluarga, Sakit, dsb..." value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                 </div>
                 <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-500 transition-all">Kirim Pengajuan</button>
              </form>
           </div>

           {/* Leave History */}
           <section className="pb-20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Riwayat Pengajuan Cuti</h4>
              <div className="space-y-3">
                 {myLeaveRequests.length === 0 ? (
                    <p className="text-[10px] text-center py-10 bg-white rounded-3xl border border-dashed text-slate-300 italic">Belum ada pengajuan cuti.</p>
                 ) : (
                    myLeaveRequests.map(l => (
                       <div key={l.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group transition-all hover:border-orange-200">
                          <div className="flex justify-between items-start mb-3">
                             <div>
                                <p className="text-[9px] font-black text-slate-800 uppercase">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Diajukan: {new Date(l.requestedAt).toLocaleDateString()}</p>
                             </div>
                             <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-md ${
                                l.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                                l.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                             }`}>
                                {l.status}
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium italic">"{l.reason}"</p>
                       </div>
                    ))
                 )}
              </div>
           </section>
        </div>
      )}

      {activeSubTab === 'profile' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-6">
                 <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl flex flex-col items-center text-center">
                    <div className="relative group mb-4">
                       <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-slate-50 border-4 border-white shadow-xl">
                          <img 
                            src={profileForm.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                       </div>
                       <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white text-xs">📷</button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setProfileForm({...profileForm, photo: reader.result as string});
                             reader.readAsDataURL(file);
                          }
                       }} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">{currentUser.name}</h3>
                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">{currentUser.role}</p>
                    <div className="w-full h-px bg-slate-100 my-4"></div>
                    <div className="w-full space-y-2">
                       <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                          <span>Staff ID</span>
                          <span className="text-slate-800">{currentUser.id}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                 <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
                    <div>
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Kontak Karyawan</h4>
                       <div className="space-y-4">
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">No. WhatsApp</label>
                             <input type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 text-xs" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Email</label>
                             <input type="email" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 text-xs" value={profileForm.email || ''} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Alamat</label>
                             <textarea className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 text-xs h-20" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                          </div>
                       </div>
                    </div>
                    <button disabled={isSavingProfile} onClick={handleSaveProfile} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all flex items-center justify-center gap-3 ${isSavingProfile ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-orange-600'}`}>
                       {isSavingProfile ? 'MEMPROSES...' : 'SIMPAN PERBARUAN PROFIL 💾'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
