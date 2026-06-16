/**
 * ResourceRegistry — main page component for the Resource Registry (Module A2).
 *
 * Top toolbar with add/filter, category-grouped resource list,
 * SmartDiscoveryCard for onboarding, and AppPalette for adding new apps.
 */

import { useState, useEffect } from 'react';
import './ResourceRegistry.css';
import { useResources, CATEGORY_ORDER } from '../../hooks/useResources';
import ResourceCard from './ResourceCard';
import { SmartDiscoveryCard } from './SmartDiscoveryCard';
import { AppPalette } from './AppPalette';
import { ManualAddResourceDialog } from './ManualAddResourceDialog';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { useCustomCategories } from '../../hooks/useCustomCategories';
import { Plus } from 'lucide-react';

export default function ResourceRegistry() {
  const {
    resources,
    grouped,
    loading,
    error,
    remove,
  } = useResources();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Handle Ctrl+K shortcut to open palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const { customCategories } = useCustomCategories();

  const allKnownCategories = Array.from(new Set([
    ...CATEGORY_ORDER,
    ...customCategories,
    ...Object.keys(grouped)
  ])).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  // Get categories that actually have resources or are custom created (plus filter)
  const activeCategories = allKnownCategories.filter(cat => grouped[cat]?.length || customCategories.includes(cat));

  const filteredGrouped = categoryFilter === 'all'
    ? grouped
    : { [categoryFilter]: grouped[categoryFilter] ?? [] };

  // Categories to render in order
  const categoriesToRender = allKnownCategories.filter(cat => filteredGrouped[cat]?.length || (categoryFilter === 'all' && customCategories.includes(cat)));

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Empty state ──────────────────────────────────────────────────
  if (resources.length === 0) {
    return (
      <div className="page-body animate-fade-in">
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', paddingTop: 'var(--space-8)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' }}>
          <SmartDiscoveryCard onOpenPalette={() => setIsPaletteOpen(true)} />
          
          <div className="resource-empty" style={{ marginTop: 'var(--space-8)' }}>
            <div className="resource-empty-icon">⊞</div>
            <div className="resource-empty-title">No resources registered</div>
            <div className="resource-empty-desc">
              Register apps to let Buddy know what tools you use for work.
              Use Ctrl+K or the Add App button to find your installed apps.
            </div>
            <div className="resource-empty-actions">
              <button
                className="btn btn-primary"
                onClick={() => setIsPaletteOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> Add App
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsManualDialogOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> Add Manually
              </button>
            </div>
          </div>
        </div>

        <AppPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
        <ManualAddResourceDialog isOpen={isManualDialogOpen} onClose={() => setIsManualDialogOpen(false)} />
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────
  return (
    <div className="page-body animate-fade-in">
      <div className="resource-registry">

        {/* Error */}
        {error && (
          <div className="resource-error">
            <span>⚠</span> {error}
          </div>
        )}


        {/* Toolbar */}
        <div className="resource-toolbar">
          <div className="resource-toolbar-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsPaletteOpen(true)}
              id="add-resource-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add App <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px', background: 'hsl(0 0% 100% / 0.2)', padding: '2px 4px', borderRadius: '4px' }}>Ctrl+K</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsManualDialogOpen(true)}
              id="add-manual-resource-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Manually
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsManageCategoriesOpen(true)}
              id="manage-categories-btn"
            >
              Manage Categories
            </button>
          </div>

          <div className="resource-toolbar-spacer" />

          {/* Category filter */}
          <select
            className="resource-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            id="category-filter"
          >
            <option value="all">All Categories</option>
            {activeCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({grouped[cat]?.length ?? 0})
              </option>
            ))}
          </select>

          <span className="resource-count">
            {resources.length} app{resources.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Category sections */}
        {categoriesToRender.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
          }}>
            No apps in this category.
          </div>
        ) : (
          categoriesToRender.map(cat => {
            const items = filteredGrouped[cat] ?? [];
            const isCollapsed = collapsedCategories.has(cat);

            return (
              <div key={cat} className="category-section">
                {/* Category header */}
                <button
                  className="category-header"
                  onClick={() => toggleCategory(cat)}
                  aria-expanded={!isCollapsed}
                >
                  <span className={`category-chevron ${isCollapsed ? '' : 'expanded'}`}>
                    ▶
                  </span>
                  <span className="category-name">{cat}</span>
                  <span className="category-badge">{items.length}</span>
                  <span className="category-divider" />
                </button>

                {/* Resource cards grid */}
                {!isCollapsed && (
                  <div className="category-resources">
                    {items.length === 0 ? (
                      <div style={{ padding: '12px 16px', opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem' }}>
                        No applications in this category.
                      </div>
                    ) : (
                      items.map(r => (
                        <ResourceCard
                          key={r.id}
                          resource={r}
                          onDelete={handleDelete}
                          loading={loading}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AppPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <ManualAddResourceDialog isOpen={isManualDialogOpen} onClose={() => setIsManualDialogOpen(false)} />
      <ManageCategoriesDialog isOpen={isManageCategoriesOpen} onClose={() => setIsManageCategoriesOpen(false)} />
    </div>
  );
}
