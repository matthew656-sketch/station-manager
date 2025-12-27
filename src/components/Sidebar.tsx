import { LayoutDashboard, Droplet, Utensils, CreditCard, Sprout, LogOut, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;           // New: Is menu open?
  onClose: () => void;       // New: Function to close menu
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'fuel', label: 'Fuel & Gas', icon: Droplet },
    { id: 'bakery', label: 'Bakery', icon: Utensils },
    { id: 'pos', label: 'POS Center', icon: CreditCard },
    { id: 'farm', label: 'Farm / Piggery', icon: Sprout },
  ];

  return (
    <>
      {/* Mobile Overlay (Darkens background when menu is open) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold leading-tight">Okeb Nigeria Ltd</h1>
            <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">Station Manager</p>
          </div>
          {/* Close Button (Mobile Only) */}
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose(); // Close menu on mobile when clicked
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}