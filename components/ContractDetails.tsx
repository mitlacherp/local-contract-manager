import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { Contract, Attachment, AuditLog } from '../types';
import { ArrowLeft, Upload, FileText, History, Download, Calendar, DollarSign, User, Mail } from 'lucide-react';
import { API_BASE_URL } from '../constants';

interface Props {
    contractId: number;
    onBack: () => void;
}

const ContractDetails: React.FC<Props> = ({ contractId, onBack }) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        loadData();
    }, [contractId]);

    const loadData = async () => {
        setContract(await apiService.getContract(contractId));
        setAttachments(await apiService.getAttachments(contractId));
        setLogs(await apiService.getAuditLogs(contractId));
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await apiService.uploadAttachment(contractId, e.target.files[0]);
            setAttachments(await apiService.getAttachments(contractId));
        }
    };

    if (!contract) return <div>Loading...</div>;

    const DetailItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Icon size={18} /></div>
            <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{label}</p>
                <p className="text-slate-900 font-medium">{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition mb-4">
                <ArrowLeft size={18} /> Back to List
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{contract.title}</h1>
                        <p className="text-slate-500">{contract.partner_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {contract.status.toUpperCase()}
                    </span>
                </div>

                <div className="flex border-b border-slate-200">
                     {['details', 'attachments', 'history'].map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                             {tab}
                         </button>
                     ))}
                </div>

                <div className="p-6">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <DetailItem icon={Calendar} label="Duration" value={`${contract.start_date} to ${contract.end_date}`} />
                            <DetailItem icon={DollarSign} label="Cost" value={`${contract.cost_amount} ${contract.cost_currency}`} />
                            <DetailItem icon={Calendar} label="Notice Period" value={`${contract.notice_period_days} Days`} />
                            <DetailItem icon={User} label="Responsible" value={contract.responsible_person} />
                            <DetailItem icon={Mail} label="Contact Email" value={contract.responsible_email} />
                            <DetailItem icon={FileText} label="Category" value={contract.category} />
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-700">Attached Documents</h3>
                                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
                                    <Upload size={16} /> Upload File
                                    <input type="file" className="hidden" onChange={handleUpload} />
                                </label>
                            </div>
                            <div className="space-y-2">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-800">{att.original_name}</p>
                                                <p className="text-xs text-slate-500">{new Date(att.uploaded_at).toLocaleString()} - {(att.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <a href={`${API_BASE_URL}/attachments/download/${att.filename}`} target="_blank" className="text-blue-600 hover:text-blue-800 p-2">
                                            <Download size={18} />
                                        </a>
                                    </div>
                                ))}
                                {attachments.length === 0 && <p className="text-slate-400 italic">No documents attached.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                         <div className="space-y-4">
                             <h3 className="font-bold text-slate-700">Audit Log</h3>
                             {logs.map(log => (
                                 <div key={log.id} className="flex gap-4 p-3 border-b border-slate-100 last:border-0">
                                     <div className="bg-slate-100 p-2 rounded-full h-fit"><History size={16} className="text-slate-500" /></div>
                                     <div>
                                         <p className="text-sm font-medium text-slate-800">
                                             <span className="font-bold">{log.user_name}</span> {log.action.toLowerCase()}d this contract
                                         </p>
                                         <p className="text-xs text-slate-500">{log.details}</p>
                                         <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractDetails;