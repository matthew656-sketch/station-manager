import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { supabase } from './supabaseClient'; // Import Supabase
import { Session } from '@supabase/supabase-js'; // Import Type for TypeScript

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FuelStation from './components/FuelStation';
import Bakery from './components/Bakery';
import POS from './components/POS';
import Farm from './components/Farm';
import Login from './components/Login'; // Import the new Login page

function App() {
  const [session, setSession] = useState<Session | null>(null); // Track User Session
  const [loading, setLoading] = useState(true); // Track loading state
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Check for User on Startup
  useEffect(() => {
    // Add this state
const [userRole, setUserRole] = useState('viewer'); // Default to viewer for safety

// Update the useEffect
useEffect(() => {
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (session?.user?.email) {
      // Check the role from the database
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', session.user.email)
        .single();
      
      if (data) setUserRole(data.role);
    }
    setLoading(false);
  };

  checkUser();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    if (!session) setUserRole('viewer'); // Reset on logout
  });

  return () => subscription.unsubscribe();
}, []);

  // 3. Routing Logic
  const renderContent = () => {
  switch (activeTab) {
    case 'dashboard': return <Dashboard />;
    // Pass the userRole to the components
    case 'fuel': return <FuelStation userRole={userRole} />;
    case 'bakery': return <Bakery userRole={userRole} />;
    case 'pos': return <POS userRole={userRole} />;
    case 'farm': return <Farm userRole={userRole} />;
    default: return <Dashboard />;
  }
};

  // 4. Loading Screen (Brief flash while checking database)
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading Okeb Manager...</div>;
  }

  // 5. IF NOT LOGGED IN -> SHOW LOGIN PAGE
  if (!session) {
    return <Login />;
  }

  // 6. IF LOGGED IN -> SHOW DASHBOARD
  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="font-bold text-lg">Okeb Nigeria Ltd</div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded hover:bg-slate-800">
          <Menu size={24} />
        </button>
      </div>

      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        <main className="flex-1 p-4 md:p-8 md:ml-64 w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;