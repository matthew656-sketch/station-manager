import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Box, ShoppingCart, Settings, ChefHat, Package, TrendingUp, User, CheckCircle, AlertTriangle, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props { userRole: string; }

export default function Bakery({ userRole }: Props) {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [products, setProducts] = useState<any[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState<any>(null); // For Receipt
  
  const [stock, setStock] = useState<Record<string, number>>({});
  const [salesRecords, setSalesRecords] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  
  // Forms
  const [staffName, setStaffName] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [tempItem, setTempItem] = useState({ type: '', price: 0, qtyGiven: 0, qtyReturned: 0 });
  const [expenses, setExpenses] = useState(0);
  const [cashRemitted, setCashRemitted] = useState(0); 
  const [repayment, setRepayment] = useState({ amount: 0, debtor: '' });
  const [productionForm, setProductionForm] = useState({ bakerName: '', flourUsed: 0 });
  const [producedCounts, setProducedCounts] = useState<Record<string, number>>({});
  const [newProduct, setNewProduct] = useState({ name: '', price: 0 });

  const normalizeName = (name: string) => name ? name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
  const totalSoldValue = cartItems.reduce((sum, item) => sum + ((item.qtyGiven - item.qtyReturned) * (item.price || 0)), 0);
  const debtIncurred = totalSoldValue - expenses - cashRemitted;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
        const { data: prodData } = await supabase.from('bakery_products').select('*').order('name', { ascending: true });
        const safeProducts = (prodData || []).map(p => ({ ...p, name: normalizeName(p.name), price: p.price || p.Price || 0 }));
        setProducts(safeProducts);
        if (safeProducts.length > 0 && !tempItem.type) setTempItem(prev => ({ ...prev, type: safeProducts[0].name, price: safeProducts[0].price }));

        const { data: salesData } = await supabase.from('bakery_sales').select('*').order('id', { ascending: false });
        if (salesData) setSalesRecords(salesData);

        const { data: logData } = await supabase.from('bakery_production').select('*').order('id', { ascending: false });
        if (logData) { setProductionLogs(logData); calculateLiveStock(logData, salesData || []); }

        const { data: debtData } = await supabase.from('debts').select('*').eq('status', 'Unpaid').ilike('notes', '%Bakery%').order('id', { ascending: false });
        setUnpaidDebts(debtData || []);
    } catch (err) { console.error(err); }
  };

  const calculateLiveStock = (production: any[], sales: any[]) => {
      const currentStock: Record<string, number> = {};
      production.forEach(log => { if (log.produced_items) Object.entries(log.produced_items).forEach(([b, q]) => currentStock[normalizeName(b)] = (currentStock[normalizeName(b)] || 0) + Number(q)); });
      sales.forEach(sale => { if (sale.bread_type && sale.opening_stock) currentStock[normalizeName(sale.bread_type)] = (currentStock[normalizeName(sale.bread_type)] || 0) - Number(sale.opening_stock); });
      setStock(currentStock);
  };

  const handleNumChange = (setter: any, field: string, val: string) => { setter((prev: any) => (field ? { ...prev, [field]: val === '' ? 0 : parseFloat(val) } : val === '' ? 0 : parseFloat(val))); };
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { const s = products.find(p => p.name === e.target.value); if (s) setTempItem({ ...tempItem, type: s.name, price: s.price }); };
  const addToCart = () => { if (tempItem.qtyGiven <= 0) return alert("Enter Quantity"); setCartItems([...cartItems, { ...tempItem }]); setTempItem({ ...tempItem, qtyGiven: 0, qtyReturned: 0 }); };
  
  const submitSales = async () => {
    setLoading(true);
    if (cartItems.length === 0 && repayment.amount <= 0) { setLoading(false); return alert("Please add items or enter repayment."); }
    try {
        if (cartItems.length > 0) {
            if (!staffName) throw new Error("Enter Staff Name");
            for (const item of cartItems) {
                const sold = item.qtyGiven - item.qtyReturned;
                await supabase.from('bakery_sales').insert([{ staff_name: staffName, bread_type: normalizeName(item.type), opening_stock: item.qtyGiven, closing_stock: item.qtyReturned, sold_quantity: sold, price_per_loaf: item.price, total_amount: sold * item.price, date: new Date().toLocaleDateString() }]);
            }
            if (debtIncurred > 0) await supabase.from('debts').insert([{ customer_name: staffName, amount: debtIncurred, status: 'Unpaid', notes: 'Bakery Shortage', date: new Date().toLocaleDateString() }]);
        }
        if (repayment.amount > 0 && repayment.debtor) {
            const debtRecord = unpaidDebts.find(d => d.customer_name === repayment.debtor);
            if (debtRecord) {
                const newBalance = Number(debtRecord.amount) - Number(repayment.amount);
                if (newBalance <= 0) await supabase.from('debts').update({ status: 'Paid', amount: 0, notes: `Paid` }).eq('id', debtRecord.id);
                else await supabase.from('debts').update({ amount: newBalance }).eq('id', debtRecord.id);
            }
        }
        alert("Saved!"); setCartItems([]); setStaffName(''); setExpenses(0); setCashRemitted(0); setRepayment({ amount: 0, debtor: '' }); fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handlePrint = (record: any) => { setPrintData(record); setTimeout(() => window.print(), 100); };

  // ... (Keeping production/settings functions same as before to save space) ...
  const handleProductionCountChange = (b: string, v: string) => setProducedCounts(p => ({ ...p, [b]: parseFloat(v)||0 }));
  const submitProduction = async () => {
      if(!productionForm.bakerName) return alert("Enter Baker");
      const items: any = {}; Object.entries(producedCounts).forEach(([k,v]) => {if(v>0) items[normalizeName(k)]=v});
      await supabase.from('bakery_production').insert([{ baker_name: productionForm.bakerName, flour_used: productionForm.flourUsed, produced_items: items, date: new Date().toLocaleDateString()}]);
      alert("Logged!"); setProductionForm({bakerName:'', flourUsed:0}); setProducedCounts({}); fetchData();
  };
  const saveProduct = async () => { if(newProduct.name) { await supabase.from('bakery_products').insert([{...newProduct, name: normalizeName(newProduct.name)}]); setNewProduct({name:'', price:0}); fetchData(); }};
  const deleteProduct = async (id: number) => { if(confirm("Delete?")) { await supabase.from('bakery_products').delete().eq('id', id); fetchData(); }};

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b pb-2 overflow-x-auto"><button onClick={() => setActiveTab('sales')} className={`px-4 py-2 font-bold flex gap-2 ${activeTab==='sales'?'text-orange-600 border-b-2 border-orange-600':'text-slate-500'}`}><ShoppingCart size={18}/> Sales</button><button onClick={() => setActiveTab('production')} className={`px-4 py-2 font-bold flex gap-2 ${activeTab==='production'?'text-blue-600 border-b-2 border-blue-600':'text-slate-500'}`}><Box size={18}/> Factory</button><button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-bold flex gap-2 ${activeTab==='settings'?'text-slate-800 border-b-2 border-slate-800':'text-slate-500'}`}><Settings size={18}/> Prices</button></div>

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-slate-800 text-white p-4 rounded-lg flex items-center gap-4 overflow-x-auto"><TrendingUp size={20}/> Stock: {Object.entries(stock).map(([b,q]) => <div key={b} className="bg-slate-700 px-3 py-1 rounded-full text-sm border border-slate-600">{b}: <span className={q<10?"text-red-400":"text-green-400"}>{q}</span></div>)}</div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                <div className="mb-4"><label className="text-sm font-bold">Staff</label><input className="w-full p-2 border rounded" value={staffName} onChange={e=>setStaffName(e.target.value)}/></div>
                <div className="bg-orange-50 p-4 rounded mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                        <div className="col-span-2"><label className="text-xs font-bold">Bread</label><select className="w-full p-2 border rounded text-sm" value={tempItem.type} onChange={handleProductSelect}>{products.map(p=><option key={p.id}>{p.name}</option>)}</select></div>
                        <div><label className="text-xs font-bold">Price</label><input className="w-full p-2 border rounded text-sm" value={tempItem.price} readOnly/></div>
                        <div><label className="text-xs font-bold">Given</label><input type="number" className="w-full p-2 border rounded" value={tempItem.qtyGiven||''} onChange={e=>handleNumChange(setTempItem,'qtyGiven',e.target.value)}/></div>
                        <div><label className="text-xs font-bold">Ret</label><input type="number" className="w-full p-2 border rounded" value={tempItem.qtyReturned||''} onChange={e=>handleNumChange(setTempItem,'qtyReturned',e.target.value)}/></div>
                        <button onClick={addToCart} className="col-span-2 md:col-span-5 bg-orange-600 text-white p-2 rounded font-bold mt-2">+ Add</button>
                    </div>
                </div>
                {cartItems.map((item,i)=><div key={i} className="flex justify-between bg-slate-50 p-2 rounded mb-2 text-sm"><span>{item.type} ({item.qtyGiven}-{item.qtyReturned})</span><Trash2 size={16} onClick={()=>{const n=[...cartItems];n.splice(i,1);setCartItems(n)}} className="text-red-500"/></div>)}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div><label className="text-xs font-bold">Expenses</label><input type="number" className="w-full p-2 border rounded" value={expenses||''} onChange={e=>handleNumChange(setExpenses,'',e.target.value)}/></div>
                    <div><label className="text-xs font-bold">Cash</label><input type="number" className="w-full p-2 border rounded" value={cashRemitted||''} onChange={e=>handleNumChange(setCashRemitted,'',e.target.value)}/></div>
                </div>
                
                <div className="bg-green-50 p-3 rounded mt-4 grid grid-cols-2 gap-2">
                    <select className="p-2 border rounded w-full" value={repayment.debtor} onChange={e=>setRepayment({...repayment, debtor:e.target.value})}><option value="">Pay Debt...</option>{unpaidDebts.map(d=><option key={d.id} value={d.customer_name}>{d.customer_name}</option>)}</select>
                    <input type="number" className="p-2 border rounded w-full" placeholder="Amount" value={repayment.amount||''} onChange={e=>handleNumChange(setRepayment,'amount',e.target.value)}/>
                </div>

                {userRole === 'admin' ? <button onClick={submitSales} className="w-full mt-4 bg-slate-900 text-white p-3 rounded font-bold">{loading?<Loader2 className="animate-spin inline"/>:"Save Record"}</button> : <div className="mt-4 p-3 bg-slate-100 text-center rounded">🔒 View Only</div>}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border h-fit">
                <h3 className="font-bold text-lg mb-4 flex gap-2"><User/> Summary</h3>
                <div className="flex justify-between"><span>Expected</span><span className="font-bold">₦{totalSoldValue.toLocaleString()}</span></div>
                <div className="bg-slate-100 p-2 rounded text-center mt-4 font-bold">{debtIncurred > 0 ? `DEBT: ₦${debtIncurred.toLocaleString()}` : 'BALANCED'}</div>
            </div>
        </div>
      )}

      {/* History Table with PRINT */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b"><tr><th className="p-3">Date</th><th className="p-3">Staff</th><th className="p-3">Type</th><th className="p-3">Sold</th><th className="p-3">Total</th><th className="p-3">Print</th></tr></thead><tbody>
        {salesRecords.map((sale, i) => (
            <tr key={i} className="border-b hover:bg-slate-50">
                <td className="p-3">{sale.date}</td><td className="p-3 font-bold">{sale.staff_name}</td><td className="p-3">{sale.bread_type}</td><td className="p-3">{sale.sold_quantity}</td><td className="p-3 font-mono">₦{sale.total_amount?.toLocaleString()}</td>
                <td className="p-3"><button onClick={()=>handlePrint(sale)} className="text-slate-500 hover:text-blue-600"><Printer size={18}/></button></td>
            </tr>
        ))}
        </tbody></table>
      </div>

      {/* PRINT RECEIPT */}
      {printData && (
        <div id="printable-receipt" className="hidden">
            <div className="text-center mb-6"><h1 className="text-2xl font-bold uppercase">Okeb Nigeria Ltd</h1><p className="text-sm text-slate-500">Bakery Receipt</p><div className="border-b border-dashed border-black my-4"></div></div>
            <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{printData.date}</span></div>
                <div className="flex justify-between"><span>Staff:</span> <span className="font-bold">{printData.staff_name}</span></div>
                <div className="flex justify-between"><span>Item:</span> <span className="font-bold">{printData.bread_type}</span></div>
                <div className="flex justify-between"><span>Quantity:</span> <span className="font-bold">{printData.sold_quantity}</span></div>
                <div className="border-t border-dashed border-black my-2"></div>
                <div className="flex justify-between text-lg font-bold"><span>TOTAL:</span><span>₦{printData.total_amount?.toLocaleString()}</span></div>
            </div>
            <div className="mt-8 text-center text-xs italic"><p>Thank you for your patronage.</p></div>
        </div>
      )}
      
      {/* (Production and Settings tabs omitted for brevity, they remain unchanged from previous version) */}
      {/* IMPORTANT: In your real file, keep the Factory and Settings tabs code below here! */}
       {activeTab === 'production' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-800"><ChefHat size={20}/> Ingredients</h3>
                  <div className="space-y-4">
                      <div><label className="text-sm font-bold text-slate-600">Head Baker Name</label><input type="text" className="w-full p-2 border rounded" placeholder="e.g. Master Emeka" value={productionForm.bakerName} onChange={e => setProductionForm({...productionForm, bakerName: e.target.value})} /></div>
                      <div><label className="text-sm font-bold text-slate-600">Flour Used (Bags)</label><input type="number" className="w-full p-2 border rounded text-lg font-bold" placeholder="0" value={productionForm.flourUsed || ''} onChange={e => handleNumChange(setProductionForm, 'flourUsed', e.target.value)} /></div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-800"><Package size={20}/> Output</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {products.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                              <span className="text-sm font-medium">{p.name}</span>
                              <input type="number" className="w-20 p-1 border rounded text-center font-bold" placeholder="0" 
                                  value={producedCounts[p.name] || ''} onChange={(e) => handleProductionCountChange(p.name, e.target.value)} />
                          </div>
                      ))}
                  </div>
                  <div className="mt-6">
                    {userRole === 'admin' ? (
                        <button onClick={submitProduction} className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700">Save Production Log</button>
                    ) : (
                        <div className="p-3 bg-slate-100 text-slate-500 text-center rounded border">🔒 View Only Mode</div>
                    )}
                  </div>
              </div>
              <div className="bg-slate-100 p-4 rounded-xl h-fit max-h-[600px] overflow-y-auto">
                  <h3 className="font-bold text-slate-600 mb-4">History</h3>
                  <div className="space-y-3">
                      {productionLogs.map((log, i) => (
                          <div key={i} className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-blue-500">
                              <div className="flex justify-between font-bold text-slate-700"><span>{log.date}</span><span>{log.baker_name}</span></div>
                              <div className="text-xs text-slate-500 mt-1">Used: {log.flour_used} Bags of Flour</div>
                              <div className="mt-2 pt-2 border-t text-xs">
                                  <strong>Produced: </strong>
                                  {log.produced_items && Object.entries(log.produced_items).map(([key, val]) => (
                                      <span key={key} className="inline-block bg-green-100 text-green-800 px-1 rounded mr-1 mb-1">{key}: {String(val)}</span>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Manage Prices</h2>
              {userRole === 'admin' ? (
                  <div className="flex gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg">
                      <input type="text" className="w-full p-2 border rounded" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                      <input type="number" className="w-32 p-2 border rounded" placeholder="Price" value={newProduct.price || ''} onChange={e => handleNumChange(setNewProduct, 'price', e.target.value)} />
                      <button onClick={saveProduct} className="bg-slate-900 text-white p-2 rounded px-4 font-bold">Add</button>
                  </div>
              ) : (
                  <div className="p-3 bg-red-50 text-red-500 mb-4 border border-red-200 rounded text-center">Only Admins can change prices</div>
              )}
              
              <table className="w-full text-left bg-white border"><tbody>
                  {products.map(p => (
                      <tr key={p.id} className="border-b">
                          <td className="p-3">{p.name}</td>
                          <td className="p-3">₦{p.price.toLocaleString()}</td>
                          <td className="p-3">
                              {userRole === 'admin' && (
                                <button onClick={() => deleteProduct(p.id)} className="text-red-500"><Trash2 size={18}/></button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody></table>
          </div>
      )}

    </div>
  );
}