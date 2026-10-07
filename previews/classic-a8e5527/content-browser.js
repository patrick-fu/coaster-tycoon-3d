
const SVG_ROLLER_COASTER = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M2 20h20v1.5H2z" opacity="0.5"/>
  <path d="M2.5 18C5.5 12 8.5 7 12 7c4 0 5.5 5 7.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M6 14.5l1.2-.6M9 10l1.2-.4M14 9.5l.8.8M17 14l1 .6" stroke="currentColor" stroke-width="1.2"/>
  <path d="M6.5 14v6M12 7v13M17.5 14v6" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
  <path d="M10 4.2c0-.7.6-1.2 1.3-1.2h2.4c.7 0 1.3.5 1.3 1.2v2.1h-5V4.2z"/>
  <circle cx="11" cy="7" r="0.9"/>
  <circle cx="14" cy="7" r="0.9"/>
</svg>`;

const SVG_TRANSPORT = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M2 20h20v1.5H2z" opacity="0.5"/>
  <path d="M4 17h16v-6h-3V7h-6v4H6l-2 2v4z"/>
  <path d="M7 6h3v5H7z"/>
  <path d="M6 5h5v1.5H6z"/>
  <path d="M13.5 6h4v1.5h-4z"/>
  <rect x="14.5" y="8.5" width="2" height="2" fill="#ffeaab"/>
  <circle cx="7" cy="18" r="1.8"/>
  <circle cx="12" cy="18" r="1.8"/>
  <circle cx="17" cy="18" r="1.8"/>
  <path d="M4 17l-2 2h3z"/>
</svg>`;

const SVG_WATER = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M6 9l2-4h8l2 4 1 3H5l1-3z"/>
  <circle cx="10" cy="5.5" r="1.2"/>
  <circle cx="14" cy="5.5" r="1.2"/>
  <path d="M2 18c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0 2-.8 2-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M3 21c1.5-.8 3-.8 4.5 0s3 .8 4.5 0 3-.8 4.5 0 3 .8 4.5 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <circle cx="4" cy="12" r="0.9"/>
  <circle cx="20" cy="12" r="0.9"/>
  <circle cx="3" cy="14" r="0.7"/>
  <circle cx="21" cy="14" r="0.7"/>
</svg>`;

const SVG_GENTLE = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M12 2l8 4.5H4L12 2z"/>
  <path d="M4 6.5h16v1.2c0 .8-.6 1.3-1.3 1.3s-1.3-.5-1.3-1.3c0 .8-.6 1.3-1.3 1.3s-1.3-.5-1.3-1.3c0 .8-.6 1.3-1.3 1.3s-1.3-.5-1.3-1.3c0 .8-.6 1.3-1.3 1.3s-1.3-.5-1.3-1.3c0 .8-.6 1.3-1.3 1.3S5.3 8.5 5.3 7.7H4V6.5z"/>
  <path d="M11.3 9h1.4v11h-1.4z"/>
  <path d="M8 12.5c.8-.5 1.5-1.2 2-2 .5.8 1.5 1.5 2.5 1.2l-.5 2.8 2 1.5-1.5.5-1.5-1.2-.5 2.2h-1.5l.5-2.5-1.5-1-.5 1.5H6.5l.5-2.2 1-.8z"/>
  <path d="M3 20h18v1.5H3z" opacity="0.5"/>
</svg>`;

const SVG_THRILL = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M5 20L12 4l7 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M7.5 15h9" stroke="currentColor" stroke-width="1.3"/>
  <circle cx="12" cy="4" r="2.2" fill="currentColor"/>
  <path d="M12 4l4.5 10.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse cx="17" cy="15" rx="3.5" ry="2" transform="rotate(30 17 15)" fill="currentColor"/>
  <path d="M7 17c2.5 2 7 2 9.5 0" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 2" opacity="0.7"/>
  <path d="M2 20h20v1.5H2z" opacity="0.5"/>
</svg>`;

const SVG_COMMERCIAL = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M3 6l2-2.5h14L21 6H3z"/>
  <path d="M3 6h18v2.5c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1c0 .6-.5 1-1 1s-1-.4-1-1H3V6z"/>
  <path d="M4.5 9.5h15v10.5h-15V9.5z"/>
  <rect x="7" y="11" width="10" height="5.5" fill="#faf6ea"/>
  <path d="M11 13h2l-.3 2.5h-1.4L11 13z" fill="currentColor"/>
  <path d="M12.2 11.5l.8-1.5" stroke="currentColor" stroke-width="0.8"/>
  <path d="M2 20h20v1.5H2z" opacity="0.5"/>
</svg>`;

const SVG_FALLBACK = `
<svg viewBox="0 0 24 24" class="content-library-category-icon" fill="currentColor" aria-hidden="true">
  <path d="M4 2v20h2V14h14l-3-6 3-6H6V2H4z"/>
</svg>`;

const SVG_HEADER_ICON = `
<svg viewBox="0 0 24 24" class="content-library-icon" fill="currentColor" aria-hidden="true">
  <path d="M4 4h14a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2zm0 2v11a1 1 0 0 0 1 1h13V6H4zm3 3h8v1.8H7V9zm0 3.5h8v1.8H7v-1.8zm0 3.5h5v1.8H7V16z"/>
</svg>`;

const SVG_SEARCH = `
<svg viewBox="0 0 24 24" class="content-library-search-icon" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="10.5" cy="10.5" r="6.5"/>
  <line x1="15.5" y1="15.5" x2="20" y2="20"/>
</svg>`;

