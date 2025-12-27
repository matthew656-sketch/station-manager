 import { useState } from 'react';
    import Sidebar from './components/Sidebar';
    import Dashboard from './components/Dashboard';
    import FuelStation from './components/FuelStation';
    import Bakery from './components/Bakery';
    import POS from './components/POS';
    import Farm from './components/Farm';

    function App() {
      const [activeTab, setActiveTab] = useState('dashboard');

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
        <div className="min-h-screen bg-gray-100 flex">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="flex-1 ml-64 p-8">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      );
    }

    export default App;