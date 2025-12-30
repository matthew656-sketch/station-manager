import { useState, useEffect } from 'react';
import { Save, Wallet, Banknote, RefreshCw, Calculator, Loader2, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props { userRole: string; }

export default function POS({ userRole }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    staffName: '',
    machineName: 'Moniepoint 1',
    openingCash: 0,
    openingWallet: 0,
    capitalGiven: 0,
    closingCash: 0,
    closingWallet: 0,
    cashRemitted: 0,
    transactionVolume: 0, 
    chargePer100k: 1000,
    bankCharges: 0,      
    exemptedVolume: 0,   
  });

  // 1. Actual Cash Logic
  const startTotal = Number(form.openingCash) + Number(form.openingWallet) + Number(form.capitalGiven);
  const endTotal = Number(form.closingCash) + Number(form.closingWallet) + Number(form.cashRemitted);
  const rawProfit = endTotal - startTotal;

  // 2. Target Logic
  const taxableVolume = Math.max(0, Number(form.transactionVolume) - Number(form.exemptedVolume));
  const expectedCommission = (taxableVolume / 100000) * Number(form.chargePer100k);
  const targetProfit = expectedCommission - Number(form.bankCharges);
  
  const performanceDifference = rawProfit - targetProfit;

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const { data } = await supabase.from('pos_records').select('*').order('id', { ascending: false });
    setRecords(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('pos_records').insert([{
          staff_name: form.staffName,
          machine_name: form.machineName,
          actual_profit: rawProfit,
          expected_commission: targetProfit,
          date: new Date().toLocaleDateString()
    }]);

    if (!error) {
        alert('POS Record Saved!');
        fetchRecords();
        // Clear only daily values, keep constants like Name/Machine
        setForm(prev => ({ 
            ...prev, 
            openingCash: 0, openingWallet: 0, capitalGiven: 0,
            closingCash: 0, closingWallet: 0, cashRemitted: 0,
            transactionVolume: 0, bankCharges: 0, exemptedVolume: 0 
        }));
    } else {
        alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">POS Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs text-slate-500 font-bold">Staff</label><input className="w-full p-2 border rounded" value={form.staffName} onChange={e => setForm({...form, staffName: e.target.value})} /></div>
               <div><label className="text-xs text-slate-500 font-bold">Machine</label>
                  <select className="w-full p-2 border rounded" value={form.machineName} onChange={e => setForm({...form, machineName: e.target.value})}>
                    <option>Moniepoint 1</option><option>Opay 1</option><option>Palmpay</option>
                  </select>
               </div>
            </div>

            {/* MONEY SECTIONS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                    <h3 className="text-xs font-bold text-orange-800 mb-2">STARTING</h3>
                    <input type="number" placeholder="Opening Cash" className="w-full p-2 border rounded mb-2 text-sm" onChange={e => setForm({...form, openingCash: parseFloat(e.target.value) || 0})} />
                    <input type="number" placeholder="Wallet Balance" className="w-full p-2 border rounded mb-2 text-sm" onChange={e => setForm({...form, openingWallet: parseFloat(e.target.value) || 0})} />
                    <input type="number" placeholder="Capital Given" className="w-full p-2 border rounded text-sm" onChange={e => setForm({...form, capitalGiven: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 mb-2">CLOSING</h3>
                    <input type="number" placeholder="Closing Cash" className="w-full p-2 border rounded mb-2 text-sm" onChange={e => setForm({...form, closingCash: parseFloat(e.target.value) || 0})} />
                    <input type="number" placeholder="Wallet Balance" className="w-full p-2 border rounded mb-2 text-sm" onChange={e => setForm({...form, closingWallet: parseFloat(e.target.value) || 0})} />
                    <input type="number" placeholder="Cash Remitted" className="w-full p-2 border rounded text-sm" onChange={e => setForm({...form, cashRemitted: parseFloat(e.target.value) || 0})} />
                </div>
            </div>

            {/* ANALYSIS */}
            <div className="bg-purple-50 p-4 rounded border border-purple-100">
                <h3 className="text-xs font-bold text-purple-800 mb-2">ANALYSIS</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] uppercase font-bold text-purple-700">Total Volume</label><input type="number" className="w-full p-2 border rounded" onChange={e => setForm({...form, transactionVolume: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-[10px] uppercase font-bold text-purple-700">Charge / 100k</label><input type="number" className="w-full p-2 border rounded" value={form.chargePer100k} onChange={e => setForm({...form, chargePer100k: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-[10px] uppercase font-bold text-red-600">Bank Charges</label><input type="number" className="w-full p-2 border rounded border-red-200 bg-red-50" onChange={e => setForm({...form, bankCharges: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-[10px] uppercase font-bold text-slate-600">Free Transfers</label><input type="number" className="w-full p-2 border rounded" onChange={e => setForm({...form, exemptedVolume: parseFloat(e.target.value) || 0})} /></div>
                </div>
            </div>

            {/* SAVE BUTTON */}
            {userRole === 'admin' ? (
                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white p-3 rounded font-bold hover:bg-slate-800">
                    {loading ? <Loader2 className="animate-spin inline" /> : <Save className="inline mr-2" size={18} />} Close Account
                </button>
            ) : <div className="p-3 bg-slate-100 text-center rounded border">🔒 View Only Mode</div>}

          </form>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg h-fit space-y-6">
            <div className={`p-4 rounded-lg border ${rawProfit >= 0 ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                <div className="text-xs uppercase text-slate-400 mb-1">Actual Profit (Cash)</div>
                <div className={`text-3xl font-bold font-mono ${rawProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rawProfit >= 0 ? '+' : ''}₦{rawProfit.toLocaleString()}
                </div>
            </div>

            <div className="space-y-2 text-sm pt-4 border-t border-slate-700">
                <div className="flex justify-between"><span>Taxable Vol:</span><span className="font-mono">₦{taxableVolume.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Gross Comm:</span><span className="font-mono">₦{expectedCommission.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-400"><span>- Bank Charges:</span><span className="font-mono">₦{form.bankCharges.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-blue-300 border-t border-slate-700 pt-2"><span>Target Profit:</span><span className="font-mono">₦{targetProfit.toLocaleString()}</span></div>
            </div>

            <div className={`text-center p-2 rounded font-bold text-sm ${performanceDifference >= -100 ? 'bg-green-600' : 'bg-red-600'}`}>
                {performanceDifference >= -100 ? "BALANCED" : `SHORTAGE: ₦${Math.abs(performanceDifference).toLocaleString()}`}
            </div>
        </div>

      </div>
    </div>
  );
}