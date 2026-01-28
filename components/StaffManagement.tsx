
import React, { useState } from 'react';
import { useApp, getPermissionsByRole } from '../store';
import { StaffMember, UserRole, LeaveRequest, Attendance } from '../types';

export const StaffManagement: React.FC = () => {
  const { staff, addStaff, updateStaff, deleteStaff, currentUser, outlets, leaveRequests, updateLeaveStatus, attendance } = useApp();
  const [activeHRTab, setActiveHRTab] = useState<'employees' | 'leaves' | 'attendance' | 'performance'>('employees');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<StaffMember | null>(null);

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '',
    username: '',
    password: '123',
    role: UserRole.CASHIER,
    assignedOutletIds: [outlets[0]?.id || ''],
    status: 'ACTIVE',
    weeklyOffDay: 0,
    specialHolidays: [],
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    dailySalesTarget: 0,
    targetBonusAmount: 0,
    joinedAt: new Date()
  });

  const handleSave = () => {
    const permissions = getPermissionsByRole(formData.role || UserRole.CASHIER);
    const joiningDate = formData.joinedAt ? new Date(formData.joinedAt) : new Date();
    
    if (editingStaff) {
      updateStaff({ ...editingStaff, ...formData, joinedAt: joiningDate, permissions } as StaffMember);
    } else {
      addStaff({ ...formData, id: `s-${Date.now()}`, permissions, joinedAt: joiningDate } as StaffMember);
    }
    setShowModal(false);
    setEditingStaff(null);
  };

  const toggleOutlet = (outletId: string) => {
    setFormData(prev => {
      const current = prev.assignedOutletIds || [];
      if (current.includes(outletId)) {
        return { ...prev, assignedOutletIds: current.filter(id => id !== outletId) };
      } else {
        return { ...prev, assignedOutletIds: [...current, outletId] };
      }
    });
  };

  const now = new Date();
  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING');
  const upcomingLeaves = leaveRequests.filter(l => l.status === 'APPROVED' && new Date(l.startDate) > now);
  const activeLeaves = leaveRequests.filter(l => l.status === 'APPROVED' && new Date(l.startDate) <= now && new Date(l.endDate) >= now);
  
  const LeaveCard: React.FC<{ leave: LeaveRequest }> = ({ leave }) => (
    <div className={`p-6 bg-white rounded-3xl border-2 flex flex-col shadow-sm transition-all hover:border-orange-200 ${leave.status === 'REJECTED' ? 'opacity-60 grayscale' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100 uppercase">
             {leave.staffName.charAt(0)}
          </div>
          <div>
            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{leave.staffName}</h5>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Requested at {new Date(leave.requestedAt).toLocaleDateString()}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
          leave.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
          leave.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {leave.status}
        </span>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
        <div className="flex justify-between items-center mb-2">
           <span className="text-[9px] font-black text-slate-400 uppercase">Periode Izin</span>
           <span className="text-sm font-black text-slate-700">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
        </div>
        <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed truncate">"{leave.reason}"</p>
      </div>

      {leave.status === 'PENDING' && (
        <div className="flex gap-2 mt-auto">
           <button onClick={() => updateLeaveStatus(leave.id, 'APPROVED')} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all">Terima</button>
           <button onClick={() => updateLeaveStatus(leave.id, 'REJECTED')} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Tolak</button>
        </div>
      )}
    </div>
  );

  const getDayName = (dayIdx: number) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayIdx];

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Human Resource Management</h2>
          <p className="text-slate-500 font-medium italic text-xs">Kelola data karyawan, shift, dan riwayat perizinan</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm no-print overflow-x-auto">
           <button onClick={() => setActiveHRTab('employees')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'employees' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Karyawan</button>
           <button onClick={() => setActiveHRTab('leaves')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeHRTab === 'leaves' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>
              Cuti/Izin
              {pendingLeaves.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] border-2 border-white">{pendingLeaves.length}</span>}
           </button>
           <button onClick={() => setActiveHRTab('attendance')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'attendance' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Log Absen</button>
           <button onClick={() => setActiveHRTab('performance')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'performance' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>⭐ Performa</button>
        </div>
      </div>

      {activeHRTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-end mb-4 no-print">
             <button onClick={() => { setEditingStaff(null); setFormData({ name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [outlets[0]?.id || ''], status: 'ACTIVE', weeklyOffDay: 0, specialHolidays: [], shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 25000, joinedAt: new Date() }); setShowModal(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest hover:bg-orange-600 transition-all">+ Tambah Karyawan</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {staff.map(member => {
              return (
                <div key={member.id} className="bg-white rounded-[40px] border-2 border-slate-100 p-8 flex flex-col shadow-sm hover:border-orange-200 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center overflow-hidden border-2 border-slate-100">
                        <img src={member.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt="Staff" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight">{member.name}</h4>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingStaffProfile(member)}
                      className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 shadow-sm"
                      title="Lihat Profil Lengkap"
                    >
                      👤
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[32px] mb-8 space-y-4">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-slate-100 pb-3">
                      <span className="text-slate-400">Shift Kerja</span>
                      <span className="text-slate-800">{member.shiftStartTime || '--:--'} - {member.shiftEndTime || '--:--'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-slate-100 pb-3">
                      <span className="text-slate-400">Masa Kerja Sejak</span>
                      <span className="text-slate-800 font-bold">{new Date(member.joinedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Status Akun</span>
                      <span className={`font-black ${member.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>{member.status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto no-print">
                    <button 
                      onClick={() => { setEditingStaff(member); setFormData(member); setShowModal(true); }}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all"
                    >
                      Kelola Akun & Target
                    </button>
                    {member.id !== currentUser?.id && (
                       <button onClick={() => { if(confirm('Hapus karyawan ini?')) deleteStaff(member.id); }} className="w-14 py-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {viewingStaffProfile && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5 text-6xl">🇰🇷</div>
                 <div className="w-32 h-32 rounded-[40px] overflow-hidden bg-slate-800 border-4 border-white/10 shadow-2xl relative z-10 shrink-0">
                    <img src={viewingStaffProfile.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${viewingStaffProfile.name}`} alt="Profile" className="w-full h-full object-cover" />
                 </div>
                 <div className="text-center md:text-left relative z-10">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">{viewingStaffProfile.name}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                       <span className="px-3 py-1 bg-orange-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{viewingStaffProfile.role}</span>
                       <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">ID: {viewingStaffProfile.id}</span>
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${viewingStaffProfile.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{viewingStaffProfile.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-6">Joined: {new Date(viewingStaffProfile.joinedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 <button onClick={() => setViewingStaffProfile(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">✕</button>
              </div>
              
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {/* CONTACT INFO */}
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Informasi Kontak</h4>
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-sm shadow-sm">📱</div>
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none">WhatsApp / HP</p>
                                <p className="text-xs font-black text-slate-800 mt-1">{viewingStaffProfile.phone || '(Belum diisi)'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">✉️</div>
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Email Address</p>
                                <p className="text-xs font-black text-slate-800 mt-1 lowercase">{viewingStaffProfile.email || '(Belum diisi)'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-sm shadow-sm">📸</div>
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Instagram</p>
                                <p className="text-xs font-black text-slate-800 mt-1">@{viewingStaffProfile.instagram || 'mozzaboy_crew'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-sm shadow-sm">✈️</div>
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Telegram</p>
                                <p className="text-xs font-black text-slate-800 mt-1">{viewingStaffProfile.telegram || '(Belum diisi)'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center text-sm shadow-sm">🎵</div>
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none">TikTok</p>
                                <p className="text-xs font-black text-slate-800 mt-1">{viewingStaffProfile.tiktok || '(Belum diisi)'}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Alamat Domisili</h4>
                       <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                          "{viewingStaffProfile.address || 'Alamat belum dilengkapi oleh karyawan.'}"
                       </p>
                    </div>
                 </div>

                 {/* EMERGENCY & SYSTEM INFO */}
                 <div className="space-y-6">
                    <div className="p-6 bg-red-50 rounded-[32px] border border-red-100">
                       <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span>🚨</span> Kontak Darurat
                       </h4>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[8px] font-black text-red-400 uppercase leading-none">Hubungi Atas Nama</p>
                             <p className="text-sm font-black text-slate-800 mt-1 uppercase">{viewingStaffProfile.emergencyContactName || '(Data Kosong)'}</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-red-400 uppercase leading-none">Nomor HP Darurat</p>
                             <p className="text-sm font-black text-slate-800 mt-1">{viewingStaffProfile.emergencyContactPhone || '(Data Kosong)'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Penugasan Sistem</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                             <span className="text-slate-400">Total Outlet</span>
                             <span className="text-slate-800">{viewingStaffProfile.assignedOutletIds.length} Cabang</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                             <span className="text-slate-400">Hari Libur</span>
                             <span className="text-slate-800">{getDayName(viewingStaffProfile.weeklyOffDay || 0)}</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-1">
                             {viewingStaffProfile.assignedOutletIds.map(oid => (
                                <span key={oid} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[7px] font-black uppercase text-slate-500">
                                   {outlets.find(o => o.id === oid)?.name || oid}
                                </span>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex justify-center">
                 <button onClick={() => setViewingStaffProfile(null)} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-105 transition-all">Tutup Pratinjau Profil</button>
              </div>
           </div>
        </div>
      )}

      {activeHRTab === 'leaves' && (
        <div className="space-y-12 pb-10">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-6 bg-orange-500 rounded-full"></span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Menunggu Persetujuan ({pendingLeaves.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingLeaves.length === 0 ? (
                <div className="col-span-full py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center grayscale opacity-40">
                  <span className="text-3xl mb-2">🏖️</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada pengajuan pending</p>
                </div>
              ) : (
                pendingLeaves.map(l => <LeaveCard key={l.id} leave={l} />)
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-6 bg-green-500 rounded-full"></span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Agenda Aktif & Mendatang</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[...activeLeaves, ...upcomingLeaves].length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-300 font-black text-[10px] uppercase italic tracking-[0.2em]">Belum ada agenda cuti terjadwal</div>
              ) : (
                [...activeLeaves, ...upcomingLeaves].map(l => (
                   <div key={l.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">{l.staffName}</span>
                        <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${activeLeaves.includes(l) ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
                          {activeLeaves.includes(l) ? 'Sedang Libur' : 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</p>
                   </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {activeHRTab === 'attendance' && (
        <div className="bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden shadow-sm">
           <table className="w-full text-left">
             <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
               <tr>
                 <th className="py-4 px-8">Tanggal</th>
                 <th className="py-4 px-6">Karyawan</th>
                 <th className="py-4 px-6 text-center">Masuk</th>
                 <th className="py-4 px-6 text-center">Pulang</th>
                 <th className="py-4 px-8 text-right">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {attendance.length === 0 ? (
                 <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black text-[10px] uppercase italic tracking-[0.2em]">Data absensi masih kosong</td></tr>
               ) : (
                 attendance.map(a => (
                   <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="py-4 px-8 font-black text-slate-700 text-[10px]">{new Date(a.date).toLocaleDateString()}</td>
                     <td className="py-4 px-6 font-black text-slate-800 uppercase text-[10px]">{a.staffName}</td>
                     <td className="py-4 px-6 text-center font-bold text-slate-500 text-[10px]">{new Date(a.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                     <td className="py-4 px-6 text-center font-bold text-slate-500 text-[10px]">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                     <td className="py-4 px-8 text-right">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${a.status === 'LATE' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {a.status}
                        </span>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
        </div>
      )}

      {activeHRTab === 'performance' && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {staff.map(member => {
                 const myAtt = attendance.filter(a => a.staffId === member.id);
                 const lates = myAtt.filter(a => a.status === 'LATE').length;
                 const attends = myAtt.length;
                 const score = attends > 0 ? Math.round(((attends - lates) / attends) * 100) : 0;
                 
                 return (
                    <div key={member.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mb-4">
                          {score >= 90 ? '🏆' : score >= 70 ? '👍' : '⚠️'}
                       </div>
                       <h4 className="font-black text-slate-800 uppercase text-[11px] mb-1">{member.name}</h4>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{member.role}</p>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                          <div className={`h-full transition-all duration-1000 ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${score}%`}}></div>
                       </div>
                       <div className="flex justify-between w-full text-[9px] font-black uppercase">
                          <span className="text-slate-400">Disiplin Absen</span>
                          <span className={score >= 90 ? 'text-green-600' : score >= 70 ? 'text-orange-600' : 'text-red-600'}>{score}%</span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-4xl p-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter text-center">
              {editingStaff ? 'Update Profil & Pengaturan Karyawan' : 'Daftarkan Karyawan Baru'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-b border-orange-100 pb-2">Akses & Personal</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nama Lengkap</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Jabatan</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Username</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Password</label>
                    <input type="password" placeholder="123" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Tanggal Bergabung</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-orange-500 transition-all outline-none" 
                    value={formData.joinedAt ? (formData.joinedAt instanceof Date ? formData.joinedAt.toISOString().split('T')[0] : new Date(formData.joinedAt).toISOString().split('T')[0]) : ''}
                    onChange={e => setFormData({...formData, joinedAt: new Date(e.target.value)})} 
                  />
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 italic">* Digunakan untuk perhitungan masa kerja & bonus tahunan</p>
                </div>

                <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] border-b border-green-100 pb-2 pt-4">Target Penjualan & Bonus</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Target Penjualan Harian (Rp)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800" value={formData.dailySalesTarget} onChange={e => setFormData({...formData, dailySalesTarget: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Bonus Jangkauan Target (Rp)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-green-600" value={formData.targetBonusAmount} onChange={e => setFormData({...formData, targetBonusAmount: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-blue-100 pb-2">Jadwal Shift & Outlet</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Jam Masuk</label>
                    <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.shiftStartTime} onChange={e => setFormData({...formData, shiftStartTime: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Jam Pulang</label>
                    <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.shiftEndTime} onChange={e => setFormData({...formData, shiftEndTime: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Hari Libur Rutin</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.weeklyOffDay} onChange={e => setFormData({...formData, weeklyOffDay: parseInt(e.target.value)})}>
                    {[0,1,2,3,4,5,6].map(i => <option key={i} value={i}>{getDayName(i)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Penugasan Cabang</label>
                  <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                    {outlets.map(o => (
                      <button key={o.id} onClick={() => toggleOutlet(o.id)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${formData.assignedOutletIds?.includes(o.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
                        <span className="text-[10px] font-black uppercase flex-1">{o.name}</span>
                        {formData.assignedOutletIds?.includes(o.id) && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10 border-t border-slate-50 pt-8">
              <button onClick={() => { setShowModal(false); setEditingStaff(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Batal</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl tracking-[0.1em]">Simpan Konfigurasi Karyawan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
