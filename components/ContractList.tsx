import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { Contract } from '../types';
import { Eye, Trash2, Search, ArrowUpDown, Filter, Download } from 'lucide-react';

interface Props {
    onSelectContract: (id: number) => void;
}

const ContractList: React.FC<Props> = ({ onSelectContract }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
        loadContracts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortField, sortOrder]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getContracts(search, sortField, sortOrder);
      setContracts(data);
    } catch (e) {
      console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this contract?')) {
      await apiService.deleteContract(id);
      loadContracts();
    }
  };

  const handleSort = (field: string) => {
      if (sortField === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('desc'); // Default to desc for new fields usually better
      }
  };

  const handleExport = async () => {
      try {
          await apiService.downloadExport();
      } catch (e) {
          alert("Export failed");
      }
  };

  const Th = ({ field, label, className = "" }) => (
      <th 
        className={`p-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition ${className}`}
        onClick={() => handleSort(field)}
      >
          <div className="flex items-center gap-1">
              {label}
              <ArrowUpDown size={14} className={sortField === field ? 'text-blue-600' : 'text-slate-300'} />
          </div>
      </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search title, partner, person..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
            <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition border border-slate-200 font-medium text-sm flex-1 sm:flex-initial"
            >
                <Download size={16} /> Export CSV
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[300px]">
        {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <Th field="title" label="Title" />
                <Th field="partner_name" label="Partner" />
                <Th field="end_date" label="End Date" />
                <Th field="cost_amount" label="Cost" />
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(contract => (
                <tr key={contract.id} onClick={() => onSelectContract(contract.id!)} className="hover:bg-slate-50 transition group cursor-pointer">
                  <td className="p-4 font-medium text-slate-900">{contract.title}</td>
                  <td className="p-4 text-slate-600">{contract.partner_name}</td>
                  <td className="p-4 text-slate-600 font-mono text-xs">{contract.end_date}</td>
                  <td className="p-4 text-slate-600 font-mono">{contract.cost_amount ? `${contract.cost_amount} ${contract.cost_currency}` : '-'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border ${
                      contract.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      contract.status === 'expired' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-slate-50 text-slate-700 border-slate-100'
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
              {!loading && contracts.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                           <div className="flex flex-col items-center gap-2">
                               <Filter className="w-8 h-8 opacity-20" />
                               <p>No contracts found matching your criteria.</p>
                           </div>
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