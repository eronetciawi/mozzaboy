
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
  
  // Isolated States to prevent cross-contamination
  const [profileForm, setProfileForm] = useState<Partial<StaffMember>>({});
  const [leaveForm, setLeaveForm] = useState({ start: '', end: '', reason: '' });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile form when currentUser changes or when profile tab is opened
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

  // --- UTILS ---
  const calculateDuration = (inTime: any, outTime?: any) => {
    if (!outTime) return "Sedang Bertugas";
    const dIn = new Date(inTime);
    const dOut = new Date(outTime);
    const diff = dOut.getTime() - dIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

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

  // --- HANDLERS ---
  const handleClockIn = async () => {
    if (isProcessingAbsen) return;
    setIsProcessingAbsen(true);
    try {
       const res = await clockIn();
       if (res.success) {
         setToast({ message: "Absen Berhasil! Kembali ke Dashboard...", type: 'success' });
         if (setActiveTab) setActiveTab('dashboard');
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
      await updateStaff(profileForm as StaffMember);
      setToast({ message: "Data profil & kontak darurat diperbarui! ✨", type: 'success' });
    } catch (err) {
      setToast({ message: "Gagal update profil. Cek koneksi Anda.", type: 'error' });
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
      await submitLeave({ 
        startDate: leaveForm.start, 
        endDate: leaveForm.end, 
        reason: leaveForm.reason 
      });
      setToast({ message: "Pengajuan cuti berhasil terkirim! 💌", type: 'success' });
      setLeaveForm({ start: '', end: '', reason: '' }); // Clear only leave form
    } catch (err) {
      setToast({ message: "Gagal mengirim pengajuan cuti.", type: 'error' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const ProfileInput = ({ label, icon, value, onChange, placeholder, type = "text", disabled = false }: any) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm grayscale group-focus-within:grayscale-0 transition-all">{icon}</span>
        <input 
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] outline-none transition-all ${disabled ? 'opacity-50 grayscale bg-slate-100' : 'focus:border-orange-500 focus:bg-white text-slate-900'}`}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden font-sans relative">
      {/* TOAST SYSTEM */}
      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-4 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 
             'bg-indigo-600 border-indigo-400 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0 shadow-inner">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Crew Portal</p>
                <p className="text-[11px] font-bold opacity-95 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-30">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">My Portal</h2>
          <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.3em] mt-1.5">{currentUser.role} • Crew ID #{currentUser.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
           {(['clock', 'performance', 'leave', 'profile'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveSubTab(tab)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab ? 'bg-white text-orange-600 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
               {tab === 'clock' ? 'Absensi' : tab === 'performance' ? 'Performa' : tab === 'leave' ? 'Izin/Cuti' : 'Data Profil'}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        {activeSubTab === 'clock' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
             <div className={`p-10 rounded-[48px] shadow-2xl text-center relative overflow-hidden transition-all duration-500 ${hasFinishedToday ? 'bg-emerald-900' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.3em] mb-8">Shift Controller</h3>
                <div className="inline-flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full mb-8 border border-white/10">
                   <span className={`w-2.5 h-2.5 rounded-full ${hasFinishedToday ? 'bg-emerald-400' : 'bg-orange-500 animate-pulse'}`}></span>
                   <span className="text-[11px] font-black text-white uppercase tracking-widest">{currentUser.shiftStartTime} - {currentUser.shiftEndTime}</span>
                </div>

                {hasFinishedToday ? (
                   <div className="animate-in zoom-in duration-500 py-4">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-emerald-400/20 shadow-inner"><span className="text-4xl">✅</span></div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Tugas Selesai</h4>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Data shift telah diarsipkan ✓</p>
                   </div>
                ) : (
                  <>
                    {!myActiveAttendance ? (
                      <button 
                        disabled={isProcessingAbsen}
                        onClick={handleClockIn} 
                        className="w-full max-w-sm mx-auto flex items-center justify-center gap-4 py-7 bg-orange-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-orange-500 transition-all active:scale-95 border-b-4 border-orange-800 disabled:opacity-50"
                      >
                        {isProcessingAbsen ? 'MEMPROSES...' : 'ABSEN MASUK ➔'}
                      </button>
                    ) : (
                      <div className="py-4">
                         <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <span className="text-2xl">⏳</span>
                         </div>
                         <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Shift Aktif</h4>
                         <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-8">Dimulai pukul {formatTime(myActiveAttendance.clockIn)} WIB</p>
                         <button onClick={() => setActiveTab?.('closing')} className="w-full max-sm:w-full mx-auto py-5 px-8 bg-white text-slate-900 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95">AKHIRI SHIFT VIA TUTUP BUKU</button>
                      </div>
                    )}
                  </>
                )}
             </div>

             <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Riwayat Kehadiran Terakhir</p>
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-8 py-5">Hari / Tanggal</th>
                            <th className="px-4 py-5">In</th>
                            <th className="px-4 py-5">Out</th>
                            <th className="px-8 py-5 text-right">Durasi</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {myAttendanceRecords.slice(0, 10).map((a, i) => {
                            const dStr = typeof a.date === 'string' ? a.date : new Date(a.date).toLocaleDateString('en-CA');
                            return (
                               <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-8 py-4">
                                     <p className="text-[11px] font-black text-slate-800 uppercase">{new Date(dStr).toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short'})}</p>
                                     <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mt-1.5 inline-block ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{a.status}</span>
                                  </td>
                                  <td className="px-4 py-4 text-[11px] font-mono font-bold text-slate-700">{formatTime(a.clockIn)}</td>
                                  <td className="px-4 py-4 text-[11px] font-mono font-bold text-slate-400">{formatTime(a.clockOut)}</td>
                                  <td className="px-8 py-4 text-right text-[11px] font-black text-slate-900 tracking-tight">{calculateDuration(a.clockIn, a.clockOut)}</td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'profile' && (
           <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 pb-32">
              <div className="bg-white p-10 rounded-[48px] border shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/5 rounded-bl-[120px]"></div>
                 
                 <div className="w-40 h-40 rounded-[48px] overflow-hidden bg-slate-100 border-4 border-white shadow-2xl shrink-0 relative group">
                    <img src={profileForm.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} className="w-full h-full object-cover" alt="Profile" />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black uppercase gap-2">
                       <span className="text-xl">📷</span>
                       <span>Ganti Foto</span>
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

                 <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="inline-flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                       <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                       <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Verified Crew Member</span>
                    </div>
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{currentUser.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px]">🗓️</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bergabung: {new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {year:'numeric', month:'long', day:'numeric'})}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px]">🏢</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cabang Utama: {outlets.find(o => o.id === (currentUser.assignedOutletIds[0] || ''))?.name || 'Central'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* IDENTITAS UTAMA */}
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-5">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2 mb-4">1. Kontak Utama</p>
                       <ProfileInput label="WhatsApp" icon="📱" value={profileForm.phone} onChange={(v:any) => setProfileForm({...profileForm, phone: v})} placeholder="0812xxxx" />
                       <ProfileInput label="Email" icon="📧" value={profileForm.email} onChange={(v:any) => setProfileForm({...profileForm, email: v})} placeholder="nama@mozzaboy.com" type="email" />
                       <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Tinggal</label>
                         <textarea 
                           className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-[11px] h-24 focus:border-orange-500 outline-none text-slate-900 resize-none transition-all"
                           value={profileForm.address || ''}
                           onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                           placeholder="Alamat lengkap saat ini..."
                         />
                       </div>
                    </div>
                 </div>

                 {/* MEDIA SOSIAL */}
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-5">
                       <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2 mb-4">2. Media Sosial</p>
                       <ProfileInput label="Instagram" icon="📸" value={profileForm.instagram} onChange={(v:any) => setProfileForm({...profileForm, instagram: v})} placeholder="@username" />
                       <ProfileInput label="Telegram" icon="✈️" value={profileForm.telegram} onChange={(v:any) => setProfileForm({...profileForm, telegram: v})} placeholder="username / t.me" />
                       <ProfileInput label="TikTok" icon="🎵" value={profileForm.tiktok} onChange={(v:any) => setProfileForm({...profileForm, tiktok: v})} placeholder="@tiktok_id" />
                    </div>
                 </div>

                 {/* KONTAK DARURAT */}
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl space-y-6">
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">3. Kontak Darurat (Sos)</p>
                       <div className="space-y-4">
                          <ProfileInput label="Nama Penanggung Jawab" icon="👤" value={profileForm.emergencyContactName} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactName: v})} placeholder="Orang Tua / Saudara" />
                          <ProfileInput label="No. Telp Darurat" icon="🆘" value={profileForm.emergencyContactPhone} onChange={(v:any) => setProfileForm({...profileForm, emergencyContactPhone: v})} placeholder="08xxxx (Wajib Aktif)" />
                       </div>

                       <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                          <div className="flex justify-between items-center">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Jabatan</p>
                             <p className="text-[11px] font-black text-orange-500 uppercase">{currentUser.role}</p>
                          </div>
                          <div className="flex justify-between items-center">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Shift Tetap</p>
                             <p className="text-[11px] font-black text-white uppercase">{currentUser.shiftStartTime} - {currentUser.shiftEndTime}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center pt-8">
                 <button 
                  disabled={isSavingProfile} 
                  onClick={handleSaveProfile} 
                  className="w-full max-w-2xl py-6 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 border-b-4 border-slate-700 disabled:opacity-50"
                 >
                   {isSavingProfile ? (
                     <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>MENYIMPAN...</span>
                     </div>
                   ) : "PERBARUI DOSSIER PROFIL 💾"}
                 </button>
              </div>
           </div>
        )}

        {activeSubTab === 'performance' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-8 md:p-10 rounded-[48px] border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 group-hover:scale-110 transition-transform">🎯</div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em]">Revenue Achievement</h4>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Rp {myStats.todaySales.toLocaleString()}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-3">Target Hari Ini: Rp {myStats.target.toLocaleString()}</p>
                    <div className="mt-10 h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                       <div className="h-full bg-orange-500 transition-all duration-1000 shadow-lg" style={{ width: `${myStats.progress}%` }}></div>
                    </div>
                    <p className="text-right text-[9px] font-black text-orange-600 uppercase mt-3 tracking-widest">{myStats.progress}% Achieved</p>
                 </div>
                 <div className="bg-slate-900 p-8 md:p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-8 tracking-[0.2em]">Discipline Score</h4>
                    <div className="flex items-center gap-8 relative z-10">
                       <div className="text-5xl font-black text-orange-500 tracking-tighter">{myStats.discipline}%</div>
                       <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold tracking-widest">Dihitung berdasarkan ketepatan absen dari {myStats.totalAttend} shift terakhir.</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeSubTab === 'leave' && (
           <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 pb-20">
              <div className="bg-white p-8 md:p-12 rounded-[48px] border shadow-sm space-y-8">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Pengajuan Izin / Cuti</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Isi formulir cuti resmi di bawah ini</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mulai Cuti</label>
                       <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-indigo-500 transition-all text-slate-900" value={leaveForm.start} onChange={e => setLeaveForm({...leaveForm, start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Sampai Cuti</label>
                       <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-indigo-500 transition-all text-slate-900" value={leaveForm.end} onChange={e => setLeaveForm({...leaveForm, end: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alasan Keperluan</label>
                    <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs h-32 resize-none focus:border-indigo-500 transition-all text-slate-900" placeholder="Contoh: Menghadiri acara keluarga di luar kota..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                 </div>
                 <button 
                  disabled={isSubmittingLeave} 
                  onClick={handleLeaveSubmit} 
                  className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                 >
                   {isSubmittingLeave ? "MENGIRIM..." : "KIRIM PENGAJUAN CUTI ➔"}
                 </button>
              </div>

              {/* RECENT LEAVE LOGS */}
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Status Pengajuan Terakhir</p>
                 <div className="space-y-3">
                    {leaveRequests.filter(l => l.staffId === currentUser.id).slice(0, 5).map(l => (
                       <div key={l.id} className="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center">
                          <div>
                             <p className="text-[11px] font-black text-slate-800 uppercase">{new Date(l.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {new Date(l.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                             <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{l.reason}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                             l.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 
                             l.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                             {l.status}
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
