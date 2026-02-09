
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp, getTodayDateString } from '../store';
import { StaffMember, UserRole, OrderStatus, LeaveRequest } from '../types';

interface AttendanceProps {
  setActiveTab?: (tab: string) => void;
}

export const Attendance: React.FC<AttendanceProps> = ({ setActiveTab }) => {
  const { 
    currentUser, clockIn, clockOut, attendance, leaveRequests, 
    submitLeave, transactions, updateStaff, outlets
  } = useApp();
  
  const [activeSubTab, setActiveSubTab] = useState<'clock' | 'performance' | 'leave' | 'profile'>('clock');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProcessingAbsen, setIsProcessingAbsen] = useState(false);
  
  const [profileForm, setProfileForm] = useState<Partial<StaffMember>>({});
  const [newPassword, setNewPassword] = useState('');
  const [leaveForm, setLeaveForm] = useState({ start: '', end: '', reason: '' });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        ...currentUser,
        instagram: currentUser.instagram || '',
        telegram: currentUser.telegram || '',
        tiktok: currentUser.tiktok || '',
        emergencyContactName: currentUser.emergencyContactName || '',
        emergencyContactPhone: currentUser.emergencyContactPhone || ''
      });
    }
  }, [currentUser, activeSubTab]);

  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!currentUser) return null;

  const formatTime = (date?: any) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const todayStr = getTodayDateString();

  const myAttendanceRecords = useMemo(() => {
    return [...(attendance || [])]
      .filter(a => a.staffId === currentUser.id)
      .sort((a,b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  }, [attendance, currentUser.id]);
  
  const myActiveAttendance = useMemo(() => 
    myAttendanceRecords.find(a => !a.clockOut),
    [myAttendanceRecords]
  );

  const hasFinishedToday = useMemo(() => {
    return myAttendanceRecords.some(a => {
       const recordDate = typeof a.date === 'string' ? a.date : new Date(a.date).toLocaleDateString('en-CA');
       return recordDate === todayStr && a.clockOut;
    });
  }, [myAttendanceRecords, todayStr]);

  const myStats = useMemo(() => {
    const myTotalTransactions = transactions.filter(t => t.cashierId === currentUser.id && t.status === OrderStatus.CLOSED);
    const todaySales = myTotalTransactions
      .filter(t => {
         const tDate = new Date(t.timestamp);
         return tDate.toLocaleDateString('en-CA') === todayStr;
      })
      .reduce((acc, t) => acc + (t.total || 0), 0);
    
    const target = currentUser.dailySalesTarget || 1500000;
    const progress = Math.min(100, Math.round((todaySales / target) * 100));
    const totalAttend = myAttendanceRecords.length;
    const lateCount = myAttendanceRecords.filter(a => a.status === 'LATE').length;
    const discipline = totalAttend > 0 ? Math.round(((totalAttend - lateCount) / totalAttend) * 100) : 100;

    return { todaySales, target, progress, discipline, totalAttend };
  }, [transactions, currentUser, myAttendanceRecords, todayStr]);

  const motivation = useMemo(() => {
    const p = myStats.progress;
    if (p >= 100) return { 
      text: "Luar Biasa! Target tercapai hari ini. Kamu benar-benar MVP Mozza Boy! 🏆✨", 
      color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: "💎" 
    };
    if (p >= 70) return { 
      text: "Sedikit lagi tembus target! Performa kamu hari ini sangat membanggakan. Yuk gas pol! 🚀🔥", 
      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", icon: "🎯" 
    };
    if (p >= 30) return { 
      text: "Kerja bagus! Kamu sudah di jalur yang benar. Tetap semangat tawarkan menu ke pelanggan! 💪😊", 
      color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", icon: "⚡" 
    };
    return { 
      text: "Awal yang baik! Tetap ramah dan berikan pelayanan terbaikmu ya, rezeki pasti menyusul! 🍀🍢", 
      color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", icon: "👋" 
    };
  }, [myStats.progress]);

  const handleClockIn = async () => {
    if (isProcessingAbsen) return;
    setIsProcessingAbsen(true);
    try {
       const res = await clockIn();
       if (res.success) {
         setToast({ message: "Absen Berhasil! ✨", type: 'success' });
       } else {
         setToast({ message: res.message || "Gagal Absen.", type: 'error' });
       }
    } catch (err) {
       setToast({ message: "Gagal memproses absensi.", type: 'error' });
    } finally {
       setIsProcessingAbsen(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const payload = { ...profileForm };
      if (newPassword.trim()) {
        payload.password = newPassword;
      }
      await updateStaff(payload as StaffMember);
      setToast({ message: "Profil diperbarui! ✨", type: 'success' });
      setNewPassword(''); 
    } catch (err) {
      setToast({ message: "Gagal memperbarui profil.", type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if(!leaveForm.start || !leaveForm.end || !leaveForm.reason) {
      setToast({ message: "Lengkapi semua data cuti!", type: 'error' });
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await submitLeave({ startDate: leaveForm.start, endDate: leaveForm.end, reason: leaveForm.reason });
      setToast({ message: "Pengajuan dikirim! 💌", type: 'success' });
      setLeaveForm({ start: '', end: '', reason: '' }); 
    } catch (err) {
      setToast({ message: "Gagal mengirim pengajuan.", type: 'error' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const ProfileInput = ({ label, icon, value, onChange, placeholder, type = "text", disabled = false }: any) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale group-focus-within:grayscale-0 transition-all">{icon}</span>
        <input 
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs outline-none transition-all ${disabled ? 'opacity-50 grayscale bg-slate-50' : 'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-slate-900 shadow-sm hover:border-slate-200'}`}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#fcfdfe] overflow-hidden font-sans relative">
      {/* SISTEM TOAST */}
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-sm:px-4 px-4">
           <div className={`px-6 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-indigo-600 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Sistem</p>
                <p className="text-[12px] font-black uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      {/* HEADER TABS */}
      <div className="bg-white border-b border-slate-100 px-6 md:px-8 py-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-30">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Portal Crew</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
             <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">{currentUser.role} • AKTIF</p>
          </div>
        </div>
        <div className="flex bg-slate-50 p-1 rounded-[16px] border border-slate-100 w-full md:w-auto overflow-x-auto no-scrollbar shadow-inner">
           {(['clock', 'performance', 'leave', 'profile'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveSubTab(tab)} className={`flex-1 md:flex-none px-5 py-2 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
               {tab === 'clock' ? 'Presensi' : tab === 'performance' ? 'Performance' : tab === 'leave' ? 'Cuti' : 'My Profile'}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        {activeSubTab === 'clock' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in pb-20">
             <div className={`p-8 md:p-10 rounded-[40px] shadow-xl text-center relative overflow-hidden transition-all duration-700 ${hasFinishedToday ? 'bg-emerald-950' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[80px] -mr-24 -mt-24"></div>
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-6">Kontrol Shift Operasional</h3>
                
                <div className="inline-flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-full mb-8 border border-white/10 backdrop-blur-md">
                   <span className={`w-2.5 h-2.5 rounded-full ${hasFinishedToday ? 'bg-emerald-400' : 'bg-orange-500 animate-pulse'}`}></span>
                   <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{currentUser.shiftStartTime} — {currentUser.shiftEndTime}</span>
                </div>

                {hasFinishedToday ? (
                   <div className="animate-in zoom-in duration-700">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-emerald-400/20 shadow-2xl"><span className="text-3xl">✅</span></div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Tugas Selesai</h4>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Shift hari ini berakhir ✓</p>
                   </div>
                ) : (
                  <>
                    {!myActiveAttendance ? (
                      <button 
                        disabled={isProcessingAbsen}
                        onClick={handleClockIn} 
                        className="w-full max-w-xs mx-auto flex items-center justify-center gap-4 py-6 bg-orange-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-500 transition-all active:scale-95 border-b-4 border-orange-800 disabled:opacity-50"
                      >
                        {isProcessingAbsen ? 'MEMPROSES...' : 'ABSEN MASUK ➔'}
                      </button>
                    ) : (
                      <div className="py-2">
                         <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 backdrop-blur-sm animate-pulse">
                            <span className="text-2xl">⏳</span>
                         </div>
                         <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Shift Sedang Aktif</h4>
                         <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-8 opacity-70">Dimulai: {formatTime(myActiveAttendance.clockIn)} WIB</p>
                         <button onClick={() => setActiveTab?.('closing')} className="w-full max-w-xs mx-auto py-5 px-8 bg-white text-slate-900 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">AKHIRI SHIFT</button>
                      </div>
                    )}
                  </>
                )}
             </div>

             <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Log Kehadiran</p>
                <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-4 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Jam</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {myAttendanceRecords.slice(0, 5).map((a, i) => (
                           <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{new Date(a.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{a.status === 'LATE' ? 'TELAT' : 'HADIR'}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">{formatTime(a.clockIn)} - {formatTime(a.clockOut)}</p>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'profile' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 pb-24">
              
              {/* HEADER RINGKAS */}
              <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
                 
                 <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-slate-100 border-[6px] border-white shadow-xl shrink-0 group relative cursor-pointer">
                    <img src={profileForm.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} className="w-full h-full object-cover" alt="Profil" />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                       <span className="text-xl">📷</span>
                       <span className="text-[8px] font-black uppercase tracking-widest">Ganti</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if(file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setProfileForm({...profileForm, photo: reader.result as string});
                          reader.readAsDataURL(file);
                       }
                    }} />
                 </div>

                 <div className="flex-1 text-center md:text-left space-y-4 relative z-10">
                    <div>
                       <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full">Personnel File</span>
                       <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mt-3 leading-none">{currentUser.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 justify-center md:justify-start">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Join</span>
                          <span className="text-[11px] font-black text-slate-600 uppercase">{new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {year:'numeric', month:'short'})}</span>
                       </div>
                       <div className="w-px h-6 bg-slate-100 hidden md:block"></div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Base</span>
                          <span className="text-[11px] font-black text-slate-600 uppercase">{outlets.find(o => o.id === (currentUser.assignedOutletIds[0] || ''))?.name || 'Kantor Pusat'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* DATA & KEAMANAN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 
                 {/* KEAMANAN - LEBIH KECIL */}
                 <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[32px] shadow-xl border-t-[8px] border-indigo-600 relative overflow-hidden group">
                       <div className="relative z-10 space-y-6">
                          <div>
                             <h3 className="text-xl font-black text-white uppercase tracking-tighter">Keamanan</h3>
                             <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest mt-1">Ubah Kata Sandi</p>
                          </div>
                          <div className="space-y-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Password Baru</label>
                                <input 
                                   type="password"
                                   placeholder="••••••••"
                                   className="w-full px-5 py-3 bg-white/5 border-2 border-white/10 rounded-xl font-black text-sm outline-none focus:border-indigo-500 text-white"
                                   value={newPassword}
                                   onChange={e => setNewPassword(e.target.value)}
                                />
                             </div>
                             <button 
                              disabled={isSavingProfile} 
                              onClick={handleSaveProfile} 
                              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                             >
                               SIMPAN KUNCI 🔐
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* FORM DATA PRIBADI - LEBIH PADAT */}
                 <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ProfileInput label="Nomor WhatsApp" icon="📱" value={profileForm.phone} onChange={(v:any) => setProfileForm({...profileForm, phone: v})} placeholder="0812..." />
                          <ProfileInput label="Email Resmi" icon="📧" value={profileForm.email} onChange={(v:any) => setProfileForm({...profileForm, email: v})} placeholder="nama@email.com" type="email" />
                          <div className="md:col-span-2 space-y-1.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Domisili</label>
                             <textarea 
                               className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs h-20 focus:border-indigo-500 outline-none text-slate-900 resize-none"
                               value={profileForm.address || ''}
                               onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                               placeholder="Alamat lengkap..."
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                          <ProfileInput label="Instagram" icon="📸" value={profileForm.instagram} onChange={(v:any) => setProfileForm({...profileForm, instagram: v})} placeholder="@user" />
                          <ProfileInput label="Telegram" icon="✈️" value={profileForm.telegram} onChange={(v:any) => setProfileForm({...profileForm, telegram: v})} placeholder="@user" />
                          <ProfileInput label="TikTok" icon="🎵" value={profileForm.tiktok} onChange={(v:any) => setProfileForm({...profileForm, tiktok: v})} placeholder="@user" />
                       </div>
                    </div>

                    {/* KONTAK DARURAT - RINGKAS */}
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                       <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0">🆘</div>
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <ProfileInput label="Nama Kontak Darurat" icon="👤" value={profileForm.emergencyContactName} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactName: v})} placeholder="Nama Wali" />
                          <ProfileInput label="No. HP Darurat" icon="📞" value={profileForm.emergencyContactPhone} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactPhone: v})} placeholder="08..." />
                       </div>
                    </div>

                    <button 
                     disabled={isSavingProfile} 
                     onClick={handleSaveProfile} 
                     className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                      {isSavingProfile ? "MEMPROSES..." : "SIMPAN 💾"}
                    </button>
                 </div>

              </div>
           </div>
        )}

        {activeSubTab === 'performance' && (
           <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-8 rounded-[32px] border shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <span className="text-8xl">📊</span>
                    </div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-widest relative z-10">Sales Hari Ini</h4>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter relative z-10">Rp {myStats.todaySales.toLocaleString()}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 relative z-10">Target: Rp {myStats.target.toLocaleString()}</p>
                    <div className="mt-8 h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner relative z-10">
                       <div className="h-full bg-orange-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(234,88,12,0.3)]" style={{ width: `${myStats.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-4 relative z-10">
                       <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{myStats.progress}% Capaian</p>
                    </div>
                 </div>
                 
                 <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[40px]"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-8 opacity-40">Kedisiplinan</h4>
                    <div className="flex flex-col gap-1 relative z-10">
                       <div className="text-6xl font-black text-indigo-500 tracking-tighter">{myStats.discipline}%</div>
                       <div className="h-px bg-white/10 w-full my-4"></div>
                       <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Skor Kehadiran</p>
                    </div>
                 </div>
              </div>

              {/* SECTION MOTIVASI DINAMIS */}
              <div className={`p-6 md:p-10 rounded-[40px] border-2 shadow-sm transition-all duration-500 animate-in slide-in-from-bottom-4 ${motivation.bg} ${motivation.border}`}>
                 <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center text-3xl shrink-0 transform -rotate-3 border border-slate-100">
                       {motivation.icon}
                    </div>
                    <div className="flex-1">
                       <h4 className={`text-base md:text-lg font-black uppercase tracking-tight leading-tight ${motivation.color}`}>
                          {motivation.text}
                       </h4>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Pesan Untuk {currentUser.name.split(' ')[0]}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeSubTab === 'leave' && (
           <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 pb-20">
              <div className="bg-white p-8 md:p-10 rounded-[40px] border shadow-sm space-y-8">
                 <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Pengajuan Cuti</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Formulir Ketidakhadiran Resmi</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mulai</label>
                       <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs focus:border-indigo-500 text-slate-900" value={leaveForm.start} onChange={e => setLeaveForm({...leaveForm, start: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Selesai</label>
                       <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs focus:border-indigo-500 text-slate-900" value={leaveForm.end} onChange={e => setLeaveForm({...leaveForm, end: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alasan</label>
                    <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xs h-32 resize-none focus:border-indigo-500" placeholder="Jelaskan alasan cuti..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                 </div>
                 <button 
                  disabled={isSubmittingLeave} 
                  onClick={handleLeaveSubmit} 
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                 >
                   {isSubmittingLeave ? "MENGIRIM..." : "KIRIM PERMOHONAN ➔"}
                 </button>
              </div>

              {/* LOGS HISTORI */}
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Riwayat Pengajuan</p>
                 <div className="space-y-2">
                    {leaveRequests.filter(l => l.staffId === currentUser.id).slice(0, 5).map(l => (
                       <div key={l.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
                          <div>
                             <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{new Date(l.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {new Date(l.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                             <p className="text-[9px] text-slate-400 truncate max-w-[150px] font-medium mt-1">"{l.reason}"</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                             l.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 
                             l.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                             {l.status === 'APPROVED' ? 'DISETUJUI' : l.status === 'REJECTED' ? 'DITOLAK' : 'PROSES'}
                          </span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
