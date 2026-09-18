"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Shield, Check, X, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/gst-utils";

export function UsersClient({ initialMembers }: { initialMembers: any[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>(initialMembers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ACCOUNTANT");
  const [password, setPassword] = useState("User@1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");

      setShowAddModal(false);
      setName("");
      setEmail("");
      router.refresh();
      // refresh list
      const listRes = await fetch("/api/users");
      const listData = await listRes.json();
      if (listData.members) setMembers(listData.members);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Organization Members & Roles</h2>
          <p className="text-xs text-slate-500">Manage accountants and audit viewers with RBAC</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Member
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="px-4 py-3">Member Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Joined Date</th>
              <th className="px-4 py-3">Permissions Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{m.name}</td>
                <td className="px-4 py-3 text-slate-600 font-mono">{m.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.role === "ADMIN" || m.role === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : m.role === "ACCOUNTANT"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(m.joinedAt)}</td>
                <td className="px-4 py-3 text-slate-600 text-[11px]">
                  {m.role === "ADMIN" || m.role === "SUPER_ADMIN"
                    ? "Full Access (Upload, Reconcile, Export, Settings, Users)"
                    : m.role === "ACCOUNTANT"
                    ? "Upload, Run Reconciliation, Export Reports"
                    : "Read-Only (View Dashboard & Reports)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CA Sneha Patel"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sneha@firm.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Role & Permissions
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACCOUNTANT">Accountant (Upload & Reconcile)</option>
                  <option value="ADMIN">Admin (Full Workspace Management)</option>
                  <option value="VIEWER">Viewer (Audit Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
