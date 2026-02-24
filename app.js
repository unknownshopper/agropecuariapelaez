const storeKey = 'erp_demo_v1';

const authKey = 'erp_auth_v1';

const defaultState = {
  clientes: [
    { id: 'C-001', nombre: 'Rancho La Esperanza', telefono: '555-123-4567', ciudad: 'Guadalajara', status: 'Activo' },
    { id: 'C-002', nombre: 'Agropecuaria El Norte', telefono: '555-987-1122', ciudad: 'Monterrey', status: 'Prospecto' },
  ],
  inventario: [
    { sku: 'SKU-1001', nombre: 'Báscula ganadera 1100', categoria: 'Básculas', stock: 2, precio: 125000 },
    { sku: 'SKU-2001', nombre: 'Corral de manejo', categoria: 'Corrales', stock: 1, precio: 98000 },
    { sku: 'SKU-3001', nombre: 'Baño garrapaticida', categoria: 'Baños', stock: 0, precio: 145000 },
  ],
  envios: [
    { id: 'E-001', clienteId: 'C-001', tipo: 'Local', km: 18, direccion: 'Zona industrial', lat: 20.6736, lng: -103.3440, status: 'Pendiente' },
  ],
};

function loadState() {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      clientes: Array.isArray(parsed.clientes) ? parsed.clientes : [],
      inventario: Array.isArray(parsed.inventario) ? parsed.inventario : [],
      envios: Array.isArray(parsed.envios) ? parsed.envios : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(authKey);
    if (!raw) return { loggedIn: false };
    const parsed = JSON.parse(raw);
    return { loggedIn: Boolean(parsed.loggedIn) };
  } catch {
    return { loggedIn: false };
  }
}

function saveAuth(auth) {
  try {
    localStorage.setItem(authKey, JSON.stringify(auth));
  } catch {}
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0';
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  });
  children.forEach((c) => {
    if (c == null) return;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  });
  return node;
}

const state = loadState();
const auth = loadAuth();

const viewRoot = qs('[data-view]');
const titleEl = qs('[data-title]');
const subtitleEl = qs('[data-subtitle]');
const sidebar = qs('[data-sidebar]');
const menuBtn = qs('[data-menu]');
const resetBtn = qs('[data-reset]');
const authBtn = qs('[data-auth-toggle]');

function closeSidebar() {
  sidebar?.classList.remove('open');
}

menuBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
});

resetBtn?.addEventListener('click', () => {
  localStorage.removeItem(storeKey);
  const fresh = structuredClone(defaultState);
  state.clientes = fresh.clientes;
  state.inventario = fresh.inventario;
  state.envios = fresh.envios;
  saveState(state);
  render();
});

const syncAuthUI = () => {
  if (!authBtn) return;
  authBtn.textContent = auth.loggedIn ? 'Logout' : 'Login';
  authBtn.setAttribute('aria-pressed', auth.loggedIn ? 'true' : 'false');
  authBtn.classList.toggle('btn-primary', auth.loggedIn);
};

authBtn?.addEventListener('click', () => {
  auth.loggedIn = !auth.loggedIn;
  saveAuth(auth);
  syncAuthUI();
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (a) closeSidebar();
});

function setActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-nav') === route);
  });
}

function setPills() {
  const pDash = qs('[data-pill="dashboard"]');
  const pCli = qs('[data-pill="clientes"]');
  const pInv = qs('[data-pill="inventario"]');
  const pEnv = qs('[data-pill="envios"]');
  if (pDash) pDash.textContent = '';
  if (pCli) pCli.textContent = String(state.clientes.length);
  if (pInv) pInv.textContent = String(state.inventario.length);
  if (pEnv) pEnv.textContent = String(state.envios.length);
}

function viewEnvios() {
  titleEl.textContent = 'Envíos';
  subtitleEl.textContent = 'Compras pendientes por enviar (demo)';

  const form = el('form', { class: 'card' });
  const header = el('div', { class: 'card-header' }, [
    el('strong', { text: 'Nuevo envío' }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, ['Guardar']),
  ]);

  const body = el('div', { class: 'card-body' });
  const cliente = el('select', {}, state.clientes.map((c) => el('option', { value: c.id, text: `${c.id} · ${c.nombre}` })));
  const tipo = el('select', {}, [
    el('option', { value: 'Local', text: 'Local' }),
    el('option', { value: 'Foráneo', text: 'Foráneo (rancho)' }),
  ]);
  const km = el('input', { type: 'number', min: '0', step: '1', value: '0' });
  const direccion = el('input', { type: 'text', placeholder: 'Dirección / referencias' });
  const status = el('select', {}, [
    el('option', { value: 'Pendiente', text: 'Pendiente' }),
    el('option', { value: 'En ruta', text: 'En ruta' }),
    el('option', { value: 'Entregado', text: 'Entregado' }),
  ]);

  const lat = el('input', { type: 'text', value: '20.6736', readonly: 'true' });
  const lng = el('input', { type: 'text', value: '-103.3440', readonly: 'true' });
  const map = el('div', { class: 'map', 'data-map': 'true', role: 'application', 'aria-label': 'Selector de mapa (demo)' }, [
    el('div', { class: 'map-hint', text: 'Click para fijar ubicación' }),
    el('div', { class: 'map-pin', 'data-pin': 'true', 'aria-hidden': 'true' }),
  ]);

  const pin = qs('[data-pin]', map);
  const setPin = (x, y) => {
    if (!pin) return;
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
  };

  const mapToCoords = (x, y, w, h) => {
    // Demo mapping: map box -> lat/lng around Guadalajara region.
    const lat0 = 20.10;
    const lat1 = 21.20;
    const lng0 = -104.30;
    const lng1 = -102.60;
    const fx = Math.min(1, Math.max(0, x / w));
    const fy = Math.min(1, Math.max(0, y / h));
    const outLat = (lat1 - (lat1 - lat0) * fy);
    const outLng = (lng0 + (lng1 - lng0) * fx);
    return { outLat, outLng };
  };

  map.addEventListener('click', (e) => {
    const r = map.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setPin(x, y);
    const { outLat, outLng } = mapToCoords(x, y, r.width, r.height);
    lat.value = outLat.toFixed(5);
    lng.value = outLng.toFixed(5);
  });

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Cliente' }), cliente]),
    el('div', { class: 'field' }, [el('label', { text: 'Tipo' }), tipo]),
  ]));

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'KM aprox.' }), km]),
    el('div', { class: 'field' }, [el('label', { text: 'Estatus' }), status]),
  ]));

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Dirección' }), direccion]),
    el('div', { class: 'field' }, [el('label', { text: 'Coordenadas' }), el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', { text: 'Lat' }), lat]),
      el('div', { class: 'field' }, [el('label', { text: 'Lng' }), lng]),
    ])]),
  ]));

  body.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Mapa' }), map]));

  form.appendChild(header);
  form.appendChild(body);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
      id: uid('E'),
      clienteId: cliente.value,
      tipo: tipo.value,
      km: Number(km.value) || 0,
      direccion: direccion.value.trim(),
      lat: Number(lat.value) || 0,
      lng: Number(lng.value) || 0,
      status: status.value,
    };
    state.envios.unshift(item);
    saveState(state);
    render();
  });

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'ID' }),
      el('th', { text: 'Cliente' }),
      el('th', { text: 'Tipo' }),
      el('th', { text: 'KM' }),
      el('th', { text: 'Estatus' }),
      el('th', { text: 'Lat/Lng' }),
      el('th', { text: '' }),
    ]),
  ]));

  const tbody = el('tbody');
  state.envios.forEach((it) => {
    const cli = state.clientes.find((c) => c.id === it.clienteId);
    const del = el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        state.envios = state.envios.filter((x) => x.id !== it.id);
        saveState(state);
        render();
      },
    }, ['Eliminar']);

    tbody.appendChild(el('tr', {}, [
      el('td', { text: it.id }),
      el('td', { text: cli ? cli.nombre : it.clienteId }),
      el('td', {}, [el('span', { class: 'pill', text: it.tipo })]),
      el('td', { text: String(it.km || 0) }),
      el('td', {}, [el('span', { class: 'pill', text: it.status })]),
      el('td', { text: `${Number(it.lat).toFixed(3)}, ${Number(it.lng).toFixed(3)}` }),
      el('td', {}, [del]),
    ]));
  });
  table.appendChild(tbody);

  const listCard = el('div', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('strong', { text: 'Pendientes' }), el('span', { class: 'pill', text: String(state.envios.length) })]),
    el('div', { class: 'card-body' }, [table]),
  ]);

  return el('div', { class: 'grid' }, [form, listCard]);
}

