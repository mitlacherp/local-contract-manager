import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { Server, Lock, Mail, Loader2 } from 'lucide-react';

interface Props {
    onLogin: (user: any, token: string) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [forgotMode, setForgotMode] = useState(false);
    const [info, setInfo] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await apiService.login(email, password);
            onLogin(data.user, data.token);
        } catch (err) {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiService.forgotPassword(email);
            setInfo("If the email exists, a reset link was sent (check server logs).");
            setForgotMode(false);
        } catch (err) {
            setError("Request failed");
        } finally {
            setLoading(false);
        }
    };

    // Explicit inline styles to override any browser dark mode settings
    const forcedLightStyle = {
        backgroundColor: '#ffffff',
        color: '#000000',
        borderColor: '#cbd5e1'
    };

    const inputClass = "w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400";

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-slate-200">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-xl shadow-lg mb-4">
                        <Server className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Local Contract Manager</h1>
                    <p className="text-slate-500 mt-1">Secure, Local, AI-Powered</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                {info && <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">{info}</div>}

                {!forgotMode ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400 w-5 h-5 z-10" />
                                <input 
                                    type="email" 
                                    required 
                                    className={inputClass}
                                    style={forcedLightStyle}
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="name@company.com" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400 w-5 h-5 z-10" />
                                <input 
                                    type="password" 
                                    required 
                                    className={inputClass}
                                    style={forcedLightStyle}
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="••••••••" 
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center shadow-md">
                            {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                        </button>
                        <button type="button" onClick={() => setForgotMode(true)} className="w-full text-sm text-slate-500 hover:text-blue-600 mt-2">
                            Forgot Password?
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleForgot} className="space-y-4">
                         <h2 className="text-lg font-bold text-center text-slate-800">Reset Password</h2>
                         <p className="text-sm text-center text-slate-500">Enter your email to receive a reset link.</p>
                         <input 
                            type="email" 
                            placeholder="Email Address" 
                            required 
                            className={inputClass}
                            style={forcedLightStyle}
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                         />
                         <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                            Send Reset Link
                        </button>
                        <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-slate-500">
                            Back to Login
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;