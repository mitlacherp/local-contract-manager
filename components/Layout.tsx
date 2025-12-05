import React from 'react';
import { LayoutDashboard, FileText, Bell, PlusCircle, Server, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'new-contract', label: 'New Contract', icon: PlusCircle },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  if (user.role === 'admin') {
      navItems.push({ id: 'admin', label: 'Admin Area', icon: Settings });
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-600 flex-shrink-0 hidden md:flex flex-col border-r border-slate-200">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Server className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">LocalCM</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                  active 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-slate-100 p-2 rounded-full">
                    <UserIcon size={16} className="text-slate-600" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 text-slate-500 hover:text-red-600 text-sm font-medium transition"
            >
                <LogOut size={16} /> Logout
            </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <div className="md:hidden fixed top-0 w-full bg-white z-50 p-4 flex justify-between items-center shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-2">
           <div className="bg-blue-600 p-1 rounded">
             <Server className="text-white w-4 h-4" />
           </div>
           <span className="font-bold text-slate-800">LocalCM</span>
        </div>
        <div className="flex gap-4">
           {navItems.map((item) => (
             <button 
               key={item.id} 
               onClick={() => onNavigate(item.id)} 
               className={currentPage === item.id ? 'text-blue-600' : 'text-slate-400'}
             >
               <item.icon size={20} />
             </button>
           ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;