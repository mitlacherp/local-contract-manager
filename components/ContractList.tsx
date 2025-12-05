import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { Contract } from '../types';
import { Eye, Trash2, Search } from 'lucide-react';

interface Props {
    onSelectContract: (id: number) => void;
}

const ContractList: React.FC<Props> = ({ onSelectContract }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const data = await apiService.getContracts();
      setContracts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this contract?')) {
      await apiService.deleteContract(id);
      loadContracts();
    }
  };

  const filtered = contracts.filter(c => 
    c.title.toLowerCase().includes(filter.toLowerCase()) || 
    c.partner_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Contracts</h2>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search contracts..." 
            className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 whitespace-nowrap">Title</th>
                <th className="p-4 whitespace-nowrap">Partner</th>
                <th className="p-4 whitespace-nowrap">End Date</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(contract => (
                <tr key={contract.id} onClick={() => onSelectContract(contract.id!)} className="hover:bg-slate-50 transition group cursor-pointer">
                  <td className="p-4 font-medium text-slate-900">{contract.title}</td>
                  <td className="p-4 text-slate-600">{contract.partner_name}</td>
                  <td className="p-4 text-slate-600">{contract.end_date}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                      contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      contract.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {contract.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      {contract.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={(e) => handleDelete(e, contract.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Contract">
                      <Trash2 size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View Details">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                           <p>No contracts found.</p>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractList;