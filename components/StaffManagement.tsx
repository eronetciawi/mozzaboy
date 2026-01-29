
import React, { useState, useMemo } from 'react';
import { useApp, getPermissionsByRole } from '../store';
import { StaffMember, UserRole, LeaveRequest, Attendance } from '../types';

export const StaffManagement: React.FC = () => {
  const { staff, addStaff, updateStaff, deleteStaff, currentUser, outlets, leaveRequests, updateLeaveStatus, attendance, transactions, selectedOutletId } = useApp();
  const [activeHRTab, setActiveHRTab] = useState<'employees' | 'leaves' | 'attendance' | 'performance'>('employees');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '', username: '', password: '123', role: UserRole.CASHIER, assignedOutletIds: [outlets[0]?.id || ''], status: 'ACTIVE',
    weeklyOffDay: 0, shiftStartTime: '09:00', shiftEndTime: '18:00', dailySalesTarget: 1500000, targetBonusAmount: 25000, joinedAt: new Date(),
    phone: '', email: '', address: '', instagram: '', telegram: '', tiktok: '', emergencyContactName: '', emergencyContactPhone: ''
  });

  const handleSave = () => {
    const permissions = getPermissionsByRole(formData.role || UserRole.CASHIER);
    if (editingStaff) updateStaff({ ...editingStaff, ...formData, permissions } as StaffMember);
    else addStaff({ ...formData, id: `s-${Date.now()}`, permissions, joinedAt: new Date() } as StaffMember);
    setShowModal(false);
    setEditingStaff(null);
  };

  const toggleOutlet = (outletId: string) => {
    const current = formData.assignedOutletIds || [];
    setFormData({ ...formData, assignedOutletIds: current.includes(outletId) ? current.filter(id => id !== outletId) : [...current, outletId] });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  const attendanceToday = useMemo(() => {
    return staff
      .filter(s => s.assignedOutletIds.includes(selectedOutletId))
      .map(s => {
        const record = attendance.find(a => a.staffId === s.id && a.date === todayStr);
        return { staff: s, record };
      });
  }, [staff, attendance, selectedOutletId, todayStr]);

  const performanceData = useMemo(() => {
    const outletTxs = transactions.filter(tx => tx.outletId === selectedOutletId && tx.status === 'CLOSED');
    return staff
      .filter(s => s.assignedOutletIds.includes(selectedOutletId) && (s.role === UserRole.CASHIER || s.role === UserRole.MANAGER))
      .map(s => {
        const mySales = outletTxs.filter(tx => tx.cashierId === s.id).reduce((acc, tx) => acc + tx.total, 0);
        const target = s.dailySalesTarget || 0;
        const progress = target > 0 ? Math.min(100, (mySales / target) * 100) : 0;
        return { staff: s, sales: mySales, target, progress };
      });
  }, [staff, transactions, selectedOutletId]);

  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING');

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Human Resources</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase italic">Kelola Crew & Penugasan Cabang</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveHRTab('employees')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeHRTab === 'employees' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Kru</button>
           <button onClick={() => setActiveHRTab('leaves')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${activeHRTab === 'leaves' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Izin {pendingLeaves.length > 0 && <span className="ml-1 bg-red-500 w-1.5 h-1.5 rounded-full inline-block"></span>}</button>
           <button onClick={() => setActiveHRTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeHRTab === 'attendance' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Absen</button>
           <button onClick={() => setActiveHRTab('performance')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeHRTab === 'performance' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Score</button>
        </div>
      </div>

      {activeHRTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kru Mozza Boy</h3>
             <button onClick={() => { setEditingStaff(null); setShowModal(true); }} className="text-[9px] font-black text-orange-600 tracking-widest uppercase">+ Kru Baru</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group active:scale-[0.99] transition-all">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-[24px] bg-slate-50 overflow-hidden border border-slate-100">
                         <img src={member.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt="Staff" className="w-full h-full object-cover" />
                      </div>
                      <div>
                         <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight leading-tight">{member.name}</h4>
                         <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">{member.role}</p>
                      </div>
                   </div>
                </div>
                
                <div className="bg-slate-50/50 p-4 rounded-2xl mb-4 space-y-2">
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">WhatsApp</span>
                      <span className="text-slate-800 font-bold">{member.phone || '-'}</span>
                   </div>
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Username</span>
                      <span className="text-indigo-600 font-bold">{member.username}</span>
                   </div>
                </div>

                <div className="bg-orange-50/30 p-4 rounded-2xl mb-6 space-y-2 border border-orange-100/50">
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                      <span className="text-orange-400">Bonus Target</span>
                      <span className="text-green-600 font-bold">Rp {member.targetBonusAmount?.toLocaleString()}</span>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button onClick={() => { setEditingStaff(member); setFormData(member); setShowModal(true); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Kelola Data</button>
                   {member.id !== currentUser?.id && (
                     <button onClick={() => confirm('Hapus karyawan?') && deleteStaff(member.id)} className="w-12 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">🗑️</button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-none md:rounded-[48px] w-full max-w-4xl h-full md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
             <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingStaff ? 'Update Profil Karyawan' : 'Daftarkan Kru Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Identitas & Akses</p>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Lengkap</label>
                         <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Username</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Password</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Set password baru..." />
                         </div>
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Role Jabatan</label>
                         <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                         </select>
                      </div>
                      <div className="p-6 bg-orange-50 rounded-3xl space-y-4">
                         <p className="text-[9px] font-black text-orange-600 uppercase mb-2">⚙️ Target & Bonus</p>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block ml-1">Target Sales</label>
                               <input type="number" className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={formData.dailySalesTarget} onChange={e => setFormData({...formData, dailySalesTarget: parseInt(e.target.value) || 0})} />
                            </div>
                            <div>
                               <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block ml-1">Bonus Target</label>
                               <input type="number" className="w-full p-3 bg-white border rounded-xl font-black text-xs text-green-600" value={formData.targetBonusAmount} onChange={e => setFormData({...formData, targetBonusAmount: parseInt(e.target.value) || 0})} />
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Kontak & Media Sosial</p>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">No. WhatsApp</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="08..." />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Instagram</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="@username" />
                         </div>
                      </div>
                      
                      <div className="p-6 bg-red-50 rounded-3xl space-y-4">
                         <p className="text-[9px] font-black text-red-600 uppercase mb-2">🚨 Kontak Darurat (Keluarga)</p>
                         <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block ml-1">Nama Hubungan</label>
                            <input type="text" className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} placeholder="Misal: Ibu Kandung" />
                         </div>
                         <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block ml-1">No. HP Hubungan</label>
                            <input type="text" className="w-full p-3 bg-white border rounded-xl font-black text-xs" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} placeholder="08..." />
                         </div>
                      </div>

                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Penugasan Outlet</label>
                         <div className="flex flex-wrap gap-2">
                            {outlets.map(o => (
                               <button key={o.id} onClick={() => toggleOutlet(o.id)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${formData.assignedOutletIds?.includes(o.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 border-slate-100'}`}>{o.name}</button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/50 shrink-0 pb-safe">
                <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN DATABASE KARYAWAN 💾</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
