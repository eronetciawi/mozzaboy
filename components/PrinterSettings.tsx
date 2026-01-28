
import React, { useState } from 'react';
import { useApp } from '../store';

export const PrinterSettings: React.FC = () => {
  const { connectedPrinter, setConnectedPrinter } = useApp();
  const [status, setStatus] = useState<string>('IDLE');
  const [error, setError] = useState<string>('');

  const connectPrinter = async () => {
    try {
      setStatus('CONNECTING');
      setError('');
      
      // Filter standard thermal printer service UUID
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'MPT' },
          { namePrefix: 'Inner' },
          { namePrefix: 'RPP' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      setConnectedPrinter(device);
      setStatus('CONNECTED');
      
      device.addEventListener('gattserverdisconnected', () => {
        setConnectedPrinter(null);
        setStatus('IDLE');
      });

    } catch (err: any) {
      console.error(err);
      setStatus('IDLE');
      setError(err.message || 'Gagal menyambungkan perangkat.');
    }
  };

  const disconnectPrinter = async () => {
    if (connectedPrinter && connectedPrinter.gatt.connected) {
      connectedPrinter.gatt.disconnect();
    }
    setConnectedPrinter(null);
    setStatus('IDLE');
  };

  const testPrint = async () => {
    if (!connectedPrinter) return;

    try {
      const server = await connectedPrinter.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

      if (writeChar) {
        const encoder = new TextEncoder();
        // ESC/POS Init + Test Message + Feed
        const data = new Uint8Array([
          0x1B, 0x40, // Initialize
          ...encoder.encode('   MOZZA BOY POS   \n'),
          ...encoder.encode('   TEST PRINT OK   \n'),
          ...encoder.encode('-------------------\n'),
          0x0A, 0x0A, 0x0A // Line feeds
        ]);
        
        await writeChar.writeValue(data);
        alert("Sinyal print terkirim ke printer!");
      }
    } catch (err) {
      alert("Gagal mencetak: " + err);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Koneksi Printer Bluetooth</h2>
          <p className="text-slate-500 font-medium">Sambungkan printer thermal ESC/POS 58mm/80mm untuk cetak struk otomatis.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-[40px] border-2 border-slate-100 p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
               <div className={`w-4 h-4 rounded-full ${connectedPrinter ? 'bg-green-500 animate-pulse' : 'bg-slate-200 shadow-inner'}`}></div>
            </div>

            <div className="flex flex-col items-center text-center mb-10">
               <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-5xl mb-6 border-2 transition-all ${connectedPrinter ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                 {connectedPrinter ? '✅' : '🖨️'}
               </div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                 {connectedPrinter ? connectedPrinter.name : 'Printer Tidak Terhubung'}
               </h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                 {connectedPrinter ? `CONNECTED | DEVICE ID: ${connectedPrinter.id.slice(0,8)}` : 'READY TO SCAN DEVICES'}
               </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center text-[10px] font-black uppercase tracking-widest">
                ❌ {error}
              </div>
            )}

            <div className="space-y-4">
              {!connectedPrinter ? (
                <button 
                  disabled={status === 'CONNECTING'}
                  onClick={connectPrinter}
                  className={`w-full py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${status === 'CONNECTING' ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-slate-900 text-white hover:bg-orange-600 shadow-xl shadow-slate-900/10'}`}
                >
                  {status === 'CONNECTING' ? 'MENCARI PERANGKAT...' : 'SCAN & PAIR PRINTER'}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                   <button 
                    onClick={testPrint}
                    className="py-5 bg-orange-500 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  >
                    TEST PRINT 📑
                  </button>
                  <button 
                    onClick={disconnectPrinter}
                    className="py-5 bg-red-50 text-red-500 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white"
                  >
                    PUTUSKAN ✂️
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
             <div className="relative z-10">
                <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-orange-500">Panduan Koneksi</h4>
                <ul className="space-y-4 text-xs font-medium text-slate-400 leading-relaxed">
                   <li className="flex gap-4">
                      <span className="text-white font-black">01.</span>
                      <span>Pastikan Printer Bluetooth dalam keadaan <b>ON</b> dan tidak sedang terhubung ke perangkat lain.</span>
                   </li>
                   <li className="flex gap-4">
                      <span className="text-white font-black">02.</span>
                      <span>Gunakan browser <b>Chrome</b> atau <b>Edge</b> versi terbaru untuk dukungan Web Bluetooth.</span>
                   </li>
                   <li className="flex gap-4">
                      <span className="text-white font-black">03.</span>
                      <span>Klik tombol "Scan" di atas, lalu pilih nama printer Anda pada daftar pop-up browser.</span>
                   </li>
                   <li className="flex gap-4">
                      <span className="text-white font-black">04.</span>
                      <span>Setelah terhubung, indikator akan berubah menjadi hijau dan printer siap digunakan untuk mencetakan struk.</span>
                   </li>
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
