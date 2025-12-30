import { useState, useEffect } from 'react';
import { Save, Plus, Loader2, CreditCard, XCircle, CheckCircle, Printer, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  userRole: string;
}

export default function FuelStation({ userRole }: Props) {
  const [sales, setSales] = useState<any[]>([]); 
  const [debts, setDebts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState<any>(null); // Holds data for the receipt
  
  const [formData, setFormData] = useState({
    staffName: '', pumpId: 'Pump 1', product: 'PMS (Petrol)', 
    openingMeter: 0, closingMeter: 0, rate: 940, 
    cashCollected: 0, posCollected: 0, expenses: 0,
    creditAmount: 0, creditCustomer: '', 
  });

  const litersSold = formData.closingMeter - formData.openingMeter;
  const expectedAmount = litersSold * formData.rate;
  const totalAccountedFor = Number(formData.cashCollected) + Number(formData.posCollected) + Number(formData.expenses) + Number(formData.creditAmount);
  const difference = totalAccountedFor - expectedAmount;

  useEffect(() => { fetchRecords(); fetchDebts(); }, []);

  const fetchRecords = async () => {
    const { data } = await supabase.from('fuel_sales').select('*').order('id', { ascending: false });
    setSales(data || []);
  };
  const fetchDebts = async () => {
    const { data } = await supabase.from('debts').select('*').eq('status', 'Unpaid').order('id', { ascending: false });
    setDebts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error: saleError } = await supabase.from('fuel_sales').insert([{
        staff_name: formData.staffName, product: formData.product, liters_sold: litersSold,
        expected_amount: expectedAmount, difference: difference, date: new Date().toLocaleDateString()
    }]);

    if (formData.creditAmount > 0 && !saleError) {
        await supabase.from('debts').insert([{
            customer_name: formData.creditCustomer || 'Unknown', amount: formData.creditAmount,
            staff_name: formData.staffName, status: 'Unpaid', date: new Date().toLocaleDateString()
        }]);
    }
    if (!saleError) {
        alert('Saved Successfully!'); fetchRecords(); fetchDebts();
        setFormData({ ...formData, openingMeter: 0, closingMeter: 0, cashCollected: 0, posCollected: 0, expenses: 0, creditAmount: 0, creditCustomer: '' });
    } else { alert('Error: ' + saleError.message); }
    setLoading(false);
  };

  const markAsPaid = async (id: number, name: string) => {
    if (!confirm(`Mark debt for ${name} as PAID?`)) return;
    const { error } = await supabase.from('debts').update({ status: 'Paid' }).eq('id', id);
    if (!error) { alert("Debt Paid!"); fetchDebts(); }
  };

  // --- PRINT FUNCTION ---
  const handlePrint = (record: any) => {
    setPrintData(record);
    // Wait for state to update, then print
    setTimeout(() => {
        window.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Fuel & Gas Station</h1>
        {debts.length > 0 && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm border border-red-200">
                ⚠️ {debts.length} Unpaid Debts
            </div>
        )}
      </div>

      {/* Entry Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus size={20} className="text-blue-600"/> New Daily Entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Staff Name</label><input type="text" className="w-full p-2 border rounded" value={formData.staffName} onChange={e => setFormData({...formData, staffName: e.target.value})} required /></div>
          <div><label className="text-xs font-bold text-slate-500">Product</label><select className="w-full p-2 border rounded" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})}><option>PMS (Petrol)</option><option>AGO (Diesel)</option><option>LPG (Gas)</option></select></div>
          <div><label className="text-xs font-bold text-slate-500">Price/Liter</label><input type="number" className="w-full p-2 border rounded" value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})} /></div>
          
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
            <div><label className="text-xs font-bold text-blue-800">Opening</label><input type="number" className="w-full p-2 border rounded" value={formData.openingMeter} onChange={e => setFormData({...formData, openingMeter: parseFloat(e.target.value)})} /></div>
            <div><label className="text-xs font-bold text-blue-800">Closing</label><input type="number" className="w-full p-2 border rounded" value={formData.closingMeter} onChange={e => setFormData({...formData, closingMeter: parseFloat(e.target.value)})} /></div>
            <div className="text-center pt-4"><div className="text-xs text-blue-600">Liters</div><div className="text-xl font-bold">{litersSold.toFixed(1)}</div></div>
            <div className="text-center pt-4"><div className="text-xs text-blue-600">Expected</div><div className="text-xl font-bold">₦{expectedAmount.toLocaleString()}</div></div>
          </div>

          <div><label className="text-xs font-bold text-slate-500">Cash</label><input type="number" className="w-full p-2 border rounded" value={formData.cashCollected || ''} onChange={e => setFormData({...formData, cashCollected: parseFloat(e.target.value)})} /></div>
          <div><label className="text-xs font-bold text-slate-500">POS</label><input type="number" className="w-full p-2 border rounded" value={formData.posCollected || ''} onChange={e => setFormData({...formData, posCollected: parseFloat(e.target.value)})} /></div>
          <div><label className="text-xs font-bold text-slate-500">Exp</label><input type="number" className="w-full p-2 border rounded" value={formData.expenses || ''} onChange={e => setFormData({...formData, expenses: parseFloat(e.target.value)})} /></div>

          <div className="md:col-span-3 bg-red-50 p-4 rounded-lg border border-red-100 grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-red-700">Credit Amount</label><input type="number" className="w-full p-2 border rounded" value={formData.creditAmount || ''} onChange={e => setFormData({...formData, creditAmount: parseFloat(e.target.value)})} /></div>
             <div><label className="text-xs font-bold text-red-700">Customer Name</label><input type="text" className="w-full p-2 border rounded" value={formData.creditCustomer} onChange={e => setFormData({...formData, creditCustomer: e.target.value})} /></div>
          </div>

          <div className="md:col-span-3 text-center p-2 rounded text-white font-bold" style={{ backgroundColor: difference < 0 ? '#ef4444' : difference > 0 ? '#22c55e' : '#64748b' }}>
              {difference < 0 ? `Short: ₦${Math.abs(difference).toLocaleString()}` : "Balanced"}
          </div>

          <div className="md:col-span-3">
            {userRole === 'admin' ? (
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700">{loading ? <Loader2 className="animate-spin inline"/> : "Save Daily Record"}</button>
            ) : <div className="p-4 bg-slate-100 text-center rounded border">🔒 View Only Mode</div>}
          </div>
        </form>
      </div>

      {/* DEBT MANAGER */}
      {debts.length > 0 && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-4 bg-red-100 border-b border-red-200"><h3 className="font-bold text-red-800 flex items-center gap-2"><XCircle size={20}/> Unpaid Debts</h3></div>
            <table className="w-full text-left text-sm"><tbody>
                {debts.map((debt, i) => (
                    <tr key={i} className="border-b border-red-100 p-2">
                        <td className="p-4 font-bold">{debt.customer_name}</td>
                        <td className="p-4 font-mono text-red-600">₦{debt.amount.toLocaleString()}</td>
                        <td className="p-4">{userRole === 'admin' && <button onClick={() => markAsPaid(debt.id, debt.customer_name)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Mark Paid</button>}</td>
                    </tr>
                ))}
            </tbody></table>
        </div>
      )}

      {/* SALES HISTORY with PRINT BUTTON */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="p-4">Date</th><th className="p-4">Staff</th><th className="p-4">Product</th><th className="p-4">Liters</th><th className="p-4">Amount</th><th className="p-4">Print</th></tr></thead>
            <tbody>
                {sales.map((sale, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="p-4">{sale.date}</td>
                        <td className="p-4 font-bold">{sale.staff_name}</td>
                        <td className="p-4">{sale.product}</td>
                        <td className="p-4">{sale.liters_sold}</td>
                        <td className="p-4 font-mono">₦{sale.expected_amount?.toLocaleString()}</td>
                        <td className="p-4">
                            <button onClick={() => handlePrint(sale)} className="text-slate-500 hover:text-blue-600">
                                <Printer size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* --- HIDDEN RECEIPT TEMPLATE (Only Visible when Printing) --- */}
      {printData && (
        <div id="printable-receipt" className="hidden">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold uppercase">Okeb Nigeria Ltd</h1>
                <p className="text-sm text-slate-500">Fuel & Gas Station Manager</p>
                <div className="border-b border-dashed border-black my-4"></div>
            </div>
            
            <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{printData.date}</span></div>
                <div className="flex justify-between"><span>Staff:</span> <span className="font-bold">{printData.staff_name}</span></div>
                <div className="flex justify-between"><span>Product:</span> <span className="font-bold">{printData.product}</span></div>
                <div className="flex justify-between"><span>Liters Sold:</span> <span className="font-bold">{printData.liters_sold} L</span></div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span>₦{printData.expected_amount?.toLocaleString()}</span>
                </div>
            </div>

            <div className="mt-8 text-center text-xs italic">
                <p>Generated automatically by Station Manager System.</p>
                <p>Thank you for your service.</p>
            </div>
        </div>
      )}

    </div>
  );
}