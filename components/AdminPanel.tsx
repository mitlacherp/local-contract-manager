import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { User } from '../types';
import { Save, UserPlus, Download, Mail, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../constants';

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' });
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        loadUsers();
        loadSettings();
    }, []);

    const loadUsers = async () => {
        try { setUsers(await apiService.getUsers()); } catch(e) {}
    };

    const loadSettings = async () => {
        try { setSettings(await apiService.getSettings()); } catch(e) {}
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        await apiService.createUser(newUser);
        setNewUser({ name: '', email: '', password: '', role: 'employee' });
        loadUsers();
    };

    const handleSaveSetting = async (key: string, value: string) => {
        await apiService.saveSetting(key, value);
        loadSettings();
    };
    
    const handleExport = async () => {
         const contracts = await apiService.getContracts();
         const csvContent = "data:text/csv;charset=utf-8," 
            + "ID,Title,Partner,Start,End,Cost,Status\n"
            + contracts.map(c => `${c.id},"${c.title}","${c.partner_name}",${c.start_date},${c.end_date},${c.cost_amount},${c.status}`).join("\n");
         
         const encodedUri = encodeURI(csvContent);
         const link = document.createElement("a");
         link.setAttribute("href", encodedUri);
         link.setAttribute("download", "contracts_export.csv");
         document.body.appendChild(link);
         link.click();
    };

    const generateInviteLink = (user: User) => {
        const subject = encodeURIComponent("Welcome to Local Contract Manager");
        const body = encodeURIComponent(
`Hello ${user.name},

An account has been created for you in the Local Contract Manager system.

Access URL: ${window.location.origin}
Email: ${user.email}
Temporary Password: (Ask your admin)

Please log in and update your details.

Best regards,
Admin`
        );
        return `mailto:${user.email}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('users')} className={`px-6 py-3 font-medium ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>User Management</button>
                <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-medium ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>System Settings</button>
                <button onClick={() => setActiveTab('exports')} className={`px-6 py-3 font-medium ${activeTab === 'exports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>Data Export</button>
            </div>

            <div className="p-6">
                {activeTab === 'users' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold mb-4 text-slate-800">Existing Users</h3>
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium text-slate-900">{u.name}</td>
                                                <td className="p-3 text-slate-600">{u.email}</td>
                                                <td className="p-3 capitalize text-slate-600">
                                                    <span className={`px-2 py-0.5 rounded text-xs border ${u.role === 'admin' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <a href={generateInviteLink(u)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold border border-blue-200 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition">
                                                        <Mail size={12} /> Send Invite
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><UserPlus size={20} className="text-blue-600" /> Add New Employee</h3>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Full Name" required className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                <input type="email" placeholder="Email Address" required className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                <input type="password" placeholder="Initial Password" required className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                <select className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Administrator</option>
                                </select>
                                <button type="submit" className="md:col-span-2 bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm flex justify-center items-center gap-2 transition">
                                    Create User & Prepare Invite
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">AI Configuration</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Ollama Model Name</label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" defaultValue={settings['ai_model'] || 'llama3'} id="modelInput" />
                                    <button onClick={() => handleSaveSetting('ai_model', (document.getElementById('modelInput') as HTMLInputElement).value)} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 shadow-sm"><Save size={18}/></button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Default: <code className="bg-slate-200 px-1 rounded">llama3</code>. Ensure this model is pulled in Ollama.</p>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Company Details</h3>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" defaultValue={settings['company_name'] || ''} id="companyInput" />
                                    <button onClick={() => handleSaveSetting('company_name', (document.getElementById('companyInput') as HTMLInputElement).value)} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 shadow-sm"><Save size={18}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'exports' && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                         <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Download className="text-blue-600 w-10 h-10" />
                         </div>
                         <h3 className="text-xl font-bold mb-2 text-slate-800">Export Contract Data</h3>
                         <p className="text-slate-500 mb-8 max-w-md mx-auto">Download a complete CSV report of all contracts visible to you, including financial details and status.</p>
                         <button onClick={handleExport} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center gap-2 mx-auto">
                             <Download size={20} /> Download CSV Report
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;