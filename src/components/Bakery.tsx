import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Box, ShoppingCart, Settings, ChefHat, Package, TrendingUp, User } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  userRole: string;
}

export default function Bakery({ userRole }: Props) {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [products, setProducts] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // --- INVENTORY ---
  const [stock, setStock] = useState<Record<string, number>>({});

  // --- SALES ---
  const [salesRecords, setSalesRecords] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [tempItem, setTempItem] = useState({ type: '', price: 0, qtyGiven: 0, qtyReturned: 0 });
  const [expenses, setExpenses] = useState(0);
  const [cashRemitted, setCashRemitted] = useState(0); 

  // --- PRODUCTION ---
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [productionForm, setProductionForm] = useState({ bakerName: '', flourUsed: 0 });
  const [producedCounts, setProducedCounts] = useState<Record<string, number>>({});

  // --- SETTINGS ---
  const [newProduct, setNewProduct] = useState({ name: '', price: 0 });

  const normalizeName = (name: string) => {
      if (!name) return '';
      return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const totalSoldValue = cartItems.reduce((sum, item) => sum + ((item.qtyGiven - item.qtyReturned) * (item.price || 0)), 0);
  const debtIncurred = totalSoldValue - expenses - cashRemitted;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setErrorMsg(null);
    try {
        const { data: prodData } = await supabase.from('bakery_products').select('*').order('name', { ascending: true });
        const safeProducts = (prodData || []).map(p => ({
            ...p, name: normalizeName(p.name), price: p.price || p.Price || 0
        }));
        setProducts(safeProducts);

        if (safeProducts.length > 0 && !tempItem.type) {
            setTempItem(prev => ({ ...prev, type: safeProducts[0].name, price: safeProducts[0].price }));
        }

        const { data: salesData } = await supabase.from('bakery_sales').select('*').order('id', { ascending: false });
        if (salesData) setSalesRecords(salesData);

        const { data: logData } = await supabase.from('bakery_production').select('*').order('id', { ascending: false });
        if (logData) {
            setProductionLogs(logData);
            calculateLiveStock(logData, salesData || []);
        }
    } catch (err: any) { console.error(err); }
  };

  const calculateLiveStock = (production: any[], sales: any[]) => {
      const currentStock: Record<string, number> = {};
      production.forEach(log => {
          if (log.produced_items) {
              Object.entries(log.produced_items).forEach(([bread, qty]) => {
                  const cleanName = normalizeName(bread);
                  currentStock[cleanName] = (currentStock[cleanName] || 0) + Number(qty);
              });
          }
      });
      sales.forEach(sale => {
          if (sale.bread_type && sale.opening_stock) {
              const cleanName = normalizeName(sale.bread_type);
              currentStock[cleanName] = (currentStock[cleanName] || 0) - Number(sale.opening_stock);
          }
      });
      setStock(currentStock);
  };

  const handleNumChange = (setter: any, field: string, val: string) => {
      const num = val === '' ? 0 : parseFloat(val);
      setter((prev: any) => (field ? { ...prev, [field]: num } : num));
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = products.find(p => p.name === e.target.value);
      if (selected) setTempItem({ ...tempItem, type: selected.name, price: selected.price });
  };

  const addToCart = () => {
    if (tempItem.qtyGiven <= 0) return alert("Enter Quantity");
    setCartItems([...cartItems, { ...tempItem }]);
    setTempItem({ ...tempItem, qtyGiven: 0, qtyReturned: 0 }); 
  };

  const removeCartItem = (index: number) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };

  const submitSales = async () => {
    if (!staffName || cartItems.length === 0) return alert("Fill Staff Name and items");

    for (const item of cartItems) {
        const sold = item.qtyGiven - item.qtyReturned;
        await supabase.from('bakery_sales').insert([{
            staff_name: staffName,
            bread_type: normalizeName(item.type),
            opening_stock: item.qtyGiven,
            closing_stock: item.qtyReturned,
            sold_quantity: sold,
            price_per_loaf: item.price,
            total_amount: sold * item.price,
            date: new Date().toLocaleDateString()
        }]);
    }

    if (debtIncurred > 0) {
        await supabase.from('debts').insert([{
            customer_name: staffName,
            amount: debtIncurred,
            status: 'Unpaid',
            notes: 'Bakery Shortage',
            date: new Date().toLocaleDateString()
        }]);
    }

    alert("Sales Saved!");
    setCartItems([]); setStaffName(''); setExpenses(0); setCashRemitted(0);
    fetchData();
  };

  const handleProductionCountChange = (breadName: string, value: string) => {
      const val = value === '' ? 0 : parseFloat(value);
      setProducedCounts(prev => ({ ...prev, [breadName]: val }));
  };

  const submitProduction = async () => {
      if (!productionForm.bakerName) return alert("Enter Baker Name");
      const cleanProducedItems: Record<string, number> = {};
      Object.entries(producedCounts).forEach(([key, val]) => {
          if (val > 0) cleanProducedItems[normalizeName(key)] = val;
      });

      const { error } = await supabase.from('bakery_production').insert([{
          baker_name: productionForm.bakerName,
          flour_used: productionForm.flourUsed,
          produced_items: cleanProducedItems,
          date: new Date().toLocaleDateString()
      }]);

      if (!error) {
          alert("Production Logged!");
          setProductionForm({ bakerName: '', flourUsed: 0 });
          setProducedCounts({});
          fetchData();
      } else {
          alert("Error: " + error.message);
      }
  };

  const saveProduct = async () => {
      if (!newProduct.name) return;
      await supabase.from('bakery_products').insert([{ ...newProduct, name: normalizeName(newProduct.name) }]);
      setNewProduct({ name: '', price: 0 });
      fetchData();
  };

  const deleteProduct = async (id: number) => {
      if(!confirm("Delete this bread type?")) return;
      await supabase.from('bakery_products').delete().eq('id', id);
      fetchData();
  };

  if (errorMsg) return <div className="p-10 text-red-500 font-bold">Error: {errorMsg}</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-300 pb-2 overflow-x-auto">
        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 font-bold flex gap-2 whitespace-nowrap ${activeTab === 'sales' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}><ShoppingCart size={18}/> Sales & Dispatch</button>
        <button onClick={() => setActiveTab('production')} className={`px-4 py-2 font-bold flex gap-2 whitespace-nowrap ${activeTab === 'production' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}><Box size={18}/> Factory</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-bold flex gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-500'}`}><Settings size={18}/> Prices</button>
      </div>

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-slate-800 text-white p-4 rounded-lg flex items-center gap-4 overflow-x-auto">
                <div className="font-bold text-orange-400 whitespace-nowrap flex items-center gap-2"><TrendingUp size={20} /> Stock:</div>
                {Object.entries(stock).map(([bread, qty]) => (
                    <div key={bread} className="bg-slate-700 px-3 py-1 rounded-full text-sm border border-slate-600">
                        {bread}: <span className={qty < 10 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{qty}</span>
                    </div>
                ))}
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700">Select Sales Person</label>
                    <input type="text" className="w-full p-2 border rounded mt-1 bg-slate-50" placeholder="e.g. Chinenye"
                        value={staffName} onChange={e => setStaffName(e.target.value)} />
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                    <h3 className="font-bold text-orange-800 mb-2 text-sm">Add Products to Bag</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-orange-800">Bread Type</label>
                            <select className="w-full p-2 border rounded text-sm" value={tempItem.type} onChange={handleProductSelect}>
                                {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div><label className="text-xs text-orange-800">Price</label><input type="number" className="w-full p-2 border rounded text-sm bg-orange-100" value={tempItem.price} readOnly /></div>
                        <div><label className="text-xs text-orange-800">Given</label><input type="number" className="w-full p-2 border rounded text-sm" placeholder="Qty" value={tempItem.qtyGiven || ''} onChange={e => handleNumChange(setTempItem, 'qtyGiven', e.target.value)} /></div>
                        <div><label className="text-xs text-orange-800">Returned</label><input type="number" className="w-full p-2 border rounded text-sm" placeholder="0" value={tempItem.qtyReturned || ''} onChange={e => handleNumChange(setTempItem, 'qtyReturned', e.target.value)} /></div>
                        <button onClick={addToCart} className="col-span-2 md:col-span-5 bg-orange-600 text-white p-2 rounded hover:bg-orange-700 font-bold mt-2">+ Add to List</button>
                    </div>
                </div>
                <div className="space-y-2 mb-6">
                    {cartItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                            <div className="text-sm"><strong>{item.type}</strong> <span className="text-slate-500 text-xs ml-2">(Given: {item.qtyGiven} | Ret: {item.qtyReturned})</span></div>
                            <div className="flex gap-4 items-center">
                                <span className="font-bold text-green-700">₦{((item.qtyGiven - item.qtyReturned) * item.price).toLocaleString()}</span>
                                <button onClick={() => removeCartItem(index)} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div><label className="text-xs font-bold text-slate-500">Expenses</label><input type="number" className="w-full p-2 border rounded" value={expenses || ''} onChange={e => handleNumChange(setExpenses, '', e.target.value)}/></div>
                    <div><label className="text-xs font-bold text-green-600">Cash Remitted</label><input type="number" className="w-full p-2 border border-green-200 rounded bg-green-50" value={cashRemitted || ''} onChange={e => handleNumChange(setCashRemitted, '', e.target.value)}/></div>
                </div>
                
                {/* SECURE BUTTON */}
                <div className="mt-6">
                    {userRole === 'admin' ? (
                        <button onClick={submitSales} className="w-full bg-slate-900 text-white p-3 rounded font-bold hover:bg-slate-800">Save Sales Record</button>
                    ) : (
                        <div className="p-3 bg-slate-100 text-slate-500 text-center rounded border">🔒 View Only Mode</div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border h-fit">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20}/> {staffName || 'Staff'} Summary</h3>
                <div className="space-y-4">
                    <div className="flex justify-between border-b pb-2"><span>Total Expected</span><span className="font-bold">₦{totalSoldValue.toLocaleString()}</span></div>
                    <div className="flex justify-between text-red-500"><span>- Expenses</span><span>(₦{expenses.toLocaleString()})</span></div>
                    <div className="flex justify-between text-green-600 font-bold text-lg"><span>- Cash Paid</span><span>(₦{cashRemitted.toLocaleString()})</span></div>
                    <div className={`p-3 rounded text-center font-bold text-white ${debtIncurred > 0 ? 'bg-red-500' : 'bg-green-500'}`}>{debtIncurred > 0 ? `DEBT: ₦${debtIncurred.toLocaleString()}` : 'BALANCED'}</div>
                </div>
            </div>
        </div>
      )}

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
                  {/* SECURE BUTTON */}
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