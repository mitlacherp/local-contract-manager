import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ContractList from './components/ContractList';
import ContractForm from './components/ContractForm';
import ContractDetails from './components/ContractDetails';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { apiService } from './services/apiService';
import { Alert, User } from './types';
import { Check } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
      // Check local storage for token
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
          setUser(JSON.parse(savedUser));
      }
  }, []);

  useEffect(() => {
    if (user) loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    try {
      const data = await apiService.getAlerts();
      setAlerts(data.filter(a => !a.is_read));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (u: User, token: string) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      setCurrentPage('dashboard');
  };

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
  };

  const handleMarkRead = async (id: number) => {
    await apiService.markAlertRead(id);
    loadAlerts();
  };

  const renderPage = () => {
    if (selectedContractId) {
        return <ContractDetails contractId={selectedContractId} onBack={() => setSelectedContractId(null)} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'contracts':
        return <ContractList onSelectContract={(id) => setSelectedContractId(id)} />;
      case 'new-contract':
        return <ContractForm onSuccess={() => setCurrentPage('contracts')} onCancel={() => setCurrentPage('dashboard')} />;
      case 'admin':
        return <AdminPanel />;
      case 'alerts':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">System Alerts</h2>
            <div className="space-y-4">
              {alerts.length === 0 ? <p className="text-gray-500">No active alerts.</p> : null}
              {alerts.map(alert => (
                <div key={alert.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">{alert.contract_title}</h4>
                    <p className="text-gray-600 mt-1">{alert.message}</p>
                    <span className="text-xs text-gray-400 mt-2 block">{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => handleMarkRead(alert.id)} className="text-gray-400 hover:text-green-600 transition">
                    <Check size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={(p) => { setCurrentPage(p); setSelectedContractId(null); }} user={user} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

export default App;