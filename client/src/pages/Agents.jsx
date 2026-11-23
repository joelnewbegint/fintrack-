import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Briefcase,
  Layers,
  Phone,
  Edit2,
  X,
  Lock,
  Trash2,
} from 'lucide-react';

export const Agents = () => {
  const { user, isOwner } = useAuth();
  const { lang } = useLanguage();

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Agent Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('loan_agent'); // 'loan_agent' | 'emi_agent'
  const [newAreas, setNewAreas] = useState('Gandhipuram, RS Puram');
  const [createLoading, setCreateLoading] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAgentForReset, setSelectedAgentForReset] = useState(null);
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Delete Agent Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgentForDelete, setSelectedAgentForDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.getAgentsList();
      if (res.success) {
        setAgents(res.agents || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleStatus = async (agentId) => {
    try {
      const res = await api.toggleAgentStatus(agentId);
      if (res.success) {
        fetchAgents();
      }
    } catch (e) {
      alert(e.message || 'Error updating agent status');
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const areaList = newAreas.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.createAgent({
        name: newName.trim(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        phone: newPhone.trim(),
        role: newRole,
        assignedAreas: areaList,
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewPhone('');
        fetchAgents();
      }
    } catch (err) {
      alert(err.message || 'Agent creation failed');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedAgentForReset || !resetNewPass) return;

    try {
      setResetLoading(true);
      const res = await api.resetAgentPassword(selectedAgentForReset._id, resetNewPass);
      if (res.success) {
        alert(res.message);
        setShowResetModal(false);
        setResetNewPass('');
        setSelectedAgentForReset(null);
      }
    } catch (err) {
      alert(err.message || 'Password reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  const handleInitiateDelete = (agent) => {
    setSelectedAgentForDelete(agent);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAgentForDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.deleteAgent(selectedAgentForDelete._id);
      if (res.success) {
        setShowDeleteModal(false);
        setSelectedAgentForDelete(null);
        fetchAgents();
      }
    } catch (err) {
      alert(err.message || 'Error deleting agent');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              பணியாளர்கள் & முகவர்கள்
            </span>
            <span className="text-xs text-[#647C95] font-medium">RBAC Security Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight mt-1">
            {lang === 'ta' ? 'முகவர்கள் நிர்வாகம்' : 'Agents & Staff Management'}
          </h1>
          <p className="text-xs text-[#647C95]">
            {lang === 'ta'
              ? 'கடன் முகவர்கள் மற்றும் மாத தவணை முகவர்களை உருவாக்கவும், நிர்வகிக்கவும்'
              : 'Create, assign, deactivate, and manage credentials for Loan Agents and EMI Agents.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95 bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#064B8E] hover:to-[#0878D1]"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Create New Agent / புதிய முகவர்</span>
        </button>
      </div>

      {/* Agents Roster Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading staff records...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="py-16 text-center bg-white/70 rounded-3xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No agents registered yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow"
          >
            Create First Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const isLoanAgent = agent.role === 'loan_agent' || agent.role === 'agent';
            const isEmiAgent = agent.role === 'emi_agent';
            const isActive = agent.status === 'active';

            return (
              <div
                key={agent._id}
                className="rounded-2xl p-5 border transition hover:shadow-md flex flex-col justify-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          isLoanAgent
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isLoanAgent ? <Briefcase className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{agent.name}</h3>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          @{agent.username || agent.email?.split('@')[0]}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {/* Role Badge */}
                  <div className="mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center space-x-1 ${
                        isLoanAgent
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span>Role:</span>
                      <span className="uppercase">{isLoanAgent ? 'Loan Agent (Loans Only)' : 'EMI Agent (EMI Only)'}</span>
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.phone || 'No phone recorded'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Assigned Areas:</span>
                      <span className="font-medium text-slate-800">
                        {(agent.assignedAreas || []).length > 0
                          ? agent.assignedAreas.join(', ')
                          : 'All Municipal Areas'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setSelectedAgentForReset(agent);
                        setShowResetModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-1"
                      title="Reset Password"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reset Pass</span>
                    </button>

                    <button
                      onClick={() => handleInitiateDelete(agent)}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-transparent transition flex items-center space-x-1"
                      title={lang === 'ta' ? 'முகவரை நீக்கு' : 'Delete Agent'}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>{lang === 'ta' ? 'நீக்கு' : 'Delete'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(agent._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                        : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    {isActive ? 'Disable Access' : 'Activate Agent'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-800 text-sm">Create New Agent Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Agent Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. R. Karthik"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="karthik"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="loan_agent">Loan Agent (Loans Only)</option>
                    <option value="emi_agent">EMI Agent (EMI Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Areas (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Gandhipuram, RS Puram"
                  value={newAreas}
                  onChange={(e) => setNewAreas(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow"
                >
                  {createLoading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedAgentForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-black text-slate-800 text-sm">
              Reset Password for {selectedAgentForReset.name}
            </h3>
            <p className="text-xs text-slate-500">
              Username: <span className="font-mono font-bold">@{selectedAgentForReset.username}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 h-10 rounded-xl bg-orange-500 text-xs font-bold text-white shadow"
                >
                  {resetLoading ? 'Resetting...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Agent Confirmation Modal */}
      {showDeleteModal && selectedAgentForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-800 text-base">
                {lang === 'ta' ? 'முகவரை நீக்கவா?' : 'Delete Agent Account?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'ta'
                  ? `${selectedAgentForDelete.name} (@${selectedAgentForDelete.username}) முகவர் கணக்கை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்ற முடியாது.`
                  : `Are you sure you want to permanently delete agent ${selectedAgentForDelete.name} (@${selectedAgentForDelete.username})? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAgentForDelete(null);
                }}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                {lang === 'ta' ? 'ரத்து செய்க' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition flex items-center justify-center space-x-1"
              >
                {deleteLoading ? (
                  <span>{lang === 'ta' ? 'நீக்குகிறது...' : 'Deleting...'}</span>
                ) : (
                  <span>{lang === 'ta' ? 'ஆம், நீக்குக' : 'Yes, Delete'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;