function viewDashboard() {
  titleEl.textContent = 'Dashboard';
  subtitleEl.textContent = 'Resumen de operación (demo)';

  const totalInv = state.inventario.reduce((acc, it) => acc + (Number(it.stock) || 0), 0);
  const totalValor = state.inventario.reduce((acc, it) => acc + (Number(it.stock) || 0) * (Number(it.precio) || 0), 0);
  const agotados = state.inventario.filter((it) => (Number(it.stock) || 0) <= 0).length;

  const kpis = el('div', { class: 'kpis' }, [
    el('div', { class: 'kpi' }, [el('b', { text: String(state.clientes.length) }), el('span', { text: 'Clientes' })]),
    el('div', { class: 'kpi' }, [el('b', { text: String(totalInv) }), el('span', { text: 'Unidades en stock' })]),
    el('div', { class: 'kpi' }, [el('b', { text: String(agotados) }), el('span', { text: 'SKUs agotados' })]),
  ]);

  const card = el('div', { class: 'card' }, [
    el('div', { class: 'card-header' }, [
      el('strong', { text: 'Inventario (valor estimado)' }),
      el('span', { class: 'pill', text: money(totalValor) }),
    ]),
    el('div', { class: 'card-body' }, [
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [
          el('label', { text: 'Atajo' }),
          el('a', { class: 'btn btn-primary', href: '#inventario' }, ['Administrar inventario']),
        ]),
        el('div', { class: 'field' }, [
          el('label', { text: 'Atajo' }),
          el('a', { class: 'btn', href: '#clientes' }, ['Administrar clientes']),
        ]),
      ]),
    ]),
  ]);

  return el('div', {}, [
    el('div', { class: 'grid' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-header' }, [el('strong', { text: 'KPIs' })]),
        el('div', { class: 'card-body' }, [kpis]),
      ]),
      card,
    ]),
  ]);
}

function viewClientes() {
  titleEl.textContent = 'Clientes';
  subtitleEl.textContent = 'Alta, edición y lista (demo)';

  const form = el('form', { class: 'card' });
  const header = el('div', { class: 'card-header' }, [
    el('strong', { text: 'Nuevo cliente' }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, ['Guardar']),
  ]);

  const body = el('div', { class: 'card-body' });
  const nombre = el('input', { type: 'text', required: 'true', placeholder: 'Nombre / Razón social' });
  const telefono = el('input', { type: 'tel', placeholder: 'Teléfono' });
  const ciudad = el('input', { type: 'text', placeholder: 'Ciudad' });
  const status = el('select', {}, [
    el('option', { value: 'Prospecto', text: 'Prospecto' }),
    el('option', { value: 'Activo', text: 'Activo' }),
    el('option', { value: 'Inactivo', text: 'Inactivo' }),
  ]);

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), nombre]),
    el('div', { class: 'field' }, [el('label', { text: 'Estatus' }), status]),
  ]));
  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Teléfono' }), telefono]),
    el('div', { class: 'field' }, [el('label', { text: 'Ciudad' }), ciudad]),
  ]));

  form.appendChild(header);
  form.appendChild(body);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
      id: uid('C'),
      nombre: nombre.value.trim(),
      telefono: telefono.value.trim(),
      ciudad: ciudad.value.trim(),
      status: status.value,
    };
    state.clientes.unshift(item);
    saveState(state);
    render();
  });

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'ID' }),
      el('th', { text: 'Nombre' }),
      el('th', { text: 'Teléfono' }),
      el('th', { text: 'Ciudad' }),
      el('th', { text: 'Estatus' }),
      el('th', { text: '' }),
    ]),
  ]));

  const tbody = el('tbody');
  state.clientes.forEach((c) => {
    const del = el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        state.clientes = state.clientes.filter((x) => x.id !== c.id);
        saveState(state);
        render();
      },
    }, ['Eliminar']);

    tbody.appendChild(el('tr', {}, [
      el('td', { text: c.id }),
      el('td', { text: c.nombre }),
      el('td', { text: c.telefono || '-' }),
      el('td', { text: c.ciudad || '-' }),
      el('td', {}, [el('span', { class: 'pill', text: c.status })]),
      el('td', {}, [del]),
    ]));
  });
  table.appendChild(tbody);

  const listCard = el('div', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('strong', { text: 'Lista' }), el('span', { class: 'pill', text: String(state.clientes.length) })]),
    el('div', { class: 'card-body' }, [table]),
  ]);

  return el('div', { class: 'grid' }, [form, listCard]);
}

