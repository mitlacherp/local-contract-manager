import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { DashboardStats } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, DollarSign, WifiOff } from 'lucide-react';
import { API_BASE_URL } from '../constants';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error("Failed to load stats", error);
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse flex gap-4"><div className="h-32 w-full bg-gray-200 rounded"></div></div>;

  if (error || !stats) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
      <div className="bg-white p-4 rounded-full shadow-sm">
        <WifiOff className="w-8 h-8 text-red-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-red-900">Backend Connection Failed</h3>
        <p className="text-red-700 mt-2">Could not connect to the server at <code className="bg-red-100 px-2 py-1 rounded text-sm">{API_BASE_URL}</code></p>
        <p className="text-red-600 text-sm mt-1">Please ensure the Node.js backend is running (<code>npm start</code> in backend folder).</p>
      </div>
      <button 
        onClick={() => { setLoading(true); loadStats(); }}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
      >
        Retry Connection
      </button>
    </div>
  );

  const cards = [
    { label: 'Active Contracts', value: stats.activeContracts, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Expiring Soon (<30d)', value: stats.expiringSoon, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Unread Alerts', value: stats.unreadAlerts, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Monthly Cost (Est)', value: `€${stats.monthlyCost.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const chartData = [
    { name: 'Active', value: stats.activeContracts },
    { name: 'Expired/Other', value: stats.totalContracts - stats.activeContracts },
  ];
  const COLORS = ['#10b981', '#cbd5e1'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Contract Status Distribution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h4 className="font-semibold text-indigo-900">AI Analysis Ready</h4>
                    <p className="text-sm text-indigo-700 mt-1">Local Llama3 model is ready to process new documents.</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900">System Status</h4>
                    <p className="text-sm text-gray-600 mt-1">Database: Local SQLite<br/>Backend: Active ({API_BASE_URL})</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;