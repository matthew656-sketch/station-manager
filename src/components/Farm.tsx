import { useState, useEffect } from 'react';
import { Save, Sprout, Scale, Receipt, Loader2, CreditCard, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props { userRole: string; }

export default function Farm({ userRole }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState<any>(null); // For Receipt
  
  const [form, setForm] = useState({
    customerName: '', item: 'Live Pig', quantity: 0, pricePerUnit: 0, expenses: 0, note: '',
    creditAmount: 0, creditCustomer: '', debtRepaidAmount: 0, debtRepaidCustomer: '',
  });

  const expectedTotal = form.quantity * form.pricePerUnit;
  const netProfit = expectedTotal - form.expenses;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: farmData } = await supabase.from('farm_records').select('*').order('id', { ascending: false });
    if (farmData) setRecords(farmData);
    const { data: debtData } = await supabase.from('debts').select('*').eq('status', 'Unpaid').eq('notes', 'Farm Debt').order('id', { ascending: false });
    if (debtData) setUnpaidDebts(debtData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (form.debtRepaidAmount > 0 && form.debtRepaidCustomer) {
             const debt = unpaidDebts.find(d => d.customer_name === form.debtRepaidCustomer);
             if (debt) {
                const newBalance = Number(debt.amount) - Number(form.debtRepaidAmount);
                if (newBalance <= 0) { await supabase.from('debts').update({ status: 'Paid', amount: 0, notes: `Paid` }).eq('id', debt.id); } 
                else { await supabase.from('debts').update({ amount: newBalance }).eq('id', debt.id); }
                alert("Repayment Recorded!");
             }
        }
        if (form.quantity > 0 || form.expenses > 0) {
            const { error } = await supabase.from('farm_records').insert([{
                customer_name: form.customerName || 'Farm Op', item: form.item, quantity: form.quantity,
                price_per_unit: form.pricePerUnit, total_amount: expectedTotal, expenses: form.expenses,
                date: new Date().toLocaleDateString(), note: form.note || ''
            }]);
            if (error) throw error;
            if (form.creditAmount > 0) {
                await supabase.from('debts').insert([{
                    customer_name: form.creditCustomer || 'Unknown', amount: form.creditAmount,
                    staff_name: form.customerName, status: 'Unpaid', notes: 'Farm Debt', date: new Date().toLocaleDateString()
                }]);
            }
            alert("Record Saved!");
        }
        fetchData();
        setForm({ customerName: '', item: 'Live Pig', quantity: 0, pricePerUnit: 0, expenses: 0, note: '', creditAmount: 0, creditCustomer: '', debtRepaidAmount: 0, debtRepaidCustomer: '' });
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setLoading(false); }
  };

  const markDebtAsPaid = async (debtId: number) => {
    if (!confirm(`Mark debt as PAID?`)) return;
    await supabase.from('debts').update({ status: 'Paid' }).eq('id', debtId);
    fetchData();
  };

  const handlePrint = (record: any) => {
    setPrintData(record);
    setTimeout(() => { window.print(); }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-slate-800">Farm & Piggery</h1>
        {unpaidDebts.length > 0 && <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-bold border border-red-200">⚠️ {unpaidDebts.length} Unpaid Debts</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Customer</label><input className="w-full p-2 border rounded" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500">Item</label><select className="w-full p-2 border rounded" value={form.item} onChange={e => setForm({...form, item: e.target.value})}><option>Live Pig (Adult)</option><option>Weaners</option><option>Pork Kilo</option><option>Feed/Drugs</option></select></div>
            <div className="bg-green-50 p-3 rounded col-span-2 grid grid-cols-2 gap-2">
                <div><label className="text-xs text-green-800 font-bold">Qty/Weight</label><input type="number" className="w-full p-2 border rounded" value={form.quantity || ''} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} /></div>
                <div><label className="text-xs text-green-800 font-bold">Price/Unit</label><input type="number" className="w-full p-2 border rounded" value={form.pricePerUnit || ''} onChange={e => setForm({...form, pricePerUnit: parseFloat(e.target.value)})} /></div>
            </div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Expenses</label><input type="number" className="w-full p-2 border rounded" value={form.expenses || ''} onChange={e => setForm({...form, expenses: parseFloat(e.target.value)})} /></div>
            
            {/* Repayment & Credit */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                 <div className="bg-red-50 p-3 rounded text-xs"><h3 className="font-bold text-red-800 mb-2">Sold on Credit?</h3><input type="number" placeholder="Amount" className="w-full p-1 border rounded mb-2" onChange={e => setForm({...form, creditAmount: parseFloat(e.target.value)})} /><input type="text" placeholder="Customer" className="w-full p-1 border rounded" onChange={e => setForm({...form, creditCustomer: e.target.value})} /></div>
                 <div className="bg-green-50 p-3 rounded text-xs"><h3 className="font-bold text-green-800 mb-2">Debt Repayment?</h3><input type="number" placeholder="Paid Amount" className="w-full p-1 border rounded mb-2" onChange={e => setForm({...form, debtRepaidAmount: parseFloat(e.target.value)})} /><select className="w-full p-1 border rounded" onChange={e => setForm({...form, debtRepaidCustomer: e.target.value})}><option value="">Select...</option>{unpaidDebts.map(d => <option key={d.id} value={d.customer_name}>{d.customer_name}</option>)}</select></div>
            </div>

            {userRole === 'admin' ? <button type="submit" disabled={loading} className="md:col-span-2 w-full bg-green-700 text-white p-3 rounded font-bold">{loading ? <Loader2 className="animate-spin inline"/> : "Save Farm Record"}</button> : <div className="md:col-span-2 p-3 bg-slate-100 text-center rounded border">🔒 View Only Mode</div>}
          </form>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border h-fit"><h3 className="font-bold text-lg mb-4 text-slate-700">Preview</h3><div className="text-3xl font-bold font-mono text-center mt-4">₦{netProfit.toLocaleString()}</div></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Item</th><th className="p-4">Amount</th><th className="p-4">Print</th></tr></thead>
            <tbody>
                {records.map((rec, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-4">{rec.date}</td><td className="p-4">{rec.customer_name}</td><td className="p-4">{rec.item}</td><td className="p-4 font-bold text-green-700">₦{rec.total_amount?.toLocaleString()}</td>
                        <td className="p-4"><button onClick={() => handlePrint(rec)} className="text-slate-500 hover:text-blue-600"><Printer size={18} /></button></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* PRINT TEMPLATE */}
      {printData && (
        <div id="printable-receipt" className="hidden">
            <div className="text-center mb-6"><h1 className="text-2xl font-bold uppercase">Okeb Nigeria Ltd</h1><p className="text-sm text-slate-500">Farm & Piggery Receipt</p><div className="border-b border-dashed border-black my-4"></div></div>
            <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{printData.date}</span></div>
                <div className="flex justify-between"><span>Customer:</span> <span className="font-bold">{printData.customer_name}</span></div>
                <div className="flex justify-between"><span>Item:</span> <span className="font-bold">{printData.item}</span></div>
                <div className="flex justify-between"><span>Quantity:</span> <span className="font-bold">{printData.quantity}</span></div>
                <div className="border-t border-dashed border-black my-2"></div>
                <div className="flex justify-between text-lg font-bold"><span>TOTAL:</span><span>₦{printData.total_amount?.toLocaleString()}</span></div>
            </div>
            <div className="mt-8 text-center text-xs italic"><p>Thank you for your patronage.</p></div>
        </div>
      )}
    </div>
  );
}