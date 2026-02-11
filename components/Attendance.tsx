
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
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        ...currentUser,
        instagram: currentUser.instagram || '',
        telegram: currentUser.telegram || '',
        tiktok: currentUser.tiktok || '',
        emergencyContactName: currentUser.emergencyContactName || '',
        emergencyContactPhone: currentUser.emergencyContactPhone || '',
        photo: currentUser.photo || ''
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
         setTimeout(() => {
            setActiveTab?.('dashboard');
         }, 1000);
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
    if(!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      setToast({ message: "Lengkapi semua data cuti!", type: 'error' });
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await submitLeave({ startDate: leaveForm.startDate, endDate: leaveForm.endDate, reason: leaveForm.reason });
      setToast({ message: "Pengajuan dikirim! 💌", type: 'success' });
      setLeaveForm({ startDate: '', endDate: '', reason: '' }); 
    } catch (err) {
      setToast({ message: "Gagal mengirim pengajuan.", type: 'error' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const ProfileInput = ({ label, icon, value, onChange, placeholder, type = "text", disabled = false }: any) => (
    <div className="space-y-1">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs grayscale group-focus-within:grayscale-0 transition-all">{icon}</span>
        <input 
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-100 rounded-xl font-black text-[10px] outline-none transition-all ${disabled ? 'opacity-50 grayscale bg-slate-50' : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 text-slate-900 shadow-sm hover:border-slate-200'}`}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#fcfdfe] overflow-hidden font-sans relative">
      {toast.type && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-sm:px-4 px-4">
           <div className={`px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-indigo-600 text-white'
           }`}>
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Sistem</p>
                <p className="text-[12px] font-black uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-100 px-6 md:px-8 py-3 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 z-30">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Portal Crew</h2>
          <div className="flex items-center gap-2 mt-0.5">
             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
             <p className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em]">{currentUser.role} • AKTIF</p>
          </div>
        </div>
        <div className="flex bg-slate-50 p-1 rounded-[14px] border border-slate-100 w-full md:w-auto overflow-x-auto no-scrollbar shadow-inner">
           {(['clock', 'performance', 'leave', 'profile'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveSubTab(tab)} className={`flex-1 md:flex-none px-4 py-1.5 rounded-[10px] text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
               {tab === 'clock' ? 'Absensi' : tab === 'performance' ? 'Performance' : tab === 'leave' ? 'Cuti' : 'Profil'}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        {activeSubTab === 'clock' && (
          <div className="max-w-xl mx-auto space-y-4 animate-in fade-in pb-20">
             <div className={`p-6 md:p-8 rounded-[32px] shadow-lg text-center relative overflow-hidden transition-all duration-700 ${hasFinishedToday ? 'bg-emerald-950' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Kontrol Shift</h3>
                
                <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full mb-6 border border-white/10 backdrop-blur-md">
                   <span className={`w-2 h-2 rounded-full ${hasFinishedToday ? 'bg-emerald-400' : 'bg-orange-50 animate-pulse'}`}></span>
                   <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{currentUser.shiftStartTime} — {currentUser.shiftEndTime}</span>
                </div>

                {hasFinishedToday ? (
                   <div className="animate-in zoom-in duration-700">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/20 shadow-2xl text-2xl">✅</div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-0.5">Tugas Selesai</h4>
                      <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Shift hari ini berakhir ✓</p>
                   </div>
                ) : (
                  <>
                    {!myActiveAttendance ? (
                      <button 
                        disabled={isProcessingAbsen}
                        onClick={handleClockIn} 
                        className="w-full max-w-xs mx-auto flex items-center justify-center gap-4 py-5 bg-orange-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-orange-500 transition-all active:scale-95 border-b-4 border-orange-800 disabled:opacity-50"
                      >
                        {isProcessingAbsen ? 'PROSES...' : 'ABSEN MASUK ➔'}
                      </button>
                    ) : (
                      <div className="py-2">
                         <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10 backdrop-blur-sm animate-pulse text-xl">⏳</div>
                         <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-0.5">Shift Aktif</h4>
                         <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-6 opacity-70">Mulai: {formatTime(myActiveAttendance.clockIn)} WIB</p>
                         <button onClick={() => setActiveTab?.('closing')} className="w-full max-w-xs mx-auto py-4 px-6 bg-white text-slate-900 rounded-[20px] font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">AKHIRI SHIFT</button>
                      </div>
                    )}
                  </>
                )}
             </div>

             <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Riwayat Absensi</p>
                <div className="bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-5 py-3">Tanggal</th>
                            <th className="px-3 py-3 text-center">Status</th>
                            <th className="px-5 py-3 text-right">Jam</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {myAttendanceRecords.slice(0, 4).map((a, i) => (
                           <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3">
                                 <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{new Date(a.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                              </td>
                              <td className="px-3 py-3 text-center">
                                 <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{a.status === 'LATE' ? 'TELAT' : 'HADIR'}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">{formatTime(a.clockIn)} - {formatTime(a.clockOut)}</p>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'performance' && (
           <div className="max-w-xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 pb-20">
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-white p-6 rounded-[32px] border shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-6xl">📊</div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest relative z-10">Sales Hari Ini</h4>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter relative z-10">Rp {myStats.todaySales.toLocaleString()}</h3>
                    
                    <div className="mt-4 relative z-10 p-3 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Semangat kejar bonus mu,</p>
                      <p className="text-[11px] font-black text-slate-700 uppercase">Capai target sales Rp {myStats.target.toLocaleString()}</p>
                    </div>

                    <div className="mt-6 h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative z-10">
                       <div className="h-full bg-orange-600 rounded-full transition-all duration-1000" style={{ width: `${myStats.progress}%` }}></div>
                    </div>
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-2">{myStats.progress}% Capaian</p>
                 </div>

                 <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden flex items-center justify-between">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-600/20 rounded-full blur-[40px]"></div>
                    <div className="relative z-10">
                       <h4 className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-40">Kedisiplinan</h4>
                       <div className="text-4xl font-black text-indigo-500 tracking-tighter">{myStats.discipline}%</div>
                       <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">Skor Absensi</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">🎯</div>
                 </div>
              </div>

              <div className={`p-5 md:p-8 rounded-[32px] border-2 shadow-sm transition-all duration-500 animate-in slide-in-from-bottom-4 ${motivation.bg} ${motivation.border}`}>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-2xl shrink-0 transform -rotate-3 border border-slate-100">{motivation.icon}</div>
                    <div className="flex-1 min-w-0">
                       <h4 className={`text-xs md:text-sm font-black uppercase tracking-tight leading-tight ${motivation.color}`}>{motivation.text}</h4>
                       <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pesan Untuk {currentUser.name.split(' ')[0]}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeSubTab === 'profile' && (
           <div className="max-w-xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 pb-32">
              <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
                 <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md shrink-0 relative z-10">
                    <img src={profileForm.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} className="w-full h-full object-cover" alt="Profil" />
                 </div>
                 <div className="flex-1 min-w-0 relative z-10">
                    <span className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-0.5 rounded-full">Personal File</span>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mt-0.5 truncate leading-none">{currentUser.name}</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Aktif Sejak: {new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {year:'numeric', month:'short'})}</p>
                 </div>
              </div>

              <div className="bg-indigo-600 p-5 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🕒</div>
                 <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">Mozza Squad</h4>
                 <div>
                    <p className="text-[7px] font-black uppercase opacity-60">Jam Shift</p>
                    <p className="text-sm font-black tracking-widest">{currentUser.shiftStartTime} - {currentUser.shiftEndTime}</p>
                 </div>
                 <div className="flex gap-1.5 mt-4">
                    {shortDays.map((d, i) => (
                       <div key={i} className={`w-8 py-1.5 rounded-lg flex items-center justify-center text-[7px] font-black transition-all ${currentUser.workingDays?.includes(i) ? 'bg-white text-indigo-600' : 'bg-white/10 text-white/30'}`}>
                          {d}
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ProfileInput label="Nama Lengkap" icon="👤" value={profileForm.name} onChange={(v:any) => setProfileForm({...profileForm, name: v})} placeholder="Nama Lengkap" />
                    <ProfileInput label="User ID (Username)" icon="🆔" value={profileForm.username} onChange={(v:any) => setProfileForm({...profileForm, username: v})} placeholder="username" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <ProfileInput label="WhatsApp" icon="📱" value={profileForm.phone} onChange={(v:any) => setProfileForm({...profileForm, phone: v})} placeholder="08..." />
                    <ProfileInput label="Email" icon="📧" value={profileForm.email} onChange={(v:any) => setProfileForm({...profileForm, email: v})} placeholder="mail@..." type="email" />
                 </div>
                 <div className="pt-2 border-t border-slate-50">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 ml-1">Social Media</p>
                    <div className="grid grid-cols-3 gap-2">
                       <ProfileInput label="IG" icon="📸" value={profileForm.instagram} onChange={(v:any) => setProfileForm({...profileForm, instagram: v})} placeholder="@" />
                       <ProfileInput label="TG" icon="✈️" value={profileForm.telegram} onChange={(v:any) => setProfileForm({...profileForm, telegram: v})} placeholder="@" />
                       <ProfileInput label="TT" icon="🎵" value={profileForm.tiktok} onChange={(v:any) => setProfileForm({...profileForm, tiktok: v})} placeholder="@" />
                    </div>
                 </div>
                 <div className="space-y-4 pt-2 border-t border-slate-50">
                    <ProfileInput label="URL Foto Profil" icon="🖼️" value={profileForm.photo} onChange={(v:any) => setProfileForm({...profileForm, photo: v})} placeholder="https://..." />
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Domisili</label>
                       <textarea className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] h-14 focus:border-indigo-500 outline-none text-slate-900 resize-none" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} placeholder="Alamat lengkap..." />
                    </div>
                 </div>
                 <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-lg">🆘</span>
                       <h4 className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Kontak Darurat</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <ProfileInput label="Nama Wali" icon="👤" value={profileForm.emergencyContactName} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactName: v})} placeholder="Nama" />
                       <ProfileInput label="Nomor HP" icon="📞" value={profileForm.emergencyContactPhone} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactPhone: v})} placeholder="08..." />
                    </div>
                 </div>
                 <div className="pt-2 border-t border-slate-50">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-1">Keamanan Akun</p>
                    <input 
                       type="password"
                       placeholder="Ganti Password Baru"
                       className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-[10px] outline-none focus:border-indigo-500"
                       value={newPassword}
                       onChange={e => setNewPassword(e.target.value)}
                    />
                 </div>
                 <button disabled={isSavingProfile} onClick={handleSaveProfile} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSavingProfile ? "SAVING..." : "SIMPAN PERUBAHAN 💾"}
                 </button>
              </div>
           </div>
        )}

        {activeSubTab === 'leave' && (
           <div className="max-w-xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 pb-20">
              <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-6">
                 <div className="text-center">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Pengajuan Cuti</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Formulir Resmi</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Mulai</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] focus:border-indigo-500 text-slate-900" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Selesai</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] focus:border-indigo-500 text-slate-900" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Alasan</label>
                    <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-[10px] h-20 resize-none focus:border-indigo-500" placeholder="Kenapa cuti?..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                 </div>
                 <button disabled={isSubmittingLeave} onClick={handleLeaveSubmit} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 active:scale-95 transition-all">{isSubmittingLeave ? "KIRIM..." : "KIRIM PENGAJUAN ➔"}</button>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Status Pengajuan</p>
                 <div className="space-y-2">
                    {leaveRequests.filter(l => String(l.staffId) === String(currentUser.id)).map(l => (
                       <div key={l.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
                          <div>
                             <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{new Date(l.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {new Date(l.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                             <p className="text-[8px] text-slate-400 truncate max-w-[120px] font-medium mt-0.5">"{l.reason}"</p>
                          </div>
                          {/* FIX: Mengubah label menjadi bahasa Indonesia yang diminta user */}
                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${l.status === 'APPROVED' ? 'bg-green-50 text-green-600' : l.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                             {l.status === 'APPROVED' ? 'DISETUJUI' : l.status === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU'}
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
