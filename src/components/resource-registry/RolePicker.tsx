import React from 'react';
import { AppRole } from '../../types';
import { TerminalSquare, Music, Clock } from 'lucide-react';

interface RolePickerProps {
  value: AppRole;
  onChange: (role: AppRole) => void;
  compact?: boolean;
}

export function RolePicker({ value, onChange, compact = false }: RolePickerProps) {
  const roles: { id: AppRole; label: string; icon: React.ReactNode; desc: string; }[] = [
    {
      id: 'work_tool',
      label: 'Work Tool',
      icon: <TerminalSquare size={compact ? 14 : 20} />,
      desc: 'Allowed during sessions. Counts as active work.',
    },
    {
      id: 'background',
      label: 'Background',
      icon: <Music size={compact ? 14 : 20} />,
      desc: 'Always allowed silently. Never triggers violations.',
    },
    {
      id: 'on_demand',
      label: 'On-demand',
      icon: <Clock size={compact ? 14 : 20} />,
      desc: 'Allowed briefly. Flags if used for extended periods.',
    },
  ];

  if (compact) {
    return (
      <div className="role-picker-compact">
        {roles.map((r) => {
          const isSelected = value === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              title={r.desc}
              className={`role-btn-compact ${isSelected ? `active-${r.id}` : ''}`}
            >
              {r.icon}
              {r.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="role-picker-full">
      <div className="role-picker-title">How will you use this app?</div>
      <div className="role-picker-full">
        {roles.map((r) => {
          const isSelected = value === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              className={`role-btn-full ${isSelected ? `active-${r.id}` : ''}`}
            >
              <div style={{ marginTop: '2px' }}>{r.icon}</div>
              <div>
                <div className="role-btn-full-label">{r.label}</div>
                <div className="role-btn-full-desc">{r.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
