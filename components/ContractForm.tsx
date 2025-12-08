import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { Contract } from '../types';
import { CATEGORIES, CURRENCIES } from '../constants';
import { Loader2, Sparkles, Save, X, UploadCloud, FileText } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const ContractForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    status: 'active',
    auto_renewal: 0,
    cost_currency: 'EUR',
    category: 'Other',
    notice_period_days: 30
  });
  
  const [rawText, setRawText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);

  const handleExtract = async () => {
    if (!rawText.trim() && !uploadFile) return;
    
    setIsExtracting(true);
    setError(null);
    setAiSuccess(false);

    try {
      // The service now throws an error if success=false
      const result = await apiService.extractContractData(rawText, uploadFile || undefined);
      
      // If result is the contract object directly (depends on backend wrapper) or inside .data
      // Our backend sends the fields directly on success usually, or we adjust:
      const extractedFields = result; 

      setFormData(prev => ({
        ...prev,
        title: extractedFields.title || prev.title,
        partner_name: extractedFields.partner_name || prev.partner_name,
        start_date: extractedFields.start_date || prev.start_date,
        end_date: extractedFields.end_date || prev.end_date,
        cost_amount: extractedFields.cost_amount || prev.cost_amount,
        cost_currency: extractedFields.cost_currency || prev.cost_currency,
        notice_period_days: extractedFields.notice_period_days || prev.notice_period_days,
        responsible_person: extractedFields.responsible_person || prev.responsible_person,
        category: extractedFields.category || prev.category
      }));
      setAiSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI Extraction failed. Please ensure Ollama is running and try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiService.createContract(formData as Contract);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save contract.");
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

      {/* AI Extraction Section */}
      <div className="mb-8 bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={100} className="text-indigo-600"/>
        </div>
        
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white" size={18} />
          </div>
          <h3 className="font-bold text-indigo-900 text-lg">AI Smart Extract</h3>
        </div>
        
        <p className="text-sm text-indigo-800 mb-4 leading-relaxed relative z-10">
          Upload a contract (PDF/Word) or paste text to automatically extract metadata using local AI.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative z-10">
            <div className="relative">
                 <textarea
                  className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32 bg-white text-sm resize-none"
                  placeholder="Paste contract text here..."
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setUploadFile(null); }}
                />
            </div>
            
            <div className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-white p-4 transition-colors ${uploadFile ? 'border-green-400 bg-green-50' : 'border-indigo-200 hover:bg-indigo-50/50'}`}>
                {uploadFile ? (
                    <div className="text-center">
                        <FileText className="text-green-600 w-10 h-10 mx-auto mb-2" />
                        <span className="text-sm font-bold text-green-700 break-all line-clamp-2">{uploadFile.name}</span>
                        <button onClick={() => setUploadFile(null)} className="text-xs text-red-500 underline mt-2">Remove</button>
                    </div>
                ) : (
                    <>
                        <UploadCloud className="text-indigo-400 mb-2 w-8 h-8" />
                        <label className="cursor-pointer text-center">
                            <span className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Click to Upload</span>
                            <span className="block text-xs text-indigo-400 mt-1">PDF, DOCX, TXT</span>
                            <input 
                                type="file" 
                                accept=".pdf,.docx,.txt"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        setUploadFile(e.target.files[0]);
                                        setRawText('');
                                    }
                                }}
                            />
                        </label>
                    </>
                )}
            </div>
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="text-sm">
              {aiSuccess && <span className="text-green-600 font-bold flex items-center gap-1">✓ Data extracted successfully!</span>}
              {error && <span className="text-red-600 font-bold flex items-center gap-1">⚠ {error}</span>}
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || (!rawText && !uploadFile)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm transform active:scale-95"
          >
            {isExtracting ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isExtracting ? 'Analyzing...' : 'Auto-Fill Form'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className={labelClass}>Contract Title *</label>
            <input required type="text" className={inputClass} value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} />
          </div>
          
          <div>
            <label className={labelClass}>Partner Name *</label>
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
               <input type="number" step="0.01" className={inputClass} placeholder="0.00" value={formData.cost_amount || ''} onChange={e => handleChange('cost_amount', parseFloat(e.target.value))} />
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
            <label className={labelClass}>Email Address (for Alerts)</label>
            <input type="email" className={inputClass} value={formData.responsible_email || ''} onChange={e => handleChange('responsible_email', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium transition">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition transform active:scale-95 disabled:opacity-70">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Contract
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractForm;