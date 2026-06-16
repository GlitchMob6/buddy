/**
 * ResourceCard — displays a single registered resource.
 *
 * Shows icon (extracted from exe) or letter avatar, name, path,
 * type badge, and delete button on hover.
 */

import { useState, useRef, useEffect } from 'react';
import type { Resource, AppRole } from '../../types';
import { useResources, CATEGORY_ORDER } from '../../hooks/useResources';
import { useCustomCategories } from '../../hooks/useCustomCategories';
import { TerminalSquare, Music, Clock, Folder } from 'lucide-react';
import { useToast } from '../common/ToastProvider';

/** Generate deterministic gradient colors from a string. */
function stringToColor(str: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    from: `hsl(${hue}, 80%, 55%)`,
    to: `hsl(${(hue + 45) % 360}, 80%, 45%)`
  };
}

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export default function ResourceCard({ resource, onDelete, loading }: ResourceCardProps) {
  const { updateCategory, grouped } = useResources();
  const { showToast } = useToast();
  const { customCategories } = useCustomCategories();
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState(resource.category || 'Other');
  const [isUpdating, setIsUpdating] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  const name = resource.display_name || resource.resource_value;
  const firstLetter = name.charAt(0);
  const avatarColor = stringToColor(name);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setIsEditingCategory(false);
      }
    };
    if (isEditingCategory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingCategory]);



  const handleCategoryChange = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed || trimmed === resource.category) {
      setIsEditingCategory(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateCategory({ id: resource.id, category: trimmed });
        showToast('Category updated', 'success');
      setIsEditingCategory(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleDisplay = (role: AppRole) => {
    switch (role) {
      case 'work_tool':
        return { label: 'Work Tool', icon: <TerminalSquare size={14} />, class: 'role-badge-work' };
      case 'background':
        return { label: 'Background', icon: <Music size={14} />, class: 'role-badge-bg' };
      case 'on_demand':
        return { label: 'On-demand', icon: <Clock size={14} />, class: 'role-badge-demand' };
      default:
        return { label: 'Unknown', icon: null, class: 'role-badge-unknown' };
    }
  };

  const roleDisplay = getRoleDisplay(resource.app_role);



  const allKnownCategories = Array.from(new Set([
    ...CATEGORY_ORDER,
    ...customCategories,
    ...Object.keys(grouped)
  ])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="resource-card">
      {/* Avatar / Icon */}
      <div
        className={`resource-avatar ${resource.icon_data ? '' : 'letter-avatar'}`}
        style={resource.icon_data ? {} : { 
          background: `linear-gradient(135deg, ${avatarColor.from}, ${avatarColor.to})`,
          boxShadow: `0 4px 12px ${avatarColor.to}40`
        }}
      >
        {resource.icon_data ? (
          <img
            src={`data:image/png;base64,${resource.icon_data}`}
            alt={name}
            draggable={false}
          />
        ) : (
          firstLetter
        )}
      </div>

      {/* Info */}
      <div className="resource-info">
        <div className="resource-name" title={name}>{name}</div>
      </div>

      {/* Type badge / Role Badge */}
      <div className="role-edit-container" ref={editRef} style={{ display: 'flex', gap: '8px' }}>
        <div
          className={`role-badge ${roleDisplay.class}`}
          title="Role (auto-monitored)"
        >
          {roleDisplay.icon}
          {roleDisplay.label}
        </div>
        
        {isEditingCategory ? (
          <div className="role-edit-popup" style={{ padding: '8px', display: 'flex', gap: '4px', minWidth: '200px' }}>
            <select 
              className="input" 
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCategoryChange();
                }
              }}
              style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }}
              autoFocus
            >
              {allKnownCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleCategoryChange} style={{ padding: '4px 8px' }}>
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewCategory(resource.category || 'Other');
              setIsEditingCategory(true);
            }}
            disabled={isUpdating}
            className={`role-badge role-badge-unknown ${isUpdating ? 'updating' : ''}`}
            title="Click to change category"
          >
            <Folder size={14} />
            {resource.category || 'Other'}
          </button>
        )}
      </div>

      {/* Delete */}
      <button
        className="resource-delete-btn"
        onClick={async (e) => {
          e.stopPropagation();
          await onDelete(resource.id);
          showToast('Resource deleted', 'success');
        }}
        disabled={loading}
        title="Remove resource"
        aria-label={`Delete ${name}`}
      >
        ✕
      </button>
    </div>
  );
}
