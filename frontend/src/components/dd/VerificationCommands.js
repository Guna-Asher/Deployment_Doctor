import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export default function VerificationCommands({ commands = [] }) {
  return (
    <div className="panel" data-testid="verification-commands">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Verification Commands</span>
          <span className="text-[10px] font-mono-code bg-[#0f1117] border border-[#2d313a] text-slate-400 px-2 py-0.5 rounded">
            {commands.length} commands
          </span>
        </div>
      </div>
      <div className="p-3 space-y-2" data-testid="commands-list">
        {commands.map((cmd, i) => (
          <CommandLine key={i} command={cmd} index={i} />
        ))}
      </div>
    </div>
  );
}

function CommandLine({ command, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="group flex items-start gap-2 bg-black/60 border border-[#2d313a] rounded px-3 py-2 hover:border-cyan-500/30 transition-colors"
      data-testid={`command-${index}`}
    >
      <span className="text-cyan-500 font-mono-code text-xs mt-0.5 shrink-0">$</span>
      <span className="flex-1 font-mono-code text-xs text-slate-200 break-all leading-relaxed">
        {command}
      </span>
      <button
        onClick={handleCopy}
        className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
        title="Copy command"
        data-testid={`copy-cmd-${index}`}
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