function viewInventario() {
  titleEl.textContent = 'Inventario';
  subtitleEl.textContent = 'Productos, stock y precios (demo)';

  const form = el('form', { class: 'card' });
  const header = el('div', { class: 'card-header' }, [
    el('strong', { text: 'Nuevo SKU' }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, ['Guardar']),
  ]);

  const body = el('div', { class: 'card-body' });
  const nombre = el('input', { type: 'text', required: 'true', placeholder: 'Nombre del producto' });
  const sku = el('input', { type: 'text', required: 'true', placeholder: 'SKU' });
  const categoria = el('select', {}, [
    el('option', { value: 'Básculas', text: 'Básculas' }),
    el('option', { value: 'Corrales', text: 'Corrales' }),
    el('option', { value: 'Baños', text: 'Baños' }),
    el('option', { value: 'Remolques', text: 'Remolques' }),
    el('option', { value: 'Prensa', text: 'Prensa' }),
    el('option', { value: 'Galeras', text: 'Galeras' }),
  ]);
  const stock = el('input', { type: 'number', min: '0', step: '1', value: '0' });
  const precio = el('input', { type: 'number', min: '0', step: '1', value: '0' });

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'SKU' }), sku]),
    el('div', { class: 'field' }, [el('label', { text: 'Categoría' }), categoria]),
  ]));
  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), nombre]),
    el('div', { class: 'field' }, [el('label', { text: 'Stock' }), stock]),
  ]));
  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Precio (MXN)' }), precio]),
    el('div', { class: 'field' }, [el('label', { text: ' ' }), el('span', { class: 'pill', text: 'Demo localStorage' })]),
  ]));

  form.appendChild(header);
  form.appendChild(body);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
      sku: sku.value.trim(),
      nombre: nombre.value.trim(),
      categoria: categoria.value,
      stock: Number(stock.value) || 0,
      precio: Number(precio.value) || 0,
    };
    state.inventario.unshift(item);
    saveState(state);
    render();
  });

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'SKU' }),
      el('th', { text: 'Producto' }),
      el('th', { text: 'Categoría' }),
      el('th', { text: 'Stock' }),
      el('th', { text: 'Precio' }),
      el('th', { text: '' }),
    ]),
  ]));

  const tbody = el('tbody');
  state.inventario.forEach((it) => {
    const del = el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        state.inventario = state.inventario.filter((x) => x.sku !== it.sku);
        saveState(state);
        render();
      },
    }, ['Eliminar']);

    tbody.appendChild(el('tr', {}, [
      el('td', { text: it.sku }),
      el('td', { text: it.nombre }),
      el('td', {}, [el('span', { class: 'pill', text: it.categoria })]),
      el('td', { text: String(it.stock) }),
      el('td', { text: money(it.precio) }),
      el('td', {}, [del]),
    ]));
  });
  table.appendChild(tbody);

  const totalSkus = state.inventario.length;
  const totalInv = state.inventario.reduce((acc, it) => acc + (Number(it.stock) || 0), 0);

  const listCard = el('div', { class: 'card' }, [
    el('div', { class: 'card-header' }, [
      el('strong', { text: 'Lista' }),
      el('span', { class: 'pill', text: `${totalSkus} SKUs · ${totalInv} unidades` }),
    ]),
    el('div', { class: 'card-body' }, [table]),
  ]);

  return el('div', { class: 'grid' }, [form, listCard]);
}

const routes = {
  dashboard: viewDashboard,
  clientes: viewClientes,
  inventario: viewInventario,
  envios: viewEnvios,
};

function getRoute() {
  const raw = (location.hash || '').replace('#', '').trim();
  return raw || 'dashboard';
}

function render() {
  const route = getRoute();
  setActiveNav(route);
  setPills();
  syncAuthUI();

  const fn = routes[route] || routes.dashboard;
  viewRoot.replaceChildren(fn());
}

window.addEventListener('hashchange', render);
render();
