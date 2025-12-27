import { useState, useEffect } from 'react';
import { Save, Sprout, Scale, Receipt, Loader2, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Farm() {
  const [records, setRecords] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    customerName: '',
    item: 'Live Pig', 
    quantity: 0,      
    pricePerUnit: 0,  
    expenses: 0,      
    note: '',
    creditAmount: 0,
    creditCustomer: '',
    debtRepaidAmount: 0,
    debtRepaidCustomer: '',
  });

  const expectedTotal = form.quantity * form.pricePerUnit;
  const netProfit = expectedTotal - form.expenses;

  useEffect(() => {
    fetchData();
  }, []);

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
        // 1. Save Farm Sales Record
        const { error: saleError } = await supabase.from('farm_records').insert([{
            customer_name: form.customerName,
            item: form.item,
            quantity: form.quantity,
            price_per_unit: form.pricePerUnit,
            total_amount: expectedTotal,
            expenses: form.expenses,
            date: new Date().toLocaleDateString(),
            note: form.note || ''
        }]);

        if (saleError) throw saleError;

        // 2. Save NEW DEBT
        if (form.creditAmount > 0) {
            await supabase.from('debts').insert([{
                customer_name: form.creditCustomer || 'Unknown',
                amount: form.creditAmount,
                staff_name: form.customerName, 
                status: 'Unpaid',
                notes: 'Farm Debt', 
                date: new Date().toLocaleDateString()
            }]);
        }

        // 3. HANDLE PARTIAL REPAYMENT
        if (form.debtRepaidAmount > 0 && form.debtRepaidCustomer) {
            
            // Find the debt record
            const debt = unpaidDebts.find(d => d.customer_name === form.debtRepaidCustomer);
            
            if (debt) {
                const newBalance = Number(debt.amount) - Number(form.debtRepaidAmount);
                
                if (newBalance <= 0) {
                    // Fully Paid
                    await supabase.from('debts')
                        .update({ 
                            status: 'Paid', 
                            amount: 0, 
                            notes: `Paid in full (Last payment: ${form.debtRepaidAmount})` 
                        })
                        .eq('id', debt.id);
                    alert("Debt Fully Paid!");
                } else {
                    // Partially Paid - Update Balance
                    await supabase.from('debts')
                        .update({ 
                            amount: newBalance,
                            // Keep status 'Unpaid' so it stays on the list
                        })
                        .eq('id', debt.id);
                    alert(`Partial Payment Recorded! Remaining Balance: ₦${newBalance.toLocaleString()}`);
                }
            }
        }

        fetchData();
        setForm({ 
            customerName: '', item: 'Live Pig', quantity: 0, pricePerUnit: 0, expenses: 0, note: '', 
            creditAmount: 0, creditCustomer: '', debtRepaidAmount: 0, debtRepaidCustomer: '' 
        });

    } catch (error: any) {
        alert("Error saving: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Farm & Piggery Management</h1>
        {unpaidDebts.length > 0 && (
             <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm border border-red-200 animate-pulse">
                ⚠️ {unpaidDebts.length} Unpaid Farm Debts
             </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-600">Customer Name / Description</label>
               <input type="text" className="w-full p-2 border rounded mt-1" 
                 value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-600">Item Type</label>
               <select className="w-full p-2 border rounded mt-1" value={form.item} onChange={e => setForm({...form, item: e.target.value})}>
                  <option>Live Pig (Adult)</option>
                  <option>Weaners (Piglets)</option>
                  <option>Pork Kilo (Meat)</option>
                  <option>Manure (Fertilizer)</option>
                  <option>Feed / Drugs (Expense Only)</option>
               </select>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 md:col-span-2 grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-green-800">Quantity</label><input type="number" className="w-full p-2 border rounded mt-1" value={form.quantity || ''} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs font-bold text-green-800">Price/Unit</label><input type="number" className="w-full p-2 border rounded mt-1" value={form.pricePerUnit || ''} onChange={e => setForm({...form, pricePerUnit: parseFloat(e.target.value)})} /></div>
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-600">Farm Expenses</label>
               <input type="number" className="w-full p-2 border rounded mt-1" value={form.expenses || ''} onChange={e => setForm({...form, expenses: parseFloat(e.target.value)})} />
            </div>
            
            {/* CREDIT AND REPAYMENT */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                 <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <h3 className="font-bold text-red-800 mb-2 text-xs">Sold on Credit?</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Amount" className="p-1 border rounded text-sm" value={form.creditAmount || ''} onChange={e => setForm({...form, creditAmount: parseFloat(e.target.value)})} />
                        <input type="text" placeholder="Customer" className="p-1 border rounded text-sm" value={form.creditCustomer} onChange={e => setForm({...form, creditCustomer: e.target.value})} />
                    </div>
                 </div>

                 <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <h3 className="font-bold text-green-800 mb-2 text-xs">Debt Repayment?</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Amount Paid" className="p-1 border rounded text-sm" value={form.debtRepaidAmount || ''} onChange={e => setForm({...form, debtRepaidAmount: parseFloat(e.target.value)})} />
                        <select className="p-1 border rounded text-sm" value={form.debtRepaidCustomer} onChange={e => setForm({...form, debtRepaidCustomer: e.target.value})}>
                            <option value="">Select Debtor...</option>
                            {unpaidDebts.map(d => (
                                <option key={d.id} value={d.customer_name}>{d.customer_name} (Owes ₦{d.amount.toLocaleString()})</option>
                            ))}
                        </select>
                    </div>
                 </div>
             </div>

            <button type="submit" disabled={loading} className="md:col-span-2 w-full bg-green-700 text-white p-3 rounded-lg font-bold hover:bg-green-800 flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} {loading ? 'Saving...' : 'Save Farm Record'}
            </button>
          </form>
        </div>

        {/* RIGHT: Live Summary */}
        <div className="bg-white p-6 rounded-xl shadow-lg border h-fit">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Preview</h3>
            <div className="space-y-4">
                <div className="flex justify-between border-b pb-2"><span>Sales Amount</span><span className="font-bold text-lg">₦{expectedTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-500"><span>- Expenses</span><span>(₦{form.expenses.toLocaleString()})</span></div>
                <div className="bg-slate-900 text-white p-4 rounded-lg text-center mt-4">
                    <div className="text-xs uppercase text-slate-400">Net Profit</div>
                    <div className="text-3xl font-bold font-mono">₦{netProfit.toLocaleString()}</div>
                </div>
            </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-600">Farm History</div>
        <table className="w-full text-left text-sm">
            <thead>
                <tr className="border-b">
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Amount</th>
                </tr>
            </thead>
            <tbody>
                {records.map((rec, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-4">{rec.date}</td>
                        <td className="p-4">{rec.customer_name}</td>
                        <td className="p-4">{rec.item}</td>
                        <td className="p-4 font-bold text-green-700">₦{rec.total_amount?.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}