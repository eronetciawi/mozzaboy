
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { StaffMember } from '../types';

export const Attendance: React.FC = () => {
  const { 
    currentUser, clockIn, clockOut, attendance, leaveRequests, 
    submitLeave, transactions, updateStaff, outlets, 
    selectedOutletId, fetchFromCloud 
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'clock' | 'performance' | 'leave' | 'profile'>('clock');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDates, setLeaveDates] = useState({ start: '', end: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [showLeaveSuccess, setShowLeaveSuccess] = useState(false);

  const [profileForm, setProfileForm] = useState<Partial<StaffMember>>(currentUser || {});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync data setiap kali komponen My Portal dibuka
  useEffect(() => {
    fetchFromCloud();
  }, []);

  if (!currentUser) return null;

  const activeOutlet = outlets.find(o => o.id === selectedOutletId);
  const todayStr = new Date().toISOString().split('T')[0];
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // REAKTIF: Data absensi dan cuti akan langsung kosong jika state global di store berubah (di-wipe)
  const myAttendanceRecords = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    return [...attendance]
      .filter(a => a.staffId === currentUser.id && a.outletId === selectedOutletId)
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [attendance, currentUser.id, selectedOutletId]);
  
  const myAttendanceToday = useMemo(() => 
    myAttendanceRecords.find(a => a.date === todayStr),
    [myAttendanceRecords, todayStr]
  );
  
  const myLeaveRequests = useMemo(() => {
    if (!leaveRequests || leaveRequests.length === 0) return [];
    return [...leaveRequests]
      .filter(l => l.staffId === currentUser.id && l.outletId === selectedOutletId)
      .sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [leaveRequests, currentUser.id, selectedOutletId]);

  const handleClockIn = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung Geolocation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await clockIn(pos.coords.latitude, pos.coords.longitude);
        if (result && !result.success) {
           alert(result.message);
        }
        setIsLocating(false);
      },
      (err) => {
        alert("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

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
  const remainingToTarget = Math.max(0, targetSales - mySalesToday);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const totalBonusMonth = useMemo(() => {
    let total = 0;
    Object.keys(salesByDate).forEach(date => {
      const d = new Date(date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         if (targetSales > 0 && salesByDate[date] >= targetSales) total += bonusPerTarget;
      }
    });
    return total;
  }, [salesByDate, targetSales, bonusPerTarget, currentMonth, currentYear]);

  const totalAttends = myAttendanceRecords.length;
  const totalLates = myAttendanceRecords.filter(a => a.status === 'LATE').length;
  const perfScore = totalAttends > 0 ? Math.round(((totalAttends - totalLates) / totalAttends) * 100) : 100;

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveDates.start || !leaveDates.end) return alert("Mohon lengkapi data izin!");
    
    setIsSubmittingLeave(true);
    try {
      await submitLeave({
        startDate: new Date(leaveDates.start),
        endDate: new Date(leaveDates.end),
        reason: leaveReason
      });
      
      setLeaveReason('');
      setLeaveDates({ start: '', end: '' });
      setShowLeaveSuccess(true);
      setTimeout(() => setShowLeaveSuccess(false), 4000);
    } catch (err) {
      alert("Gagal mengirim pengajuan. Cek koneksi internet Anda.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSaveProfile = () => {
    if (!profileForm.name?.trim()) return alert("Nama lengkap tidak boleh kosong.");
    setIsSavingProfile(true);
    setTimeout(() => {
      updateStaff({ ...currentUser, ...profileForm } as StaffMember);
      setIsSavingProfile(false);
      alert("Profil Anda berhasil diperbarui!");
    }, 800);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8 relative">
      
      {/* SUCCESS LEAVE NOTIFICATION */}
      {showLeaveSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-indigo-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-indigo-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">📨</div>
              <div>
                 <p className="text-[11px] font-black uppercase tracking-widest leading-none">Berhasil Dikirim</p>
                 <p className="text-[9px] font-bold text-indigo-100 uppercase mt-1">Pengajuan sedang diproses oleh Manager.</p>
              </div>
           </div>
        </div>
      )}

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
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border">
                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Geofencing Secured</p>
              </div>
              
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl mb-4">⏰</div>
              <h3 className="text-lg font-black text-slate-800 uppercase mb-1">Shift Kerja</h3>
              <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black mb-4 uppercase tracking-widest">
                 {currentUser.shiftStartTime || '09:00'} - {currentUser.shiftEndTime || '18:00'}
              </div>
              
              {!myAttendanceToday ? (
                <button 
                  disabled={isLocating}
                  onClick={handleClockIn} 
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${isLocating ? 'bg-slate-100 text-slate-400' : 'bg-orange-500 text-white shadow-orange-500/20 active:scale-95'}`}
                >
                  {isLocating ? 'MENDAPATKAN LOKASI...' : 'CHECK-IN MASUK 🚀'}
                </button>
              ) : (
                <div className="w-full space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                         <p className="text-[8px] font-black text-green-600 uppercase mb-1">Masuk</p>
                         <p className="text-sm font-black text-slate-800">{new Date(myAttendanceToday.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                         {myAttendanceToday.latitude && (
                           <p className="text-[6px] font-mono text-slate-400 mt-2">LOC: {myAttendanceToday.latitude.toFixed(4)}, {myAttendanceToday.longitude?.toFixed(4)}</p>
                         )}
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
              
              <p className="mt-6 text-[9px] text-slate-400 uppercase font-bold italic">Sesuai SOP Mozza Boy: Absensi hanya valid jika Anda berada di area outlet {activeOutlet?.name}.</p>
           </div>

           <div className={`p-8 rounded-[40px] shadow-2xl relative overflow-hidden transition-all duration-500 ${isTargetAchievedToday ? 'bg-gradient-to-br from-green-600 to-emerald-800' : 'bg-slate-900'}`}>
              <div className="absolute top-0 right-0 p-6 opacity-20 text-5xl">
                {isTargetAchievedToday ? '🏆' : '💰'}
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isTargetAchievedToday ? 'text-green-200' : 'text-orange-500'}`}>
                         Insentif Penjualan Hari Ini
                       </p>
                       <h3 className="text-3xl font-black text-white tracking-tighter">Rp {mySalesToday.toLocaleString()}</h3>
                    </div>
                 </div>

                 <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                       <span className={isTargetAchievedToday ? 'text-green-300' : ''}>Target: Rp {targetSales.toLocaleString()}</span>
                       <span className="text-white">{progressPercent}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                       <div className={`h-full transition-all duration-1000 ${isTargetAchievedToday ? 'bg-green-400' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                 </div>

                 <div className={`p-5 rounded-3xl border-2 transition-all ${isTargetAchievedToday ? 'bg-white/10 border-white/20' : 'bg-white/5 border-dashed border-white/10'}`}>
                    {isTargetAchievedToday ? (
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">✨</div>
                          <div>
                             <p className="text-xs font-black text-white uppercase">Selamat! Target Tercapai</p>
                             <p className="text-[11px] font-bold text-green-300">Bonus Rp {bonusPerTarget.toLocaleString()} telah masuk!</p>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-bold text-slate-500 italic">
                             "Cari <span className="text-white font-black">Rp {remainingToTarget.toLocaleString()}</span> lagi untuk klaim bonusmu hari ini."
                          </p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'performance' && (
        <div className="space-y-6">
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
           <section className="pb-20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Log Absensi Terakhir</h4>
              <div className="space-y-2">
                 {myAttendanceRecords.length === 0 ? (
                   <div className="py-12 text-center border-2 border-dashed rounded-[32px] opacity-30">
                      <p className="text-[9px] font-black uppercase">Belum ada riwayat absensi</p>
                   </div>
                 ) : (
                   myAttendanceRecords.slice(0, 10).map((a, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                       <div className="flex gap-3 items-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                             {a.status === 'LATE' ? '⏳' : '✅'}
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-800 uppercase">{new Date(a.date).toLocaleDateString()}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                             {a.latitude && <p className="text-[6px] text-indigo-400 font-mono">GPS TRACKED ✓</p>}
                          </div>
                       </div>
                       <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-md ${a.status === 'LATE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {a.status}
                       </span>
                    </div>
                   ))
                 )}
              </div>
           </section>
        </div>
      )}

      {activeSubTab === 'leave' && (
        <div className="space-y-8 pb-20">
           <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ajukan Izin Baru</h4>
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
                 <textarea className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold h-20" placeholder="Alasan izin..." value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                 <button 
                    disabled={isSubmittingLeave}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isSubmittingLeave ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-xl'}`}
                 >
                    {isSubmittingLeave ? 'MENGIRIM...' : 'Kirim Pengajuan Izin'}
                 </button>
              </form>
           </div>

           <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Riwayat Izin & Cuti</h4>
              <div className="space-y-3">
                 {myLeaveRequests.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed rounded-[32px] opacity-30">
                       <p className="text-[9px] font-black uppercase">Belum ada riwayat pengajuan</p>
                    </div>
                 ) : (
                    myLeaveRequests.map(leave => (
                       <div key={leave.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                             <div>
                                <p className="text-[11px] font-black text-slate-800 uppercase">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Diajukan: {new Date(leave.requestedAt).toLocaleDateString()}</p>
                             </div>
                             <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-sm ${
                                leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                leave.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                                'bg-amber-100 text-amber-700 animate-pulse border border-amber-200'
                             }`}>
                                {leave.status === 'PENDING' ? 'SEDANG DIPROSES' : leave.status}
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium italic">"{leave.reason}"</p>
                       </div>
                    ))
                 )}
              </div>
           </section>
        </div>
      )}

      {activeSubTab === 'profile' && (
        <div className="max-w-4xl mx-auto pb-20">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                 <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl flex flex-col items-center text-center">
                    <div className="relative group mb-4">
                       <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-slate-50 border-4 border-white shadow-xl">
                          <img src={profileForm.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} alt="Profile" className="w-full h-full object-cover" />
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
                    <h3 className="text-lg font-black text-slate-800 uppercase leading-tight">{currentUser.name}</h3>
                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">{currentUser.role}</p>
                 </div>
                 
                 {/* SCHEDULE INFO TILE */}
                 <div className="mt-6 bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🗓️</div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Informasi Jadwal</p>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Hari Libur Rutin</span>
                          <span className="text-xs font-black text-orange-400 uppercase tracking-wider">{days[currentUser.weeklyOffDay || 0]}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Jam Kerja</span>
                          <span className="text-xs font-black text-white">{currentUser.shiftStartTime} - {currentUser.shiftEndTime}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                 <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                    <section>
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Identitas Utama</h4>
                       <div className="grid grid-cols-1 gap-4">
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nama Lengkap (Sesuai KTP)</label>
                             <input 
                               type="text" 
                               className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-orange-500 outline-none transition-all" 
                               value={profileForm.name || ''} 
                               onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                               placeholder="Nama Lengkap"
                             />
                          </div>
                       </div>
                    </section>

                    <section className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                       <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-indigo-100 pb-2">Keamanan & Akses Akun</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Username Login</label>
                             <input type="text" disabled className="w-full p-3 bg-slate-100 border rounded-xl font-bold text-xs opacity-60" value={currentUser.username} />
                          </div>
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Ganti Password</label>
                             <input type="password" title="password" className="w-full p-3 bg-white border rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none" value={profileForm.password || ''} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="Masukkan password baru" />
                          </div>
                       </div>
                    </section>

                    <section>
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Kontak & Domisili</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">No. WhatsApp</label>
                             <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Email</label>
                             <input type="email" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={profileForm.email || ''} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                          </div>
                          <div className="md:col-span-2">
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Alamat Domisili</label>
                             <textarea title="address" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs h-16" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                          </div>
                       </div>
                    </section>

                    <section className="p-5 bg-orange-50/50 rounded-3xl border border-orange-100">
                       <h4 className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-4 border-b border-orange-100 pb-2">Kontak Darurat (Urgent)</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nama Orang Terdekat</label>
                             <input type="text" className="w-full p-3 bg-white border rounded-xl font-bold text-xs" value={profileForm.emergencyContactName || ''} onChange={e => setProfileForm({...profileForm, emergencyContactName: e.target.value})} placeholder="Misal: Ayah / Ibu / Istri" />
                          </div>
                          <div>
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">No. HP Orang Terdekat</label>
                             <input type="text" className="w-full p-3 bg-white border rounded-xl font-bold text-xs" value={profileForm.emergencyContactPhone || ''} onChange={e => setProfileForm({...profileForm, emergencyContactPhone: e.target.value})} placeholder="0812..." />
                          </div>
                       </div>
                    </section>

                    <button disabled={isSavingProfile} onClick={handleSaveProfile} className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isSavingProfile ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-orange-600'}`}>
                       {isSavingProfile ? 'MEMPROSES...' : 'SIMPAN PERUBAHAN PROFIL 💾'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
