import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity, Terminal, BookOpen, FlaskConical, Menu, X, Cpu, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Analyze', icon: Activity, testId: 'nav-analyze' },
  { path: '/sample-scenarios', label: 'Demo Center', icon: FlaskConical, testId: 'nav-demo' },
  { path: '/incidents', label: 'Knowledge Base', icon: BookOpen, testId: 'nav-knowledge' },
];

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-56 bg-[#1a1c23] border-r border-[#2d313a]
          flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
        data-testid="sidebar"
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[#2d313a] flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cyan-600/20 border border-cyan-500/30">
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 leading-none">Deployment</div>
            <div className="text-xs font-bold text-cyan-400 tracking-widest uppercase">Doctor</div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-100"
            onClick={() => setMobileOpen(false)}
            data-testid="sidebar-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5" data-testid="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon, testId }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                data-testid={testId}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors
                  ${active
                    ? 'bg-cyan-600/15 text-cyan-300 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#23252e]'
                  }
                `}
              >
                <Icon size={14} />
                <span>{label}</span>
                {active && <ChevronRight size={12} className="ml-auto text-cyan-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2d313a]">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Terminal size={10} />
            <span className="font-mono-code">Engine v1.6</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">Rules-based · Deterministic</div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#2d313a] bg-[#1a1c23]">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-slate-100"
            data-testid="mobile-menu-btn"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-slate-100">Deployment Doctor</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0f1117]" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
