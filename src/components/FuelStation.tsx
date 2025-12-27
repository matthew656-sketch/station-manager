import { useState, useEffect } from 'react';
import { Save, Plus, Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FuelStation() {
  const [sales, setSales] = useState<any[]>([]); 
  const [debts, setDebts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    staffName: '',
    pumpId: 'Pump 1',
    product: 'PMS (Petrol)', 
    openingMeter: 0,
    closingMeter: 0,
    rate: 940, 
    cashCollected: 0,
    posCollected: 0,
    expenses: 0,
    creditAmount: 0, 
    creditCustomer: '', 
  });

  const litersSold = formData.closingMeter - formData.openingMeter;
  const expectedAmount = litersSold * formData.rate;
  const totalAccountedFor = Number(formData.cashCollected) + Number(formData.posCollected) + Number(formData.expenses) + Number(formData.creditAmount);
  const difference = totalAccountedFor - expectedAmount;

  useEffect(() => {
    fetchRecords();
    fetchDebts();
  }, []);

  const fetchRecords = async () => {
    const { data } = await supabase.from('fuel_sales').select('*').order('id', { ascending: false });
    setSales(data || []);
  };

  const fetchDebts = async () => {
    // Only show debts that are NOT paid
    const { data } = await supabase.from('debts').select('*').eq('status', 'Unpaid').order('id', { ascending: false });
    setDebts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: saleError } = await supabase.from('fuel_sales').insert([{
        staff_name: formData.staffName,
        product: formData.product,
        liters_sold: litersSold,
        expected_amount: expectedAmount,
        difference: difference,
        date: new Date().toLocaleDateString()
    }]);

    if (formData.creditAmount > 0 && !saleError) {
        await supabase.from('debts').insert([{
            customer_name: formData.creditCustomer || 'Unknown Customer',
            amount: formData.creditAmount,
            staff_name: formData.staffName,
            status: 'Unpaid',
            date: new Date().toLocaleDateString()
        }]);
    }

    if (!saleError) {
        alert('Saved Successfully!');
        fetchRecords();
        fetchDebts();
        setFormData({ ...formData, openingMeter: 0, closingMeter: 0, cashCollected: 0, posCollected: 0, expenses: 0, creditAmount: 0, creditCustomer: '' });
    } else {
        alert('Error: ' + saleError.message);
    }
    setLoading(false);
  };

  // --- NEW FUNCTION: Pay Debt ---
  const markAsPaid = async (id: number, name: string) => {
    if (!confirm(`Has ${name} paid this debt completely?`)) return;

    const { error } = await supabase
        .from('debts')
        .update({ status: 'Paid' })
        .eq('id', id);

    if (!error) {
        alert("Debt Marked as Paid!");
        fetchDebts(); // Refresh the list to remove it
    } else {
        alert("Error: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Warning */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Fuel & Gas Station</h1>
        {debts.length > 0 && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm border border-red-200 animate-pulse">
                ⚠️ {debts.length} Unpaid Debts (Total: ₦{debts.reduce((sum, d) => sum + d.amount, 0).toLocaleString()})
            </div>
        )}
      </div>

      {/* Entry Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-blue-600" /> New Daily Entry
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-600">Staff Name</label>
            <input type="text" className="w-full p-2 border rounded mt-1" 
              value={formData.staffName} onChange={e => setFormData({...formData, staffName: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Product</label>
            <select className="w-full p-2 border rounded mt-1"
               value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})}>
               <option>PMS (Petrol)</option>
               <option>AGO (Diesel)</option>
               <option>LPG (Gas)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Price / Liter</label>
            <input type="number" className="w-full p-2 border rounded mt-1 bg-slate-50" 
               value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})} />
          </div>

          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
            <div>
                <label className="block text-sm font-bold text-blue-800">Opening Meter</label>
                <input type="number" className="w-full p-2 border border-blue-200 rounded mt-1" 
                  value={formData.openingMeter} onChange={e => setFormData({...formData, openingMeter: parseFloat(e.target.value)})} />
            </div>
            <div>
                <label className="block text-sm font-bold text-blue-800">Closing Meter</label>
                <input type="number" className="w-full p-2 border border-blue-200 rounded mt-1" 
                  value={formData.closingMeter} onChange={e => setFormData({...formData, closingMeter: parseFloat(e.target.value)})} />
            </div>
            <div className="text-center pt-6">
                <div className="text-sm text-blue-600">Liters Sold</div>
                <div className="text-xl font-bold">{litersSold.toFixed(1)}</div>
            </div>
            <div className="text-center pt-6">
                <div className="text-sm text-blue-600">Expected Money</div>
                <div className="text-xl font-bold">₦{expectedAmount.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600">Cash Collected</label>
            <input type="number" className="w-full p-2 border rounded mt-1" placeholder="e.g. 50000"
               value={formData.cashCollected || ''} onChange={e => setFormData({...formData, cashCollected: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">POS / Transfer</label>
            <input type="number" className="w-full p-2 border rounded mt-1" placeholder="e.g. 20000"
               value={formData.posCollected || ''} onChange={e => setFormData({...formData, posCollected: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Expenses</label>
            <input type="number" className="w-full p-2 border rounded mt-1" 
               value={formData.expenses || ''} onChange={e => setFormData({...formData, expenses: parseFloat(e.target.value) || 0})} />
          </div>

          {/* CREDIT SECTION */}
          <div className="md:col-span-3 bg-red-50 p-4 rounded-lg border border-red-100">
             <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <CreditCard size={16} /> Sold on Credit?
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-red-700">Amount on Credit</label>
                    <input type="number" className="w-full p-2 border border-red-200 rounded" placeholder="0"
                       value={formData.creditAmount || ''} onChange={e => setFormData({...formData, creditAmount: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-red-700">Customer Name</label>
                    <input type="text" className="w-full p-2 border border-red-200 rounded" placeholder="Who owes us?"
                       value={formData.creditCustomer} onChange={e => setFormData({...formData, creditCustomer: e.target.value})} />
                </div>
             </div>
          </div>

          <div className="md:col-span-3 p-4 rounded-lg flex justify-between items-center font-bold text-white transition-colors duration-300"
               style={{ backgroundColor: difference < 0 ? '#ef4444' : difference > 0 ? '#22c55e' : '#64748b' }}>
              <span>Status:</span>
              <span className="text-xl">
                {difference < 0 ? `Shortage: ₦${Math.abs(difference).toLocaleString()}` : 
                 difference > 0 ? `Excess: +₦${difference.toLocaleString()}` : 'Perfectly Balanced'}
              </span>
          </div>

          <div className="md:col-span-3">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
                {loading ? 'Saving to Cloud...' : 'Save Daily Record'}
            </button>
          </div>
        </form>
      </div>

      {/* --- NEW SECTION: Debt Manager --- */}
      {debts.length > 0 && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-4 bg-red-100 border-b border-red-200 flex justify-between items-center">
                <h3 className="font-bold text-red-800 flex items-center gap-2">
                    <XCircle size={20} /> Unpaid Debts Manager
                </h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white text-red-900 border-b border-red-200">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Staff Responsible</th>
                        <th className="p-4">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {debts.map((debt, i) => (
                        <tr key={i} className="border-b border-red-100 hover:bg-red-100/50">
                            <td className="p-4">{debt.date}</td>
                            <td className="p-4 font-bold">{debt.customer_name}</td>
                            <td className="p-4 font-mono text-red-600 font-bold">₦{debt.amount.toLocaleString()}</td>
                            <td className="p-4 text-sm">{debt.staff_name}</td>
                            <td className="p-4">
                                <button 
                                    onClick={() => markAsPaid(debt.id, debt.customer_name)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                                    <CheckCircle size={16} /> Mark Paid
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b">
            <h3 className="font-bold text-slate-700">Daily Sales History</h3>
        </div>
        <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Staff</th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Liters</th>
                    <th className="p-4">Expected</th>
                    <th className="p-4">Status</th>
                </tr>
            </thead>
            <tbody>
                {sales.map((sale, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="p-4">{sale.date}</td>
                        <td className="p-4 font-medium">{sale.staff_name}</td>
                        <td className="p-4">{sale.product}</td>
                        <td className="p-4">{sale.liters_sold}</td>
                        <td className="p-4">₦{sale.expected_amount?.toLocaleString()}</td>
                        <td className={`p-4 font-bold ${
                            sale.difference < 0 ? 'text-red-500' : 
                            sale.difference > 0 ? 'text-green-500' : 'text-slate-500'
                        }`}>
                            {sale.difference < 0 ? `Short: ₦${Math.abs(sale.difference).toLocaleString()}` : 
                             sale.difference > 0 ? `Excess: ₦${sale.difference.toLocaleString()}` : 'Balanced'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}