'use client'

import { Users, ShieldAlert } from 'lucide-react'

export default function TeamSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Team Settings</h3>
            <p className="text-slate-400 text-xs">Manage team access and member roles</p>
          </div>
        </div>

        <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-white font-medium text-sm">Multi-User Seats Coming Soon</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Invite campaign editors, client administrators, and assistants directly to your team account.
          </p>
        </div>
      </div>
    </div>
  )
}