const REFERENCE_CATEGORIES = [
  { id: 'rollerCoaster', label: 'Roller Coasters', silhouette: SVG_ROLLER_COASTER },
  { id: 'transport', label: 'Transport', silhouette: SVG_TRANSPORT },
  { id: 'water', label: 'Water Rides', silhouette: SVG_WATER },
  { id: 'gentle', label: 'Gentle Rides', silhouette: SVG_GENTLE },
  { id: 'thrill', label: 'Thrill Rides', silhouette: SVG_THRILL },
  { id: 'commercial', label: 'Shops & Stalls', silhouette: SVG_COMMERCIAL }
];

function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector('link[href*="content-browser.css"], style[data-content-browser]');
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./content-browser.css', import.meta.url).href;
    link.setAttribute('data-content-browser', 'true');
    document.head.appendChild(link);
  }
}

export function createContentBrowser({ loadCatalogue, onChoose } = {}) {
  ensureStylesheet();

  let isOpen = false;
  let catalogue = null;
  let isLoading = false;
  let loadError = null;
  let cataloguePromise = null;
  let focusTimer = null;
  let lastRenderedFamily = null;

  let activeCategory = 'rollerCoaster';
  let searchQuery = '';
  let statusFilter = 'all'; // 'all' | 'available' | 'development'
  let selectedFamilyId = null;
  let selectedVariantId = null;
  let selectedModeId = null;

  let openerElement = null;
  let windowPosition = null; // { left, top }
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;

  let windowEl = null;
  let headerEl = null;
  let searchInputEl = null;
  let searchClearBtnEl = null;
  let filterGroupEl = null;
  let categoriesRibbonEl = null;
  let listPaneEl = null;
  let inspectorPaneEl = null;
  let statusBarEl = null;


  function isChoiceImplemented(choice) {
    if (!choice || !choice.capabilities) return false;
    const { construction, operation, presentation } = choice.capabilities;
    if (!choice.modeIds?.length || !construction || !operation || !presentation) return false;
    return construction.kind === 'tracked' && operation.kind === 'circuit' && presentation.kind === 'procedural-coaster' ||
      construction.kind === 'facility' && operation.kind === 'service' && presentation.kind === 'procedural-facility' &&
      ['food','drink','restroom'].includes(construction.service) && operation.service === construction.service && presentation.service === construction.service;
  }

  function getVariantsForFamily(familyId) {
    if (!catalogue || !Array.isArray(catalogue.variants)) return [];
    return catalogue.variants.filter(v =>
      Array.isArray(v.choices) && v.choices.some(c => c.familyId === familyId)
    );
  }

  function getChoiceForFamilyAndVariant(familyId, variantId) {
    if (!catalogue || !Array.isArray(catalogue.variants)) return null;
    const variant = catalogue.variants.find(v => v.id === variantId);
    if (!variant || !Array.isArray(variant.choices)) return null;
    return variant.choices.find(c => c.familyId === familyId) || null;
  }

  function isFamilyAvailable(familyId) {
    const variants = getVariantsForFamily(familyId);
    return variants.some(v => {
      const choice = getChoiceForFamilyAndVariant(familyId, v.id);
      return isChoiceImplemented(choice);
    });
  }

  function isFamilyInDevelopment(familyId) {
    const variants = getVariantsForFamily(familyId);
    return variants.some(v => {
      const choice = getChoiceForFamilyAndVariant(familyId, v.id);
      return !isChoiceImplemented(choice);
    }) || variants.length === 0;
  }

  function familyMatchesStatus(family) {
    if (statusFilter === 'available') {
      return isFamilyAvailable(family.id);
    }
    if (statusFilter === 'development') {
      return isFamilyInDevelopment(family.id);
    }
    return true; // 'all'
  }

  function familyMatchesSearch(family, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    if (family.label && family.label.toLowerCase().includes(q)) {
      return true;
    }
    const variants = getVariantsForFamily(family.id);
    return variants.some(v => v.label && v.label.toLowerCase().includes(q));
  }

  function getAllCategories() {
    const categories = [...REFERENCE_CATEGORIES];
    if (catalogue && Array.isArray(catalogue.families)) {
      const existingIds = new Set(categories.map(c => c.id));
      for (const fam of catalogue.families) {
        if (fam.category && !existingIds.has(fam.category)) {
          existingIds.add(fam.category);
          categories.push({
            id: fam.category,
            label: fam.category.charAt(0).toUpperCase() + fam.category.slice(1),
            silhouette: SVG_FALLBACK
          });
        }
      }
    }
    return categories;
  }

  function getCategoryCount(catId) {
    if (!catalogue || !Array.isArray(catalogue.families)) return 0;
    const query = searchQuery.trim();
    return catalogue.families.filter(f =>
      f.category === catId &&
      familyMatchesStatus(f) &&
      familyMatchesSearch(f, query)
    ).length;
  }

  function getFilteredFamilies() {
    if (!catalogue || !Array.isArray(catalogue.families)) return [];
    const query = searchQuery.trim();
    return catalogue.families.filter(f =>
      f.category === activeCategory &&
      familyMatchesStatus(f) &&
      familyMatchesSearch(f, query)
    );
  }

  function ensureValidSelection() {
    const families = getFilteredFamilies();
    let currentFamily = families.find(f => f.id === selectedFamilyId);

    if (!currentFamily && families.length > 0) {
      selectedFamilyId = families[0].id;
      currentFamily = families[0];
    } else if (families.length === 0) {
      selectedFamilyId = null;
      selectedVariantId = null;
      selectedModeId = null;
      return;
    }

    let variants = getVariantsForFamily(selectedFamilyId);

    if (statusFilter === 'available') {
      const availableVariants = variants.filter(v => {
        const choice = getChoiceForFamilyAndVariant(selectedFamilyId, v.id);
        return isChoiceImplemented(choice);
      });
      if (availableVariants.length > 0) {
        variants = availableVariants;
      }
    } else if (statusFilter === 'development') {
      const devVariants = variants.filter(v => {
        const choice = getChoiceForFamilyAndVariant(selectedFamilyId, v.id);
        return !isChoiceImplemented(choice);
      });
      if (devVariants.length > 0) {
        variants = devVariants;
      }
    }

    let currentVariant = variants.find(v => v.id === selectedVariantId);
    if (!currentVariant && variants.length > 0) {
      selectedVariantId = variants[0].id;
      currentVariant = variants[0];
    } else if (variants.length === 0) {
      selectedVariantId = null;
      selectedModeId = null;
      return;
    }

    const choice = getChoiceForFamilyAndVariant(selectedFamilyId, selectedVariantId);
    if (choice && Array.isArray(choice.modeIds) && choice.modeIds.length > 0) {
      if (!choice.modeIds.includes(selectedModeId)) {
        selectedModeId = choice.modeIds[0];
      }
    } else {
      selectedModeId = null;
    }
  }


  async function fetchCatalogue() {
    if (isLoading && cataloguePromise) {
      return cataloguePromise;
    }
    isLoading = true;
    loadError = null;
    render();

    cataloguePromise = (async () => {
      try {
        if (typeof loadCatalogue !== 'function') {
          throw new Error('The content library is unavailable.');
        }
        const data = await loadCatalogue();
        if (!data || data.contentVersion !== 1 || !Array.isArray(data.families) || !Array.isArray(data.variants) || !Array.isArray(data.modes)) {
          throw new Error('The catalogue uses an unsupported format.');
        }
        catalogue = data;
        isLoading = false;
        loadError = null;
        ensureValidSelection();
        render();
      } catch (err) {
        isLoading = false;
        loadError = err && err.message ? err.message : String(err);
        render();
      } finally {
        cataloguePromise = null;
      }
    })();

    return cataloguePromise;
  }


  function createSafeLink(url, label) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
    const a = document.createElement('a');
    a.className = 'content-library-detail-link';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label || url;
    return a;
  }

  function createDOM() {
    windowEl = document.createElement('div');
    windowEl.id = 'content-library-window';
    windowEl.className = 'content-library-window';
    windowEl.setAttribute('role', 'dialog');
    windowEl.setAttribute('aria-label', 'Content Library');
    windowEl.style.display = 'none';

    // Isolate mouse/pointer/keyboard events so camera doesn't pan or park pause
    const stopPropagation = (e) => e.stopPropagation();
    windowEl.addEventListener('pointerdown', stopPropagation);
    windowEl.addEventListener('mousedown', stopPropagation);
    windowEl.addEventListener('mouseup', stopPropagation);
    windowEl.addEventListener('click', stopPropagation);
    windowEl.addEventListener('dblclick', stopPropagation);
    windowEl.addEventListener('contextmenu', stopPropagation);
    windowEl.addEventListener('wheel', stopPropagation);
    windowEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });
    windowEl.addEventListener('keyup', stopPropagation);

    headerEl = document.createElement('header');
    headerEl.className = 'content-library-header';
    headerEl.addEventListener('pointerdown', onHeaderPointerDown);

    const titlebarEl = document.createElement('div');
    titlebarEl.className = 'content-library-titlebar';
    titlebarEl.innerHTML = SVG_HEADER_ICON;

    const titleTextEl = document.createElement('span');
    titleTextEl.className = 'content-library-title';
    titleTextEl.innerHTML = 'CONTENT <b>LIBRARY</b>';
    titlebarEl.appendChild(titleTextEl);

    const subtitleEl = document.createElement('span');
    subtitleEl.className = 'content-library-subtitle';
    subtitleEl.textContent = 'Rides · Shops · Services';
    titlebarEl.appendChild(subtitleEl);

    const closeBtnEl = document.createElement('button');
    closeBtnEl.className = 'content-library-close-btn';
    closeBtnEl.setAttribute('aria-label', 'Close Content Library (Esc)');
    closeBtnEl.title = 'Close window (Escape)';
    closeBtnEl.textContent = '✕';
    closeBtnEl.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });

    headerEl.appendChild(titlebarEl);
    headerEl.appendChild(closeBtnEl);
    windowEl.appendChild(headerEl);

    const toolbarEl = document.createElement('div');
    toolbarEl.className = 'content-library-toolbar';

    const searchWrapEl = document.createElement('div');
    searchWrapEl.className = 'content-library-search-wrap';
    searchWrapEl.innerHTML = SVG_SEARCH;

    searchInputEl = document.createElement('input');
    searchInputEl.type = 'text';
    searchInputEl.className = 'content-library-search-input';
    searchInputEl.placeholder = 'Search families & objects...';
    searchInputEl.setAttribute('aria-label', 'Search families and objects');
    searchInputEl.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      searchClearBtnEl.style.display = searchQuery ? 'grid' : 'none';
      ensureValidSelection();
      render();
    });

    searchClearBtnEl = document.createElement('button');
    searchClearBtnEl.className = 'content-library-search-clear';
    searchClearBtnEl.setAttribute('aria-label', 'Clear search query');
    searchClearBtnEl.textContent = '✕';
    searchClearBtnEl.style.display = 'none';
    searchClearBtnEl.addEventListener('click', () => {
      searchQuery = '';
      searchInputEl.value = '';
      searchClearBtnEl.style.display = 'none';
      ensureValidSelection();
      render();
      searchInputEl.focus();
    });

    searchWrapEl.appendChild(searchInputEl);
    searchWrapEl.appendChild(searchClearBtnEl);
    toolbarEl.appendChild(searchWrapEl);

    filterGroupEl = document.createElement('div');
    filterGroupEl.className = 'content-library-filter-group';
    filterGroupEl.setAttribute('role', 'group');
    filterGroupEl.setAttribute('aria-label', 'Filter content by readiness');

    const filterDefs = [
      { id: 'all', label: 'All' },
      { id: 'available', label: 'Available now' },
      { id: 'development', label: 'In development' }
    ];

    for (const def of filterDefs) {
      const btn = document.createElement('button');
      btn.className = 'content-library-filter-btn' + (statusFilter === def.id ? ' active' : '');
      btn.dataset.filter = def.id;
      btn.textContent = def.label;
      btn.setAttribute('aria-pressed', statusFilter === def.id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        statusFilter = def.id;
        ensureValidSelection();
        render();
      });
      filterGroupEl.appendChild(btn);
    }
    toolbarEl.appendChild(filterGroupEl);
    windowEl.appendChild(toolbarEl);

    categoriesRibbonEl = document.createElement('nav');
    categoriesRibbonEl.className = 'content-library-categories';
    categoriesRibbonEl.setAttribute('role', 'tablist');
    categoriesRibbonEl.setAttribute('aria-label', 'Ride and facility categories');
    windowEl.appendChild(categoriesRibbonEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'content-library-body';

    listPaneEl = document.createElement('section');
    listPaneEl.className = 'content-library-list-pane';
    listPaneEl.setAttribute('aria-label', 'Matching content families');
    bodyEl.appendChild(listPaneEl);

    inspectorPaneEl = document.createElement('section');
    inspectorPaneEl.className = 'content-library-inspector-pane';
    inspectorPaneEl.setAttribute('aria-label', 'Content specifications and readiness');
    bodyEl.appendChild(inspectorPaneEl);

    windowEl.appendChild(bodyEl);

    statusBarEl = document.createElement('footer');
    statusBarEl.className = 'content-library-status-bar';
    windowEl.appendChild(statusBarEl);

    document.body.appendChild(windowEl);
    bindGlobalListeners();
  }


  function onHeaderPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, a, select')) return;
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = windowEl.getBoundingClientRect();
    dragStartLeft = rect.left;
    dragStartTop = rect.top;

    window.addEventListener('pointermove', onWindowPointerMove, true);
    window.addEventListener('pointerup', onWindowPointerUp, true);
    window.addEventListener('pointercancel', onWindowPointerUp, true);
  }

  function onWindowPointerMove(e) {
    if (!isDragging || !windowEl) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newLeft = dragStartLeft + dx;
    let newTop = dragStartTop + dy;

    const maxLeft = Math.max(0, window.innerWidth - windowEl.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - windowEl.offsetHeight);

    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));

    windowPosition = { left: newLeft, top: newTop };
    windowEl.style.left = `${newLeft}px`;
    windowEl.style.top = `${newTop}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    windowEl.style.transform = 'none';
  }

  function onWindowPointerUp(e) {
    if (!isDragging) return;
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isDragging = false;
    window.removeEventListener('pointermove', onWindowPointerMove, true);
    window.removeEventListener('pointerup', onWindowPointerUp, true);
    window.removeEventListener('pointercancel', onWindowPointerUp, true);
  }

  function positionWindow() {
    if (!windowEl) return;
    const maxLeft = Math.max(0, window.innerWidth - windowEl.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - windowEl.offsetHeight);

    if (windowPosition) {
      const clampedLeft = Math.max(0, Math.min(maxLeft, windowPosition.left));
      const clampedTop = Math.max(0, Math.min(maxTop, windowPosition.top));
      windowPosition = { left: clampedLeft, top: clampedTop };
    } else {
      const initialLeft = Math.max(12, Math.floor((window.innerWidth - windowEl.offsetWidth) / 2));
      const initialTop = Math.max(16, Math.floor((window.innerHeight - windowEl.offsetHeight) / 2));
      windowPosition = { left: initialLeft, top: initialTop };
    }

    windowEl.style.left = `${windowPosition.left}px`;
    windowEl.style.top = `${windowPosition.top}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    windowEl.style.transform = 'none';
  }

  function onWindowResize() {
    if (isOpen && windowEl) {
      positionWindow();
    }
  }

  function onWindowKeyDown(e) {
    if (!isOpen || !windowEl) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  function bindGlobalListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onWindowKeyDown, true);
  }

  function removeGlobalListeners() {
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('keydown', onWindowKeyDown, true);
    window.removeEventListener('pointermove', onWindowPointerMove, true);
    window.removeEventListener('pointerup', onWindowPointerUp, true);
    window.removeEventListener('pointercancel', onWindowPointerUp, true);
  }


  function renderCategories() {
    categoriesRibbonEl.innerHTML = '';
    const categories = getAllCategories();

    for (const cat of categories) {
      const tab = document.createElement('button');
      tab.className = 'content-library-category-tab' + (activeCategory === cat.id ? ' active' : '');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', activeCategory === cat.id ? 'true' : 'false');

      const count = getCategoryCount(cat.id);
      tab.setAttribute('aria-label', `${cat.label} (${count} matching families)`);
      tab.dataset.contentLibraryFocus = `category:${cat.id}`;

      tab.innerHTML = cat.silhouette;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'content-library-category-label';
      labelSpan.textContent = cat.label;
      tab.appendChild(labelSpan);

      const countSpan = document.createElement('span');
      countSpan.className = 'content-library-category-count';
      countSpan.textContent = String(count);
      tab.appendChild(countSpan);

      tab.addEventListener('click', () => {
        activeCategory = cat.id;
        ensureValidSelection();
        render();
      });

      categoriesRibbonEl.appendChild(tab);
    }
  }

  function renderListPane(families) {
    listPaneEl.innerHTML = '';

    const headingEl = document.createElement('div');
    headingEl.className = 'content-library-list-heading';
    headingEl.textContent = 'CATALOGUE FAMILIES ';

    const countMeta = document.createElement('span');
    countMeta.textContent = `(${families.length})`;
    headingEl.appendChild(countMeta);
    listPaneEl.appendChild(headingEl);

    if (families.length === 0) {
      const emptyPanel = document.createElement('div');
      emptyPanel.className = 'content-library-state-panel';

      const emptyTitle = document.createElement('div');
      emptyTitle.className = 'content-library-state-title';
      emptyTitle.textContent = 'No matching content';
      emptyPanel.appendChild(emptyTitle);

      const emptyDesc = document.createElement('div');
      emptyDesc.className = 'content-library-state-desc';
      emptyDesc.textContent = searchQuery
        ? `No families match "${searchQuery}" in this category.`
        : 'No families match the selected status filter in this category.';
      emptyPanel.appendChild(emptyDesc);

      const resetBtn = document.createElement('button');
      resetBtn.className = 'content-library-retry-btn';
      resetBtn.textContent = 'Reset filters';
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        if (searchInputEl) searchInputEl.value = '';
        if (searchClearBtnEl) searchClearBtnEl.style.display = 'none';
        statusFilter = 'all';
        ensureValidSelection();
        render();
      });
      emptyPanel.appendChild(resetBtn);

      listPaneEl.appendChild(emptyPanel);
      return;
    }

    const listEl = document.createElement('div');
    listEl.className = 'content-library-list';
    listEl.setAttribute('role', 'listbox');
    listEl.setAttribute('aria-label', 'Ride and facility families');

    families.forEach((fam, index) => {
      const card = document.createElement('div');
      card.className = 'content-library-card' + (fam.id === selectedFamilyId ? ' selected' : '');
      card.setAttribute('role', 'option');
      card.dataset.contentLibraryFocus = `family:${fam.id}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-selected', fam.id === selectedFamilyId ? 'true' : 'false');

      const cardHeader = document.createElement('div');
      cardHeader.className = 'content-library-card-header';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'content-library-card-title';
      cardTitle.textContent = fam.label;
      cardHeader.appendChild(cardTitle);
      card.appendChild(cardHeader);

      const badgesRow = document.createElement('div');
      badgesRow.className = 'content-library-card-badges';

      const isIndependent = fam.reference === null;
      const srcBadge = document.createElement('span');
      srcBadge.className = 'content-library-badge ' +
        (isIndependent ? 'content-library-badge-independent' : 'content-library-badge-reference');
      srcBadge.textContent = isIndependent ? 'Independent candidate' : 'Original reference';
      badgesRow.appendChild(srcBadge);

      const isAvail = isFamilyAvailable(fam.id);
      const statusBadge = document.createElement('span');
      statusBadge.className = 'content-library-badge ' +
        (isAvail ? 'content-library-badge-available' : 'content-library-badge-pending');
      statusBadge.textContent = isAvail ? 'Available now' : 'In development';
      badgesRow.appendChild(statusBadge);

      card.appendChild(badgesRow);

      const metaRow = document.createElement('div');
      metaRow.className = 'content-library-card-meta';

      const variants = getVariantsForFamily(fam.id);
      const variantText = `${variants.length} variant${variants.length === 1 ? '' : 's'}`;
      const varSpan = document.createElement('span');
      varSpan.textContent = variantText;
      metaRow.appendChild(varSpan);

      card.appendChild(metaRow);

      card.addEventListener('click', () => {
        selectedFamilyId = fam.id;
        ensureValidSelection();
        render();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectedFamilyId = fam.id;
          ensureValidSelection();
          render();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (index < families.length - 1) {
            selectedFamilyId = families[index + 1].id;
            ensureValidSelection();
            render();
            focusItem(`family:${selectedFamilyId}`, true);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (index > 0) {
            selectedFamilyId = families[index - 1].id;
            ensureValidSelection();
            render();
            focusItem(`family:${selectedFamilyId}`, true);
          }
        }
      });

      listEl.appendChild(card);
    });

    listPaneEl.appendChild(listEl);
  }

  function renderInspectorPane(family) {
    inspectorPaneEl.innerHTML = '';

    if (!family) {
      const emptyPanel = document.createElement('div');
      emptyPanel.className = 'content-library-state-panel';

      const title = document.createElement('div');
      title.className = 'content-library-state-title';
      title.textContent = 'No Family Selected';
      emptyPanel.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'content-library-state-desc';
      desc.textContent = 'Choose a content family from the left list to review its variants, subsystem capabilities, and implementation readiness.';
      emptyPanel.appendChild(desc);

      inspectorPaneEl.appendChild(emptyPanel);
      return;
    }

    const container = document.createElement('div');
    container.className = 'content-library-inspector';

    const headerSection = document.createElement('div');
    headerSection.className = 'content-library-detail-header';

    const titleEl = document.createElement('h2');
    titleEl.className = 'content-library-detail-title';
    titleEl.textContent = family.label;
    headerSection.appendChild(titleEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'content-library-detail-meta';

    const categoryDef = getAllCategories().find(c => c.id === family.category);
    const catSpan = document.createElement('span');
    catSpan.textContent = `Category: ${categoryDef ? categoryDef.label : family.category}`;
    metaRow.appendChild(catSpan);

    const isIndependent = family.reference === null;
    const srcBadge = document.createElement('span');
    srcBadge.className = 'content-library-badge ' +
      (isIndependent ? 'content-library-badge-independent' : 'content-library-badge-reference');
    srcBadge.textContent = isIndependent ? 'Independent candidate' : 'Original reference';
    metaRow.appendChild(srcBadge);

    if (family.reference && family.reference.sourceUrl) {
      const link = createSafeLink(family.reference.sourceUrl, 'Reference Specification ↗');
      if (link) metaRow.appendChild(link);
    }

    headerSection.appendChild(metaRow);
    container.appendChild(headerSection);

    const variants = getVariantsForFamily(family.id);
    const variantSection = document.createElement('div');
    variantSection.className = 'content-library-section';

    const variantTitle = document.createElement('div');
    variantTitle.className = 'content-library-section-title';
    variantTitle.textContent = `Vehicle / Object Variants (${variants.length})`;
    variantSection.appendChild(variantTitle);

    const variantGroup = document.createElement('div');
    variantGroup.className = 'content-library-variants-group';

    variants.forEach(v => {
      const choice = getChoiceForFamilyAndVariant(family.id, v.id);
      const isImplemented = isChoiceImplemented(choice);

      const vBtn = document.createElement('button');
      vBtn.className = 'content-library-variant-btn' + (v.id === selectedVariantId ? ' selected' : '');
      vBtn.dataset.contentLibraryFocus = `variant:${v.id}`;
      vBtn.setAttribute('aria-pressed', v.id === selectedVariantId ? 'true' : 'false');

      const labelSpan = document.createElement('span');
      labelSpan.textContent = v.label;
      vBtn.appendChild(labelSpan);

      const badge = document.createElement('span');
      badge.className = 'content-library-badge ' +
        (isImplemented ? 'content-library-badge-available' : 'content-library-badge-pending');
      badge.textContent = isImplemented ? 'Ready' : 'Pending';
      vBtn.appendChild(badge);

      vBtn.addEventListener('click', () => {
        selectedVariantId = v.id;
        ensureValidSelection();
        render();
      });

      variantGroup.appendChild(vBtn);
    });

    variantSection.appendChild(variantGroup);

    const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0];
    if (selectedVariant) {
      const variantMeta = document.createElement('div');
      variantMeta.className = 'content-library-detail-meta';
      variantMeta.style.marginTop = '4px';

      const vSrcBadge = document.createElement('span');
      vSrcBadge.className = 'content-library-badge ' +
        (selectedVariant.reference === null ? 'content-library-badge-independent' : 'content-library-badge-reference');
      vSrcBadge.textContent = selectedVariant.reference === null ? 'Independent variant' : 'Reference variant';
      variantMeta.appendChild(vSrcBadge);

      if (selectedVariant.reference && selectedVariant.reference.sourceUrl) {
        const link = createSafeLink(selectedVariant.reference.sourceUrl, 'Variant Specification ↗');
        if (link) variantMeta.appendChild(link);
      }

      variantSection.appendChild(variantMeta);
    }

    container.appendChild(variantSection);

    const currentChoice = selectedVariant
      ? getChoiceForFamilyAndVariant(family.id, selectedVariant.id)
      : null;

    const modeSection = document.createElement('div');
    modeSection.className = 'content-library-section';

    const modeTitle = document.createElement('div');
    modeTitle.className = 'content-library-section-title';
    modeTitle.textContent = 'Operating Mode';
    modeSection.appendChild(modeTitle);

    if (currentChoice && Array.isArray(currentChoice.modeIds) && currentChoice.modeIds.length > 0) {
      const modeGroup = document.createElement('div');
      modeGroup.className = 'content-library-modes-group';

      currentChoice.modeIds.forEach(mId => {
        const modeDef = (catalogue && Array.isArray(catalogue.modes))
          ? catalogue.modes.find(m => m.id === mId)
          : null;
        const modeLabel = (modeDef && modeDef.label ? modeDef.label : mId).replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
        const modeEvidence = modeDef && modeDef.evidence ? modeDef.evidence : 'project-candidate';

        const mBtn = document.createElement('button');
        mBtn.className = 'content-library-mode-btn' + (mId === selectedModeId ? ' selected' : '');
        mBtn.dataset.contentLibraryFocus = `mode:${mId}`;
        mBtn.setAttribute('aria-pressed', mId === selectedModeId ? 'true' : 'false');

        const mLabelSpan = document.createElement('span');
        mLabelSpan.textContent = modeLabel;
        mBtn.appendChild(mLabelSpan);

        const mEvidenceBadge = document.createElement('span');
        mEvidenceBadge.className = 'content-library-badge ' +
          (modeEvidence === 'project-candidate' ? 'content-library-badge-independent' : 'content-library-badge-reference');
        mEvidenceBadge.textContent = modeEvidence === 'project-candidate' ? 'Candidate' : 'Reconstructed';
        mBtn.appendChild(mEvidenceBadge);

        mBtn.addEventListener('click', () => {
          selectedModeId = mId;
          render();
        });

        modeGroup.appendChild(mBtn);
      });

      modeSection.appendChild(modeGroup);
    } else {
      const noModeText = document.createElement('div');
      noModeText.className = 'content-library-capability-tag';
      noModeText.textContent = 'No operating modes declared for this variant.';
      modeSection.appendChild(noModeText);
    }

    container.appendChild(modeSection);

    const capsSection = document.createElement('div');
    capsSection.className = 'content-library-section';

    const capsTitle = document.createElement('div');
    capsTitle.className = 'content-library-section-title';
    capsTitle.textContent = 'Availability';
    capsSection.appendChild(capsTitle);

    const capsGrid = document.createElement('div');
    capsGrid.className = 'content-library-capabilities-grid';

    const caps = currentChoice ? currentChoice.capabilities : null;
    const construction = caps ? caps.construction : null;
    const operation = caps ? caps.operation : null;
    const presentation = caps ? caps.presentation : null;

    const cCard = document.createElement('div');
    cCard.className = 'content-library-capability-card';

    const cHead = document.createElement('div');
    cHead.className = 'content-library-capability-header';
    cHead.textContent = 'Construction';
    cCard.appendChild(cHead);

    const cKind = document.createElement('div');
    cKind.className = 'content-library-capability-kind';
    const cDot = document.createElement('span');
    const cIsOk = construction && construction.kind && construction.kind !== 'unimplemented';
    cDot.className = 'content-library-dot ' + (cIsOk ? 'content-library-dot-active' : 'content-library-dot-pending');
    cKind.appendChild(cDot);
    const cText = document.createElement('span');
    cText.textContent = cIsOk ? 'Ready' : 'In development';
    cKind.appendChild(cText);
    cCard.appendChild(cKind);

    if (construction && construction.service) {
      const cService = document.createElement('div');
      cService.className = 'content-library-capability-tag';
      cService.textContent = `Service: ${construction.service}`;
      cCard.appendChild(cService);
    }
    capsGrid.appendChild(cCard);

    const oCard = document.createElement('div');
    oCard.className = 'content-library-capability-card';

    const oHead = document.createElement('div');
    oHead.className = 'content-library-capability-header';
    oHead.textContent = 'Operation';
    oCard.appendChild(oHead);

    const oKind = document.createElement('div');
    oKind.className = 'content-library-capability-kind';
    const oDot = document.createElement('span');
    const oIsOk = operation && operation.kind && operation.kind !== 'unimplemented';
    oDot.className = 'content-library-dot ' + (oIsOk ? 'content-library-dot-active' : 'content-library-dot-pending');
    oKind.appendChild(oDot);
    const oText = document.createElement('span');
    oText.textContent = oIsOk ? 'Ready' : 'In development';
    oKind.appendChild(oText);
    oCard.appendChild(oKind);
    capsGrid.appendChild(oCard);

    const pCard = document.createElement('div');
    pCard.className = 'content-library-capability-card';

    const pHead = document.createElement('div');
    pHead.className = 'content-library-capability-header';
    pHead.textContent = 'Appearance';
    pCard.appendChild(pHead);

    const pKind = document.createElement('div');
    pKind.className = 'content-library-capability-kind';
    const pDot = document.createElement('span');
    const pIsOk = presentation && presentation.kind && presentation.kind !== 'unimplemented';
    pDot.className = 'content-library-dot ' + (pIsOk ? 'content-library-dot-active' : 'content-library-dot-pending');
    pKind.appendChild(pDot);
    const pText = document.createElement('span');
    pText.textContent = pIsOk ? 'Ready' : 'In development';
    pKind.appendChild(pText);
    pCard.appendChild(pKind);
    capsGrid.appendChild(pCard);

    capsSection.appendChild(capsGrid);
    container.appendChild(capsSection);

    const isReady = isChoiceImplemented(currentChoice);
    const banner = document.createElement('div');
    banner.className = 'content-library-status-banner ' +
      (isReady ? 'content-library-status-banner-ready' : 'content-library-status-banner-pending');

    const bannerTitle = document.createElement('div');
    bannerTitle.className = 'content-library-status-title';
    bannerTitle.textContent = isReady ? '✓ Available now' : 'In development';
    banner.appendChild(bannerTitle);

    const bannerDesc = document.createElement('div');
    bannerDesc.className = 'content-library-status-desc';

    if (isReady) {
      bannerDesc.textContent = 'Choose this independent candidate to build it in your park.';
    } else {
      bannerDesc.textContent = 'This original reference is planned for a future build. You can inspect its variants and operating modes here.';
    }
    banner.appendChild(bannerDesc);
    container.appendChild(banner);

    const actionBar = document.createElement('div');
    actionBar.className = 'content-library-action-bar';

    const chooseBtn = document.createElement('button');
    if (isReady) {
      chooseBtn.className = 'content-library-choose-btn content-library-choose-btn-ready';
      chooseBtn.textContent = `Select for Construction: ${family.label}`;
      chooseBtn.disabled = false;
      chooseBtn.addEventListener('click', () => {
        if (!selectedFamilyId || !selectedVariantId || !selectedModeId) return;
        if (typeof onChoose === 'function') {
          onChoose({
            familyId: selectedFamilyId,
            variantId: selectedVariantId,
            modeId: selectedModeId
          });
        }
      });
    } else {
      chooseBtn.className = 'content-library-choose-btn content-library-choose-btn-disabled';
      chooseBtn.textContent = 'In development';
      chooseBtn.disabled = true;
      chooseBtn.setAttribute('aria-disabled', 'true');
    }
    actionBar.appendChild(chooseBtn);
    container.appendChild(actionBar);

    inspectorPaneEl.appendChild(container);
  }

  function renderStatusBar(filteredFamilies) {
    statusBarEl.innerHTML = '';

    const leftSpan = document.createElement('span');
    const catDef = getAllCategories().find(c => c.id === activeCategory);
    const catName = catDef ? catDef.label : activeCategory;
    leftSpan.textContent = `${catName} · ${filteredFamilies.length} families shown`;
    statusBarEl.appendChild(leftSpan);

    const rightSpan = document.createElement('span');
    if (catalogue && Array.isArray(catalogue.families)) {
      const totalAvail = catalogue.families.filter(f => isFamilyAvailable(f.id)).length;
      const totalDev = catalogue.families.length - totalAvail;
      rightSpan.innerHTML = `Total: <strong>${catalogue.families.length}</strong> families • <strong>${totalAvail}</strong> ready • <strong>${totalDev}</strong> in development`;
    }
    statusBarEl.appendChild(rightSpan);
  }

  function render() {
    if (!windowEl) return;

    const focusKey = windowEl.contains(document.activeElement) ? document.activeElement.dataset?.contentLibraryFocus : null;
    const listScroll = listPaneEl.querySelector('.content-library-list')?.scrollTop ?? 0;
    const detailScroll = lastRenderedFamily === selectedFamilyId ? inspectorPaneEl.querySelector('.content-library-inspector')?.scrollTop ?? 0 : 0;

    if (filterGroupEl) {
      Array.from(filterGroupEl.children).forEach(btn => {
        const isActive = btn.dataset.filter === statusFilter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    if (isLoading) {
      categoriesRibbonEl.innerHTML = '';
      listPaneEl.innerHTML = `
        <div class="content-library-state-panel">
          <div class="content-library-spinner"></div>
          <div class="content-library-state-title">Loading Catalogue</div>
          <div class="content-library-state-desc">Loading rides, shops and services...</div>
        </div>`;
      inspectorPaneEl.innerHTML = `
        <div class="content-library-state-panel">
          <div class="content-library-state-desc">Preparing the content library...</div>
        </div>`;
      statusBarEl.innerHTML = '<span>Loading content...</span>';
      return;
    }

    if (loadError) {
      categoriesRibbonEl.innerHTML = '';
      listPaneEl.innerHTML = `
        <div class="content-library-state-panel">
          <div class="content-library-state-title" style="color: var(--content-library-danger-red);">Catalogue Unavailable</div>
          <div class="content-library-state-desc">${escapeHtml(loadError)}</div>
          <button class="content-library-retry-btn" id="content-library-retry">Try Again</button>
        </div>`;
      const retryBtn = listPaneEl.querySelector('#content-library-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => fetchCatalogue());
      }
      inspectorPaneEl.innerHTML = '';
      statusBarEl.innerHTML = '<span style="color: var(--content-library-danger-red);">Error loading catalogue</span>';
      return;
    }

    renderCategories();

    const filteredFamilies = getFilteredFamilies();
    renderListPane(filteredFamilies);

    const selectedFamily = (catalogue && Array.isArray(catalogue.families))
      ? catalogue.families.find(f => f.id === selectedFamilyId)
      : null;
    renderInspectorPane(selectedFamily);

    renderStatusBar(filteredFamilies);
    const list = listPaneEl.querySelector('.content-library-list'), details = inspectorPaneEl.querySelector('.content-library-inspector');
    if (list) list.scrollTop = listScroll;
    if (details) details.scrollTop = detailScroll;
    lastRenderedFamily = selectedFamilyId;
    if (focusKey) focusItem(focusKey);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function focusItem(key, reveal = false) {
    const target = Array.from(windowEl.querySelectorAll('[data-content-library-focus]')).find(el => el.dataset.contentLibraryFocus === key);
    if (target) { target.focus({preventScroll:true}); if (reveal) target.scrollIntoView({block:'nearest'}); }
  }

  function focusFirstElement() {
    if (!windowEl) return;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      focusTimer = null;
      if (!isOpen || !windowEl) return;
      if (searchInputEl) {
        searchInputEl.focus();
      } else {
        const firstBtn = windowEl.querySelector('button');
        if (firstBtn) firstBtn.focus();
      }
    }, 0);
  }


  function open(options = {}) {
    const opener = (options && options.opener) || (options instanceof Element ? options : document.activeElement);
    if (opener && typeof opener.focus === 'function') {
      openerElement = opener;
    }

    if (isOpen) {
      if (windowEl) {
        windowEl.style.display = 'flex';
        focusFirstElement();
      }
      return;
    }

    isOpen = true;
    if (!windowEl) {
      createDOM();
    }
    windowEl.style.display = 'flex';
    positionWindow();

    if (!catalogue && !isLoading) {
      fetchCatalogue();
    } else {
      render();
    }

    focusFirstElement();
  }

  function close() {
    clearTimeout(focusTimer);
    focusTimer = null;
    if (!isOpen) return;
    isOpen = false;
    onWindowPointerUp();
    if (windowEl) {
      windowEl.style.display = 'none';
    }

    if (openerElement && typeof openerElement.focus === 'function' && document.contains(openerElement)) {
      try {
        openerElement.focus();
      } catch (_) {}
    }
  }

  function destroy() {
    close();
    removeGlobalListeners();

    if (windowEl && windowEl.parentNode) {
      windowEl.parentNode.removeChild(windowEl);
    }

    windowEl = null;
    headerEl = null;
    searchInputEl = null;
    searchClearBtnEl = null;
    filterGroupEl = null;
    categoriesRibbonEl = null;
    listPaneEl = null;
    inspectorPaneEl = null;
    statusBarEl = null;
    catalogue = null;
    openerElement = null;
    cataloguePromise = null;
  }

  return {
    open,
    close,
    destroy
  };
}

export default createContentBrowser;
