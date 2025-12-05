import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { Contract } from '../types';
import { CATEGORIES, CURRENCIES } from '../constants';
import { Loader2, Sparkles, Save, X, UploadCloud } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const ContractForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    status: 'active',
    auto_renewal: 0,
    cost_currency: 'EUR',
    category: 'Other'
  });
  const [rawText, setRawText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!rawText.trim() && !uploadFile) return;
    setIsExtracting(true);
    setError(null);
    try {
      const extracted = await apiService.extractContractData(rawText, uploadFile || undefined);
      setFormData(prev => ({ ...prev, ...extracted }));
    } catch (err) {
      setError("AI Extraction failed. Ensure Ollama is running.");
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiService.createContract(formData as Contract);
      onSuccess();
    } catch (err) {
      setError("Failed to save contract.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Contract, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-slate-400";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">New Contract</h2>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
          <X size={24} />
        </button>
      </div>

      {/* AI Section */}
      <div className="mb-8 bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-100 p-1.5 rounded-lg">
            <Sparkles className="text-indigo-600" size={20} />
          </div>
          <h3 className="font-bold text-indigo-900 text-lg">AI Quick Fill</h3>
        </div>
        <p className="text-sm text-indigo-800 mb-4 leading-relaxed">
          Upload a document (PDF/Word) OR paste text. Local AI will extract details.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                 <textarea
                  className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 bg-white text-sm"
                  placeholder="Paste text here..."
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setUploadFile(null); }}
                />
            </div>
            <div className="border-2 border-dashed border-indigo-200 rounded-lg flex flex-col items-center justify-center bg-white p-4">
                <UploadCloud className="text-indigo-400 mb-2" />
                <input 
                    type="file" 
                    accept=".pdf,.docx,.txt"
                    className="text-sm text-indigo-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            setUploadFile(e.target.files[0]);
                            setRawText('');
                        }
                    }}
                />
                {uploadFile && <span className="text-xs text-green-600 mt-2 font-bold">{uploadFile.name} selected</span>}
            </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || (!rawText && !uploadFile)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium shadow-sm"
          >
            {isExtracting ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isExtracting ? 'Analyzing...' : 'Extract Data'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className={labelClass}>Contract Title</label>
            <input required type="text" className={inputClass} value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} />
          </div>
          
          <div>
            <label className={labelClass}>Partner Name</label>
            <input required type="text" className={inputClass} value={formData.partner_name || ''} onChange={e => handleChange('partner_name', e.target.value)} />
          </div>
          
          <div>
            <label className={labelClass}>Category</label>
            <select className={inputClass} value={formData.category} onChange={e => handleChange('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={formData.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" className={inputClass} value={formData.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} />
            </div>
          </div>

          <div>
             <label className={labelClass}>Cost & Currency</label>
             <div className="flex gap-2">
               <input type="number" className={inputClass} placeholder="0.00" value={formData.cost_amount || ''} onChange={e => handleChange('cost_amount', parseFloat(e.target.value))} />
               <select className={`${inputClass} w-32`} value={formData.cost_currency} onChange={e => handleChange('cost_currency', e.target.value)}>
                 {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
          </div>

          <div>
            <label className={labelClass}>Notice Period (Days)</label>
            <input type="number" className={inputClass} value={formData.notice_period_days || 0} onChange={e => handleChange('notice_period_days', parseInt(e.target.value))} />
          </div>

          <div>
            <label className={labelClass}>Responsible Person</label>
            <input type="text" className={inputClass} value={formData.responsible_person || ''} onChange={e => handleChange('responsible_person', e.target.value)} />
          </div>

           <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" className={inputClass} value={formData.responsible_email || ''} onChange={e => handleChange('responsible_email', e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium transition">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Contract
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractForm;