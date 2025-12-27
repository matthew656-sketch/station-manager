import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Wallet, AlertCircle, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayExpenses: 0,
    todayProfit: 0,
    totalDebts: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  // Colors for the Pie Chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    calculateDashboard();
  }, []);

  const calculateDashboard = async () => {
    const today = new Date().toLocaleDateString();
    
    // 1. Fetch ALL Data (Last 7 Days + Unpaid Debts)
    // In a real big app, we would filter by date in the SQL query. 
    // For now, we fetch all and filter in Javascript for simplicity.
    const { data: fuel } = await supabase.from('fuel_sales').select('*');
    const { data: bakery } = await supabase.from('bakery_sales').select('*');
    const { data: pos } = await supabase.from('pos_records').select('*');
    const { data: farm } = await supabase.from('farm_records').select('*');
    const { data: debts } = await supabase.from('debts').select('*').eq('status', 'Unpaid');

    // --- A. CALCULATE TODAY'S METRICS ---
    let tSales = 0;
    let tExpenses = 0;
    let tFuel = 0, tBakery = 0, tPOS = 0, tFarm = 0; // For Pie Chart

    // Fuel Logic: Sales = Expected Amount. Expenses = Accounted Expenses (if tracked? Fuel usually just tracks shortage)
    (fuel || []).filter(r => r.date === today).forEach(r => {
        tSales += (r.expected_amount || 0);
        tFuel += (r.expected_amount || 0);
        // Note: Fuel table in our design didn't explicitly have an 'expenses' column for operation costs, 
        // usually it's deducted from cash. If you added expenses column to Fuel, add it here.
    });

    // Bakery Logic
    (bakery || []).filter(r => r.date === today).forEach(r => {
        tSales += (r.total_amount || 0); // This is Net Sales after expenses in our bakery logic
        tExpenses += (r.expenses || 0);
        tBakery += (r.total_amount || 0);
    });

    // Farm Logic
    (farm || []).filter(r => r.date === today).forEach(r => {
        tSales += (r.total_amount || 0);
        tExpenses += (r.expenses || 0);
        tFarm += (r.total_amount || 0);
    });

    // POS Logic: Sales = Actual Profit (Commission)
    (pos || []).filter(r => r.date === today).forEach(r => {
        tSales += (r.actual_profit || 0);
        tPOS += (r.actual_profit || 0);
    });

    // Debts
    const totalUnpaid = (debts || []).reduce((sum, d) => sum + (d.amount || 0), 0);

    setStats({
        todaySales: tSales,
        todayExpenses: tExpenses,
        todayProfit: tSales - tExpenses, // Rough Net Profit
        totalDebts: totalUnpaid
    });

    setPieData([
        { name: 'Fuel', value: tFuel },
        { name: 'Bakery', value: tBakery },
        { name: 'POS', value: tPOS },
        { name: 'Farm', value: tFarm },
    ].filter(x => x.value > 0)); // Only show active depts

    // --- B. CALCULATE LAST 7 DAYS TREND ---
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString();
        
        // Sum up everything for this specific date
        let dayTotal = 0;
        (fuel || []).filter(r => r.date === dateStr).forEach(r => dayTotal += (r.expected_amount || 0));
        (bakery || []).filter(r => r.date === dateStr).forEach(r => dayTotal += (r.total_amount || 0));
        (farm || []).filter(r => r.date === dateStr).forEach(r => dayTotal += (r.total_amount || 0));
        (pos || []).filter(r => r.date === dateStr).forEach(r => dayTotal += (r.actual_profit || 0));

        last7Days.push({
            name: dateStr.slice(0, 5), // Show "12/26" instead of full date
            total: dayTotal
        });
    }
    setChartData(last7Days);
    setLoading(false);
  };

  if (loading) return <div className="p-10">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Business Overview</h1>
        <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1 rounded-full text-sm border">
            <Calendar size={16}/> {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-blue-100 text-sm font-medium">Today's Revenue</p>
                      <h3 className="text-3xl font-bold mt-1">₦{stats.todaySales.toLocaleString()}</h3>
                  </div>
                  <div className="bg-blue-500 p-2 rounded-lg"><TrendingUp size={24}/></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-sm font-medium">Today's Expenses</p>
                      <h3 className="text-3xl font-bold mt-1 text-red-500">₦{stats.todayExpenses.toLocaleString()}</h3>
                  </div>
                  <div className="bg-red-50 p-2 rounded-lg text-red-500"><Wallet size={24}/></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-sm font-medium">Net Profit (Est)</p>
                      <h3 className={`text-3xl font-bold mt-1 ${stats.todayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₦{stats.todayProfit.toLocaleString()}
                      </h3>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-green-500"><DollarSign size={24}/></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-sm font-medium">Outstanding Debts</p>
                      <h3 className="text-3xl font-bold mt-1 text-red-600">₦{stats.totalDebts.toLocaleString()}</h3>
                  </div>
                  <div className="bg-red-100 p-2 rounded-lg text-red-600"><AlertCircle size={24}/></div>
              </div>
          </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BAR CHART: 7 Days Trend */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6">Revenue Trend (Last 7 Days)</h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                          <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* PIE CHART: Department Split */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6">Today's Revenue Source</h3>
              <div className="h-64 w-full flex items-center justify-center">
                  {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                              <Legend />
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="text-slate-400">No sales recorded today</div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
}