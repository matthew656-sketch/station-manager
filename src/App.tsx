import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FuelStation from './components/FuelStation';
import Bakery from './components/Bakery';
import POS from './components/POS';
import Farm from './components/Farm';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'fuel': return <FuelStation />;
      case 'bakery': return <Bakery />;
      case 'pos': return <POS />;
      case 'farm': return <Farm />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="font-bold text-lg">Okeb Nigeria Ltd</div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded hover:bg-slate-800">
          <Menu size={24} />
        </button>
      </div>

      <div className="flex">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* Main Content Area */}
        {/* Logic: On mobile (default), margin-left is 0. On Desktop (md), margin-left is 64 (256px) */}
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