import { useState, useEffect } from 'react';
import { Save, Wallet, Banknote, RefreshCw, Calculator, Loader2, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function POS() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    staffName: '',
    machineName: 'Moniepoint 1',
    // Morning
    openingCash: 0,
    openingWallet: 0,
    capitalGiven: 0,
    // Evening
    closingCash: 0,
    closingWallet: 0,
    cashRemitted: 0,
    // Analysis
    transactionVolume: 0, 
    chargePer100k: 1000,
    // DEDUCTIONS
    bankCharges: 0,      // Money the bank took
    exemptedVolume: 0,   // "Free" transfers for boss/staff
  });

  // 1. Actual Profit (Cash Handled)
  const startTotal = Number(form.openingCash) + Number(form.openingWallet) + Number(form.capitalGiven);
  const endTotal = Number(form.closingCash) + Number(form.closingWallet) + Number(form.cashRemitted);
  // We add Bank Charges back to "End Total" because that money WAS earned but taken by the bank.
  // Wait, actually: Profit = (Closing Assets) - (Opening Assets). 
  // If the bank took 50 naira, it's gone from the wallet. So it's an expense.
  // Real Profit = (End - Start).
  const rawProfit = endTotal - startTotal;

  // 2. Expected Commission Calculation
  // We only expect commission on (Total Volume - Exempted Volume)
  const taxableVolume = Math.max(0, Number(form.transactionVolume) - Number(form.exemptedVolume));
  const expectedCommission = (taxableVolume / 100000) * Number(form.chargePer100k);

  // 3. Performance
  // The staff should have: (Expected Commission) - (Bank Charges they had to pay)
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
        setForm({ ...form, openingCash: 0, openingWallet: 0, closingCash: 0, closingWallet: 0, transactionVolume: 0, bankCharges: 0, exemptedVolume: 0 });
    } else {
        alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">POS & Money Transfer Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: FORM */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-medium text-slate-600">Staff Name</label>
                  <input type="text" required className="w-full p-2 border rounded mt-1"
                    value={form.staffName} onChange={e => setForm({...form, staffName: e.target.value})} />
               </div>
               <div>
                  <label className="text-sm font-medium text-slate-600">Machine</label>
                  <select className="w-full p-2 border rounded mt-1"
                    value={form.machineName} onChange={e => setForm({...form, machineName: e.target.value})}>
                    <option>Moniepoint 1</option>
                    <option>Moniepoint 2</option>
                    <option>Opay 1</option>
                    <option>Palmpay 1</option>
                  </select>
               </div>
            </div>

            {/* OPENING */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><Wallet size={16} /> Start</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold text-orange-700">Opening Cash</label><input type="number" className="w-full p-2 border rounded" value={form.openingCash} onChange={e => setForm({...form, openingCash: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-orange-700">Wallet Bal</label><input type="number" className="w-full p-2 border rounded" value={form.openingWallet} onChange={e => setForm({...form, openingWallet: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-orange-700">Capital Given</label><input type="number" className="w-full p-2 border rounded" value={form.capitalGiven} onChange={e => setForm({...form, capitalGiven: parseFloat(e.target.value) || 0})} /></div>
                </div>
            </div>

            {/* CLOSING */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Banknote size={16} /> Closing</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold text-blue-700">Closing Cash</label><input type="number" className="w-full p-2 border rounded" value={form.closingCash} onChange={e => setForm({...form, closingCash: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-blue-700">Wallet Bal</label><input type="number" className="w-full p-2 border rounded" value={form.closingWallet} onChange={e => setForm({...form, closingWallet: parseFloat(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-blue-700">Cash Remitted</label><input type="number" className="w-full p-2 border rounded" value={form.cashRemitted} onChange={e => setForm({...form, cashRemitted: parseFloat(e.target.value) || 0})} /></div>
                </div>
            </div>

            {/* ANALYSIS INPUTS */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><Calculator size={16} /> Analysis Data</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-purple-700">Total Volume</label>
                        <input type="number" className="w-full p-2 border border-purple-200 rounded" placeholder="Total Transactions"
                           value={form.transactionVolume} onChange={e => setForm({...form, transactionVolume: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-purple-700">Standard Charge (per 100k)</label>
                        <input type="number" className="w-full p-2 border border-purple-200 rounded"
                           value={form.chargePer100k} onChange={e => setForm({...form, chargePer100k: parseFloat(e.target.value) || 0})} />
                    </div>
                    
                    {/* DEDUCTIONS */}
                    <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-purple-200">
                        <div>
                            <label className="text-xs font-bold text-red-600 flex items-center gap-1">
                                Bank Charges <Info size={12}/>
                            </label>
                            <input type="number" className="w-full p-2 border border-red-200 rounded bg-red-50" 
                               placeholder="e.g. 500"
                               value={form.bankCharges} onChange={e => setForm({...form, bankCharges: parseFloat(e.target.value) || 0})} />
                            <p className="text-[10px] text-slate-500">Total debits by Moniepoint/Opay</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                Free Transfer Volume <Info size={12}/>
                            </label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded" 
                               placeholder="e.g. 20000"
                               value={form.exemptedVolume} onChange={e => setForm({...form, exemptedVolume: parseFloat(e.target.value) || 0})} />
                            <p className="text-[10px] text-slate-500">Total amount transferred for Staff/Boss</p>
                        </div>
                    </div>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white p-3 rounded font-bold hover:bg-slate-800 flex justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} {loading ? 'Saving...' : 'Close Account'}
            </button>
          </form>
        </div>

        {/* RIGHT: Live Analysis */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg h-fit space-y-6">
            <h3 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-4">Results</h3>
            
            {/* 1. Raw Profit */}
            <div className={`p-4 rounded-lg border ${rawProfit >= 0 ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                <div className="text-sm font-bold mb-1">Actual Cash Profit</div>
                <div className={`text-3xl font-bold ${rawProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rawProfit >= 0 ? '+' : ''}₦{rawProfit.toLocaleString()}
                </div>
            </div>

            {/* 2. Target Calculation Breakdown */}
            <div className="text-sm space-y-2 border-t border-slate-700 pt-4">
                <div className="flex justify-between">
                    <span className="text-slate-400">Total Volume:</span>
                    <span>₦{form.transactionVolume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                    <span>- Free Transfers:</span>
                    <span>(₦{form.exemptedVolume.toLocaleString()})</span>
                </div>
                <div className="flex justify-between font-bold border-b border-slate-700 pb-2">
                    <span>= Taxable Volume:</span>
                    <span>₦{taxableVolume.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between pt-2">
                    <span className="text-slate-400">Gross Commission:</span>
                    <span>₦{expectedCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400">
                    <span>- Bank Charges:</span>
                    <span>(₦{form.bankCharges.toLocaleString()})</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-blue-300 pt-2 border-t border-slate-700">
                    <span>Target Profit:</span>
                    <span>₦{targetProfit.toLocaleString()}</span>
                </div>
            </div>

            {/* 3. Final Verdict */}
            <div className={`text-center p-2 rounded font-bold ${performanceDifference >= -100 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {performanceDifference >= -100 
                    ? "✅ STAFF IS BALANCED" 
                    : `⚠️ SHORTAGE: ₦${Math.abs(performanceDifference).toLocaleString()}`
                }
            </div>
        </div>

      </div>
    </div>
  );
}