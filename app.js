const storeKey = 'erp_demo_v1';

const authKey = 'erp_auth_v1';

const defaultState = {
  clientes: [
    { id: 'C-001', nombre: 'Rancho La Esperanza', telefono: '555-123-4567', ciudad: 'Guadalajara', status: 'Activo' },
    { id: 'C-002', nombre: 'Agropecuaria El Norte', telefono: '555-987-1122', ciudad: 'Monterrey', status: 'Prospecto' },
  ],
  ventas: [],
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

    const ventas = Array.isArray(parsed.ventas)
      ? parsed.ventas
      : Array.isArray(parsed.compras)
        ? parsed.compras
        : [];

    return {
      clientes: Array.isArray(parsed.clientes) ? parsed.clientes : [],
      ventas,
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

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(aa)));
}

async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&countrycodes=mx&accept-language=es&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function nominatimSearchWithCountry(q, countryCodes) {
  const base = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&accept-language=es';
  const cc = countryCodes ? `&countrycodes=${encodeURIComponent(countryCodes)}` : '';
  const url = `${base}${cc}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function nominatimReverse(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  return await res.json();
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
  state.ventas = fresh.ventas;
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
  const pVen = qs('[data-pill="ventas"]');
  const pInv = qs('[data-pill="inventario"]');
  const pEnv = qs('[data-pill="envios"]');
  if (pDash) pDash.textContent = '';
  if (pCli) pCli.textContent = String(state.clientes.length);
  if (pVen) pVen.textContent = String(state.ventas.length);
  if (pInv) pInv.textContent = String(state.inventario.length);
  if (pEnv) pEnv.textContent = String(state.envios.length);
}

function viewVentas() {
  titleEl.textContent = 'Ventas';
  subtitleEl.textContent = 'Captura de orden de venta (demo)';

  const form = el('form', { class: 'card' });
  const header = el('div', { class: 'card-header' }, [
    el('strong', { text: 'Nueva orden' }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, ['Generar OC']),
  ]);

  const body = el('div', { class: 'card-body' });

  const clienteSearch = el('input', { type: 'text', placeholder: 'Buscar cliente por ID o nombre...', autocomplete: 'off' });
  const cliente = el('select', {});

  const compradorNombre = el('input', { type: 'text', placeholder: 'Nombre del comprador / contacto' });
  const compradorEmpresa = el('input', { type: 'text', placeholder: 'Empresa / Rancho' });

  const itemsQtyMap = (items) => {
    const m = new Map();
    (items || []).forEach((it) => {
      const sku = String(it.sku || '').trim();
      if (!sku) return;
      m.set(sku, (m.get(sku) || 0) + (Number(it.cantidad) || 0));
    });
    return m;
  };

  const validateAndApplyInventoryDelta = (oldItems, newItems) => {
    const oldM = itemsQtyMap(oldItems);
    const newM = itemsQtyMap(newItems);
    const skus = new Set([...oldM.keys(), ...newM.keys()]);

    // validate first
    for (const sku of skus) {
      const prev = oldM.get(sku) || 0;
      const next = newM.get(sku) || 0;
      const delta = next - prev;
      if (delta <= 0) continue;
      const inv = state.inventario.find((x) => x.sku === sku);
      const stock = inv ? Number(inv.stock) || 0 : 0;
      if (delta > stock) {
        window.alert(`Sin stock suficiente para ${sku}. Necesitas +${delta}, disponible: ${stock}`);
        return false;
      }
    }

    // apply
    for (const sku of skus) {
      const prev = oldM.get(sku) || 0;
      const next = newM.get(sku) || 0;
      const delta = next - prev;
      if (delta === 0) continue;
      const inv = state.inventario.find((x) => x.sku === sku);
      if (!inv) continue;
      inv.stock = Math.max(0, (Number(inv.stock) || 0) - delta);
    }
    return true;
  };

  const openOrderModal = (order) => {
    const backdrop = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true' });
    const modal = el('div', { class: 'modal' });

    const close = () => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    const cliSel = el('select', {}, state.clientes.map((c) => el('option', { value: c.id, text: `${c.id} · ${c.nombre}` })));
    cliSel.value = order.clienteId;

    const nombreIn = el('input', { type: 'text', value: order.compradorNombre || '', placeholder: 'Nombre del comprador / contacto' });
    const empresaIn = el('input', { type: 'text', value: order.compradorEmpresa || '', placeholder: 'Empresa / Rancho' });

    const reqEnv = el('input', { type: 'checkbox' });
    reqEnv.checked = Boolean(order.requiereEnvio);
    const costoEnv = el('input', { type: 'number', min: '0', step: '1', value: String(Number(order.costoEnvio) || 0) });
    const impPct = el('input', { type: 'number', min: '0', step: '0.1', value: String(Number(order.impuestoPct) || 0) });
    costoEnv.toggleAttribute('disabled', !reqEnv.checked);

    const statusSel = el('select', {}, [
      el('option', { value: 'Generada', text: 'Generada' }),
      el('option', { value: 'Pagada', text: 'Pagada' }),
      el('option', { value: 'Cancelada', text: 'Cancelada' }),
    ]);
    statusSel.value = order.status || 'Generada';

    const subtotalOut = el('input', { type: 'text', readonly: 'true', value: money(order.subtotal || 0) });
    const totalOut = el('input', { type: 'text', readonly: 'true', value: money(order.total || 0) });

    const lines = [];
    const linesWrap = el('div', { class: 'field' }, [el('label', { text: 'Productos' })]);

    const recalc = () => {
      const items = lines
        .map((l) => {
          const sku = l.skuSel.value;
          const it = state.inventario.find((x) => x.sku === sku);
          const q = Math.floor(Number(l.qty.value) || 0);
          if (!it || !sku || q <= 0) return null;
          return { sku: it.sku, nombre: it.nombre, categoria: it.categoria, cantidad: q, precio: Number(it.precio) || 0 };
        })
        .filter(Boolean);

      const subtotal = items.reduce((acc, li) => acc + li.cantidad * (Number(li.precio) || 0), 0);
      const envio = reqEnv.checked ? (Number(costoEnv.value) || 0) : 0;
      const taxPct = Math.max(0, Number(impPct.value) || 0);
      const impuestos = (subtotal + envio) * (taxPct / 100);
      const total = subtotal + envio + impuestos;

      subtotalOut.value = money(subtotal);
      totalOut.value = money(total);

      return { items, subtotal, envio, taxPct, impuestos, total };
    };

    const addLine = (prefill) => {
      const skuSel = el('select', {}, [
        el('option', { value: '', text: 'Selecciona un SKU...' }),
        ...state.inventario.map((it) => el('option', { value: it.sku, text: `${it.sku} · ${it.nombre}` })),
      ]);
      if (prefill?.sku) skuSel.value = prefill.sku;
      const qty = el('input', { type: 'number', min: '1', step: '1', value: String(prefill?.cantidad || 1) });
      const delBtn = el('button', {
        class: 'btn',
        type: 'button',
        onclick: () => {
          const idx = lines.findIndex((x) => x.row === row);
          if (idx >= 0) lines.splice(idx, 1);
          row.remove();
          recalc();
        },
      }, ['Quitar']);

      const row = el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'SKU' }), skuSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Cantidad' }), qty]),
        el('div', { class: 'field' }, [el('label', { text: ' ' }), delBtn]),
      ]);

      const obj = { row, skuSel, qty };
      lines.push(obj);
      skuSel.addEventListener('change', recalc);
      qty.addEventListener('input', recalc);
      linesWrap.appendChild(row);
    };

    const addBtn = el('button', { class: 'btn', type: 'button', onclick: () => addLine() }, ['Agregar producto']);
    linesWrap.appendChild(addBtn);

    (order.items || []).forEach((it) => addLine(it));
    if (!(order.items || []).length) addLine();

    reqEnv.addEventListener('change', () => {
      costoEnv.toggleAttribute('disabled', !reqEnv.checked);
      recalc();
    });
    costoEnv.addEventListener('input', recalc);
    impPct.addEventListener('input', recalc);
    recalc();

    const saveBtn = el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onclick: () => {
        const calc = recalc();
        if (!calc || !calc.items.length) {
          window.alert('Agrega al menos un producto válido.');
          return;
        }

        // Adjust inventory based on delta
        const ok = validateAndApplyInventoryDelta(order.items, calc.items);
        if (!ok) return;

        order.clienteId = cliSel.value;
        order.compradorNombre = nombreIn.value.trim();
        order.compradorEmpresa = empresaIn.value.trim();
        order.requiereEnvio = Boolean(reqEnv.checked);
        order.costoEnvio = calc.envio;
        order.impuestoPct = calc.taxPct;
        order.subtotal = calc.subtotal;
        order.impuestos = calc.impuestos;
        order.total = calc.total;
        order.items = calc.items;
        order.status = statusSel.value;

        saveState(state);
        close();
        render();
      },
    }, ['Guardar cambios']);

    const delBtn = el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        if (!window.confirm(`Eliminar ${order.id}?`)) return;
        // return stock
        validateAndApplyInventoryDelta(order.items, []);
        state.ventas = state.ventas.filter((x) => x.id !== order.id);
        saveState(state);
        close();
        render();
      },
    }, ['Eliminar']);

    const closeBtn = el('button', { class: 'btn', type: 'button', onclick: close }, ['Cerrar']);

    const modalHeader = el('div', { class: 'modal-header' }, [
      el('div', { class: 'modal-title' }, [
        el('b', { text: 'Editar orden' }),
        el('span', { text: `${order.id} · ${new Date(order.fecha).toLocaleString('es-MX')}` }),
      ]),
      el('div', { class: 'modal-actions' }, [delBtn, closeBtn, saveBtn]),
    ]);

    const modalBody = el('div', { class: 'modal-body' }, [
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Cliente' }), cliSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Estatus' }), statusSel]),
      ]),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), nombreIn]),
        el('div', { class: 'field' }, [el('label', { text: 'Empresa / Rancho' }), empresaIn]),
      ]),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [
          el('label', { text: 'Envío' }),
          el('div', { class: 'actions' }, [
            el('label', { style: 'display:flex;align-items:center;gap:10px' }, [reqEnv, document.createTextNode('Requiere envío')]),
          ]),
        ]),
        el('div', { class: 'field' }, [el('label', { text: 'Costo envío (MXN)' }), costoEnv]),
      ]),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Impuesto %' }), impPct]),
        el('div', { class: 'field' }, [el('label', { text: ' ' }), el('span', { class: 'pill', text: 'Edición' })]),
      ]),
      linesWrap,
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Subtotal' }), subtotalOut]),
        el('div', { class: 'field' }, [el('label', { text: 'Total' }), totalOut]),
      ]),
    ]);

    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  };

  const syncBuyerFieldsFromClient = () => {
    const cli = state.clientes.find((c) => c.id === cliente.value);
    if (!cli) return;
    // Defaults (user can override)
    if (!compradorEmpresa.value.trim()) compradorEmpresa.value = cli.nombre || '';
  };

  const rebuildClientOptions = () => {
    const q = clienteSearch.value.trim().toLowerCase();
    const selected = cliente.value || (state.clientes[0]?.id || '');
    const filtered = state.clientes.filter((c) => {
      if (!q) return true;
      const hay = `${c.id} ${c.nombre || ''} ${c.telefono || ''} ${c.ciudad || ''}`.toLowerCase();
      return hay.includes(q);
    });

    cliente.replaceChildren(...filtered.map((c) => el('option', { value: c.id, text: `${c.id} · ${c.nombre}` })));

    // keep selection if still visible
    const still = filtered.some((c) => c.id === selected);
    if (still) cliente.value = selected;
    else if (filtered[0]) cliente.value = filtered[0].id;

    syncBuyerFieldsFromClient();
  };

  clienteSearch.addEventListener('input', rebuildClientOptions);
  cliente.addEventListener('change', () => {
    // Do not overwrite manual edits
    if (!compradorEmpresa.value.trim()) syncBuyerFieldsFromClient();
  });

  rebuildClientOptions();

  const requiereEnvio = el('input', { type: 'checkbox' });
  const costoEnvio = el('input', { type: 'number', min: '0', step: '1', value: '0' });
  const impuestoPct = el('input', { type: 'number', min: '0', step: '0.1', value: '0' });

  const resumen = el('div', { class: 'row' });
  const subtotalEl = el('input', { type: 'text', readonly: 'true', value: money(0) });
  const totalEl = el('input', { type: 'text', readonly: 'true', value: money(0) });

  const linesWrap = el('div', { class: 'field' }, [el('label', { text: 'Productos' })]);
  const lines = [];

  function recalc() {
    let subtotal = 0;
    lines.forEach((l) => {
      const skuV = l.skuSel.value;
      const it = state.inventario.find((x) => x.sku === skuV);
      const q = Number(l.qty.value) || 0;
      const p = it ? Number(it.precio) || 0 : 0;
      if (it && q > 0) subtotal += q * p;
    });

    const envio = Number(costoEnvio.value) || 0;
    const taxPct = Math.max(0, Number(impuestoPct.value) || 0);
    const tax = (subtotal + (requiereEnvio.checked ? envio : 0)) * (taxPct / 100);
    const total = subtotal + (requiereEnvio.checked ? envio : 0) + tax;

    subtotalEl.value = money(subtotal);
    totalEl.value = money(total);
  }

  const addLine = (prefillSku) => {
    const skuSel = el('select', {}, [
      el('option', { value: '', text: 'Selecciona un SKU...' }),
      ...state.inventario.map((it) => el('option', { value: it.sku, text: `${it.sku} · ${it.nombre}` })),
    ]);
    if (prefillSku) skuSel.value = prefillSku;

    const qty = el('input', { type: 'number', min: '1', step: '1', value: '1' });
    const stockTxt = el('span', { class: 'pill', text: 'Stock: -' });
    const priceTxt = el('span', { class: 'pill', text: 'Precio: -' });
    const warn = el('span', { class: 'pill', text: 'OK' });

    const delBtn = el('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        const idx = lines.findIndex((l) => l.row === row);
        if (idx >= 0) lines.splice(idx, 1);
        row.remove();
        recalc();
      },
    }, ['Quitar']);

    const row = el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', { text: 'SKU' }), skuSel]),
      el('div', { class: 'field' }, [el('label', { text: 'Cantidad' }), qty]),
      el('div', { class: 'field' }, [el('label', { text: 'Info' }), el('div', { class: 'actions' }, [stockTxt, priceTxt, warn])]),
      el('div', { class: 'field' }, [el('label', { text: ' ' }), delBtn]),
    ]);

    const lineObj = { row, skuSel, qty, stockTxt, priceTxt, warn };
    lines.push(lineObj);

    const syncInfo = () => {
      const skuV = skuSel.value;
      const it = state.inventario.find((x) => x.sku === skuV);
      const stock = it ? Number(it.stock) || 0 : null;
      const price = it ? Number(it.precio) || 0 : null;
      const q = Number(qty.value) || 0;

      stockTxt.textContent = `Stock: ${stock == null ? '-' : stock}`;
      priceTxt.textContent = `Precio: ${price == null ? '-' : money(price)}`;

      const ok = it && q > 0 && q <= stock;
      warn.textContent = !it ? 'SKU' : ok ? 'OK' : 'Sin stock';
      warn.style.borderColor = !it ? 'rgba(255,255,255,.12)' : ok ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.45)';
      warn.style.color = !it ? '' : ok ? 'rgba(34,197,94,.95)' : 'rgba(239,68,68,.95)';
      recalc();
    };

    skuSel.addEventListener('change', syncInfo);
    qty.addEventListener('input', syncInfo);
    syncInfo();

    linesWrap.appendChild(row);
  };

  const addBtn = el('button', { class: 'btn', type: 'button', onclick: () => addLine() }, ['Agregar producto']);
  linesWrap.appendChild(addBtn);
  addLine();

  requiereEnvio.addEventListener('change', () => {
    costoEnvio.toggleAttribute('disabled', !requiereEnvio.checked);
    recalc();
  });
  costoEnvio.addEventListener('input', recalc);
  impuestoPct.addEventListener('input', recalc);
  costoEnvio.toggleAttribute('disabled', !requiereEnvio.checked);
  recalc();

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [
      el('label', { text: 'Cliente' }),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Buscar' }), clienteSearch]),
        el('div', { class: 'field' }, [el('label', { text: 'Seleccionar' }), cliente]),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { text: 'Envío' }),
      el('div', { class: 'actions' }, [
        el('label', { style: 'display:flex;align-items:center;gap:10px' }, [requiereEnvio, document.createTextNode('Requiere envío')]),
        el('a', { class: 'btn', href: '#envios' }, ['Configurar envío']),
      ]),
    ]),
  ]));

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Nombre' }), compradorNombre]),
    el('div', { class: 'field' }, [el('label', { text: 'Empresa / Rancho' }), compradorEmpresa]),
  ]));

  body.appendChild(linesWrap);

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Costo envío (MXN)' }), costoEnvio]),
    el('div', { class: 'field' }, [el('label', { text: 'Impuesto %' }), impuestoPct]),
  ]));

  resumen.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Subtotal' }), subtotalEl]));
  resumen.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Total' }), totalEl]));
  body.appendChild(resumen);

  form.appendChild(header);
  form.appendChild(body);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selected = lines
      .map((l) => {
        const skuV = l.skuSel.value;
        const it = state.inventario.find((x) => x.sku === skuV);
        const q = Math.floor(Number(l.qty.value) || 0);
        if (!it || !skuV || q <= 0) return null;
        return {
          sku: it.sku,
          nombre: it.nombre,
          categoria: it.categoria,
          cantidad: q,
          precio: Number(it.precio) || 0,
        };
      })
      .filter(Boolean);

    if (!selected.length) {
      window.alert('Agrega al menos un producto válido.');
      return;
    }

    // validate stock
    for (const li of selected) {
      const inv = state.inventario.find((x) => x.sku === li.sku);
      const stock = inv ? Number(inv.stock) || 0 : 0;
      if (li.cantidad > stock) {
        window.alert(`Sin stock suficiente para ${li.sku} (${inv?.nombre || ''}). Disponible: ${stock}`);
        return;
      }
    }

    // deduct stock
    selected.forEach((li) => {
      const inv = state.inventario.find((x) => x.sku === li.sku);
      if (!inv) return;
      inv.stock = Math.max(0, (Number(inv.stock) || 0) - li.cantidad);
    });

    const subtotal = selected.reduce((acc, li) => acc + li.cantidad * (Number(li.precio) || 0), 0);
    const envio = requiereEnvio.checked ? (Number(costoEnvio.value) || 0) : 0;
    const taxPct = Math.max(0, Number(impuestoPct.value) || 0);
    const impuestos = (subtotal + envio) * (taxPct / 100);
    const total = subtotal + envio + impuestos;

    const oc = {
      id: uid('OV'),
      fecha: new Date().toISOString(),
      clienteId: cliente.value,
      compradorNombre: compradorNombre.value.trim(),
      compradorEmpresa: compradorEmpresa.value.trim(),
      requiereEnvio: Boolean(requiereEnvio.checked),
      costoEnvio: envio,
      impuestoPct: taxPct,
      subtotal,
      impuestos,
      total,
      items: selected,
      status: 'Generada',
    };

    state.ventas.unshift(oc);
    saveState(state);
    render();
  });

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'OC' }),
      el('th', { text: 'Cliente' }),
      el('th', { text: 'Items' }),
      el('th', { text: 'Total' }),
      el('th', { text: 'Envío' }),
      el('th', { text: 'Estatus' }),
      el('th', { text: '' }),
    ]),
  ]));

  const tbody = el('tbody');
  state.ventas.forEach((oc) => {
    const cli = state.clientes.find((c) => c.id === oc.clienteId);
    const del = el('button', {
      class: 'btn',
      type: 'button',
      onclick: (e) => {
        // stop row click
        e?.stopPropagation?.();
        state.ventas = state.ventas.filter((x) => x.id !== oc.id);
        saveState(state);
        render();
      },
    }, ['Eliminar']);

    const tr = el('tr', { class: 'row-click' }, [
      el('td', { text: oc.id }),
      el('td', { text: `${oc.clienteId} · ${cli?.nombre || '-'}` }),
      el('td', { text: String((oc.items || []).length) }),
      el('td', { text: money(oc.total) }),
      el('td', {}, [el('span', { class: 'pill', text: oc.requiereEnvio ? 'Sí' : 'No' })]),
      el('td', {}, [el('span', { class: 'pill', text: oc.status || '—' })]),
      el('td', {}, [del]),
    ]);
    tr.addEventListener('click', () => openOrderModal(oc));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const listCard = el('div', { class: 'card' }, [
    el('div', { class: 'card-header' }, [el('strong', { text: 'Órdenes' }), el('span', { class: 'pill', text: String(state.ventas.length) })]),
    el('div', { class: 'card-body' }, [table]),
  ]);

  return el('div', { class: 'grid' }, [form, listCard]);
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
  const direccion = el('input', { type: 'text', placeholder: 'Dirección / referencias', autocomplete: 'off' });
  const costo = el('input', { type: 'text', value: '$0', readonly: 'true' });
  const status = el('select', {}, [
    el('option', { value: 'Pendiente', text: 'Pendiente' }),
    el('option', { value: 'En ruta', text: 'En ruta' }),
    el('option', { value: 'Entregado', text: 'Entregado' }),
  ]);

  const addrWrap = el('div', { class: 'addr-search' });
  const addrResults = el('div', { class: 'addr-results', 'data-addr-results': 'true' });
  addrWrap.appendChild(direccion);
  addrWrap.appendChild(addrResults);

  const mapEl = el('div', { class: 'map', id: 'envios-map', role: 'application', 'aria-label': 'Mapa' });

  // ephemeral selection while creating the shipment
  let selectedLat = null;
  let selectedLng = null;

  // Default view: Tabasco (Villahermosa)
  const tabascoCenter = { lat: 17.9892, lng: -92.9475 };
  // Origin point (almacén/salida). Ajustable.
  const origin = { lat: 17.9892, lng: -92.9475 };
  // Simple pricing model (demo)
  const pricing = { base: 250, perKm: 12 };

  const updateDistanceAndCost = () => {
    if (!Number.isFinite(selectedLat) || !Number.isFinite(selectedLng)) return;
    const d = haversineKm(origin.lat, origin.lng, selectedLat, selectedLng);
    const dRound = Math.round(d);
    km.value = String(dRound);
    const total = Math.round(pricing.base + d * pricing.perKm);
    costo.value = money(total);
  };

  const setAddressFromReverse = async (latV, lngV) => {
    selectedLat = latV;
    selectedLng = lngV;
    updateDistanceAndCost();
    try {
      const data = await nominatimReverse(latV, lngV);
      if (!data) return;
      if (data.display_name) direccion.value = data.display_name;
    } catch {}
  };

  // Address search suggestions
  const intlKey = 'erp_envios_internacional_v1';
  let allowInternational = false;
  try {
    allowInternational = localStorage.getItem(intlKey) === '1';
  } catch {}

  let searchTimer = 0;
  const closeResults = () => {
    addrResults.classList.remove('open');
    addrResults.replaceChildren();
  };

  const openResults = (items, onPick) => {
    addrResults.replaceChildren();
    items.forEach((it) => {
      addrResults.appendChild(el('button', {
        class: 'addr-item',
        type: 'button',
        onclick: () => onPick(it),
      }, [it.display_name || 'Resultado']));
    });
    addrResults.classList.toggle('open', items.length > 0);
  };

  direccion.addEventListener('input', () => {
    const q = direccion.value.trim();
    if (searchTimer) window.clearTimeout(searchTimer);
    if (q.length < 4) {
      closeResults();
      return;
    }
    searchTimer = window.setTimeout(async () => {
      try {
        const items = await nominatimSearchWithCountry(q, allowInternational ? null : 'mx');
        openResults(items, (it) => {
          closeResults();
          if (it.display_name) direccion.value = it.display_name;
          const latV = Number(it.lat);
          const lngV = Number(it.lon);
          if (Number.isFinite(latV) && Number.isFinite(lngV)) {
            selectedLat = latV;
            selectedLng = lngV;
            updateDistanceAndCost();
            window.__enviosMap?.setView([latV, lngV], 16);
            window.__enviosMarker?.setLatLng([latV, lngV]);
          }
        });
      } catch {
        closeResults();
      }
    }, 220);
  });

  document.addEventListener('click', (e) => {
    if (e.target === direccion || addrWrap.contains(e.target)) return;
    closeResults();
  });

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Cliente' }), cliente]),
    el('div', { class: 'field' }, [el('label', { text: 'Tipo' }), tipo]),
  ]));

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'KM aprox.' }), km]),
    el('div', { class: 'field' }, [el('label', { text: 'Estatus' }), status]),
  ]));

  const copyBtn = el('button', {
    class: 'btn',
    type: 'button',
    onclick: async () => {
      const link = (Number.isFinite(selectedLat) && Number.isFinite(selectedLng))
        ? `https://www.google.com/maps?q=${selectedLat},${selectedLng}`
        : (direccion.value.trim() || '');

      try {
        await navigator.clipboard.writeText(link);
        copyBtn.textContent = 'Copiado';
        window.setTimeout(() => { copyBtn.textContent = 'Copiar ubicación'; }, 900);
      } catch {
        // fallback
        window.prompt('Copia la ubicación:', link);
      }
    },
  }, ['Copiar ubicación']);

  const intlBtn = el('button', {
    class: 'pill',
    type: 'button',
    onclick: () => {
      allowInternational = !allowInternational;
      intlBtn.textContent = allowInternational ? 'Internacional' : 'Solo MX';
      try {
        localStorage.setItem(intlKey, allowInternational ? '1' : '0');
      } catch {}
      closeResults();
    },
  }, [allowInternational ? 'Internacional' : 'Solo MX']);

  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field' }, [el('label', { text: 'Dirección' }), addrWrap]),
    el('div', { class: 'field' }, [
      el('label', { text: 'Acciones' }),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', { text: ' ' }), el('div', { class: 'actions' }, [intlBtn, copyBtn])]),
        el('div', { class: 'field' }, [el('label', { text: 'Costo' }), costo]),
      ]),
    ]),
  ]));

  body.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Mapa' }), mapEl]));

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
      lat: Number.isFinite(selectedLat) ? selectedLat : null,
      lng: Number.isFinite(selectedLng) ? selectedLng : null,
      costo: Number(String(costo.value).replace(/[^0-9]/g, '')) || 0,
      status: status.value,
    };
    state.envios.unshift(item);
    saveState(state);
    render();
  });

  // Leaflet init after DOM insertion
  queueMicrotask(() => {
    const mapContainer = document.getElementById('envios-map');
    if (!mapContainer) return;
    if (!window.L) {
      mapContainer.textContent = 'Mapa no disponible (sin internet / Leaflet).';
      return;
    }

    const center = [tabascoCenter.lat, tabascoCenter.lng];
    const map = window.L.map(mapContainer, { zoomControl: true }).setView(center, 8);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = window.L.marker(center, { draggable: true }).addTo(map);

    selectedLat = tabascoCenter.lat;
    selectedLng = tabascoCenter.lng;
    updateDistanceAndCost();

    map.on('click', async (ev) => {
      const latV = ev.latlng.lat;
      const lngV = ev.latlng.lng;
      marker.setLatLng([latV, lngV]);
      await setAddressFromReverse(latV, lngV);
    });

    marker.on('dragend', async () => {
      const p = marker.getLatLng();
      await setAddressFromReverse(p.lat, p.lng);
    });

    // Expose for address search panning within this render
    window.__enviosMap = map;
    window.__enviosMarker = marker;
  });

  const table = el('table');
  table.appendChild(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: 'ID' }),
      el('th', { text: 'Cliente' }),
      el('th', { text: 'Tipo' }),
      el('th', { text: 'KM' }),
      el('th', { text: 'Estatus' }),
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
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn',
        type: 'button',
        onclick: () => {
          const demo = [
            { sku: 'SKU-4001', nombre: 'Remolque ganadero reforzado', categoria: 'Remolques', stock: 10, precio: 165000 },
            { sku: 'SKU-4002', nombre: 'Remolque cama baja', categoria: 'Remolques', stock: 10, precio: 245000 },
            { sku: 'SKU-5001', nombre: 'Prensa ganadera de sujeción', categoria: 'Prensa', stock: 10, precio: 189000 },
            { sku: 'SKU-6001', nombre: 'Galera metálica modular', categoria: 'Galeras', stock: 10, precio: 320000 },
            { sku: 'SKU-7001', nombre: 'Planta de alimentos 3T/h', categoria: 'Plantas', stock: 10, precio: 890000 },
            { sku: 'SKU-1001', nombre: 'Báscula ganadera 1100', categoria: 'Básculas', stock: 10, precio: 125000 },
            { sku: 'SKU-2001', nombre: 'Corral de manejo', categoria: 'Corrales', stock: 10, precio: 98000 },
            { sku: 'SKU-3001', nombre: 'Baño garrapaticida', categoria: 'Baños', stock: 10, precio: 145000 },
          ];
          state.inventario = demo;
          saveState(state);
          render();
        },
      }, ['Poblar demo (10u)']),
      el('button', { class: 'btn btn-primary', type: 'submit' }, ['Guardar']),
    ]),
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
    el('option', { value: 'Plantas', text: 'Plantas' }),
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
  ventas: viewVentas,
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
