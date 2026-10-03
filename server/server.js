const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const port = Number(process.env.PORT || 4000);
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'buildcore-dev-secret';
const ERP_PIN = String(process.env.ERP_PIN || '1717');

if (!databaseUrl || !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
}

const db = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

function sqlWithParameters(sql) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

async function queryRows(sql, params = []) {
  const result = await db.query(sqlWithParameters(sql), params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryRows(sql, params);
  return rows[0];
}

async function execute(sql, params = []) {
  return db.query(sqlWithParameters(sql), params);
}

const defaultSettings = {
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  currency: '',
  timezone: '',
  dateFormat: '',
  theme: 'light',
  notifications: 'true',
};

async function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(defaultSettings)) {
    await execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING', [key, String(value)]);
  }
  await execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING', ['erpPin', ERP_PIN]);
}

async function getCurrentErpPin() {
  return (await queryOne('SELECT value FROM settings WHERE key = ?', ['erpPin']))?.value || ERP_PIN;
}

function generateToken(scope = 'session') {
  return jwt.sign({ sub: 'owner', role: 'owner', scope }, JWT_SECRET, {
    expiresIn: '8h',
  });
}

function parseNumeric(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function addAuditLog(action, moduleName, recordId = 'N/A') {
  await execute(
    'INSERT INTO audit_logs (user_name, action, module_name, record_id, created_at) VALUES (?, ?, ?, ?, ?)',
    ['Owner', action, moduleName, String(recordId), new Date().toISOString()]
  );
}

async function getSettingsObject() {
  const rows = await queryRows('SELECT key, value FROM settings');
  const settings = { ...defaultSettings };
  rows.forEach((row) => {
    if (Object.hasOwn(defaultSettings, row.key)) {
      settings[row.key] = row.value;
    }
  });
  return settings;
}

const schema = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT UNIQUE,
    project_name TEXT,
    client_name TEXT,
    client_contact TEXT,
    project_type TEXT,
    location TEXT,
    start_date TEXT,
    expected_end_date TEXT,
    budget REAL DEFAULT 0,
    actual_cost REAL DEFAULT 0,
    progress INTEGER DEFAULT 0,
    project_manager TEXT,
    status TEXT DEFAULT 'Planning',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sites (
    id BIGSERIAL PRIMARY KEY,
    site_name TEXT,
    supervisor TEXT,
    engineer TEXT,
    workers INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT UNIQUE,
    name TEXT,
    father_name TEXT,
    cnic TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    department TEXT,
    designation TEXT,
    joining_date TEXT,
    salary REAL DEFAULT 0,
    employment_type TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payroll (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT,
    employee_name TEXT,
    basic_salary REAL DEFAULT 0,
    overtime REAL DEFAULT 0,
    bonus REAL DEFAULT 0,
    advance REAL DEFAULT 0,
    deduction REAL DEFAULT 0,
    net_salary REAL DEFAULT 0,
    pay_period TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    item_id TEXT UNIQUE,
    item_name TEXT,
    category TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    minimum_stock REAL DEFAULT 0,
    purchase_price REAL DEFAULT 0,
    supplier TEXT,
    warehouse TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    equipment_id TEXT UNIQUE,
    equipment_name TEXT,
    category TEXT,
    model TEXT,
    registration_number TEXT,
    purchase_date TEXT,
    purchase_cost REAL DEFAULT 0,
    current_value REAL DEFAULT 0,
    location TEXT,
    assigned_project TEXT,
    operator TEXT,
    status TEXT DEFAULT 'Available',
    maintenance_date TEXT,
    next_maintenance_date TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    purchase_id TEXT UNIQUE,
    supplier TEXT,
    project TEXT,
    date TEXT,
    items TEXT,
    quantity REAL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_id TEXT UNIQUE,
    client TEXT,
    project TEXT,
    contract_date TEXT,
    contract_value REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    payment_terms TEXT,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_id TEXT UNIQUE,
    date TEXT,
    category TEXT,
    project TEXT,
    site TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    payment_method TEXT,
    paid_by TEXT,
    status TEXT DEFAULT 'Pending',
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    message TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_name TEXT,
    action TEXT,
    module_name TEXT,
    record_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`;

async function initializeDatabase() {
  await db.query(schema);
  await ensureDefaultSettings();
}

function requireAuth(requiredScope = 'session') {
  return function (req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (requiredScope === 'reports' && payload.scope !== 'reports') {
        return res.status(403).json({ message: 'Reports access requires owner verification.' });
      }
      if (requiredScope === 'session' && payload.scope !== 'session') {
        return res.status(403).json({ message: 'Invalid session scope.' });
      }
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Authentication failed or session expired.' });
    }
  };
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BUILDCORE ERP API is running.' });
});

app.post('/api/auth/verify-pin', async (req, res) => {
  const { pin } = req.body || {};
  if (String(pin) !== await getCurrentErpPin()) {
    return res.status(401).json({ message: 'Incorrect PIN. Please try again.' });
  }

  const token = generateToken('session');
  return res.json({ token, message: 'PIN verified successfully.' });
});

app.post('/api/auth/change-pin', requireAuth('session'), async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const currentErpPin = await getCurrentErpPin();
  if (String(currentPin ?? '') !== currentErpPin) {
    return res.status(401).json({ message: 'Current PIN is incorrect.' });
  }
  if (!/^\d{4}$/.test(String(newPin ?? ''))) {
    return res.status(400).json({ message: 'New PIN must contain exactly four digits.' });
  }
  if (String(newPin) === currentErpPin) {
    return res.status(400).json({ message: 'New PIN must be different from the current PIN.' });
  }

  await execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['erpPin', String(newPin)]);
  await addAuditLog('Changed ERP PIN', 'Settings');
  return res.json({ success: true, message: 'ERP PIN updated successfully.' });
});

app.post('/api/auth/verify-reports-pin', async (req, res) => {
  const { pin } = req.body || {};
  if (String(pin) !== await getCurrentErpPin()) {
    return res.status(401).json({ message: 'Incorrect reports PIN.' });
  }

  const token = generateToken('reports');
  return res.json({ token, message: 'Reports PIN verified successfully.' });
});

app.get('/api/settings', requireAuth('session'), async (req, res) => {
  return res.json(await getSettingsObject());
});

app.put('/api/settings', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const allowedKeys = Object.keys(defaultSettings);

  const updates = Object.entries(payload).filter(([key]) => allowedKeys.includes(key));
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No valid settings were provided.' });
  }

  for (const [key, value] of updates) {
    await execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
  }

  return res.json({ success: true, settings: await getSettingsObject() });
});

async function getProjectDashboardStats() {
  const projectRows = await queryRows('SELECT * FROM projects ORDER BY created_at DESC');
  const employeeRows = await queryRows('SELECT * FROM employees');
  const inventoryRows = await queryRows('SELECT * FROM inventory_items');
  const equipmentRows = await queryRows('SELECT * FROM equipment');
  const expenseRows = await queryRows('SELECT * FROM expenses');
  const purchaseRows = await queryRows('SELECT * FROM purchases');
  const contractRows = await queryRows('SELECT * FROM contracts');

  const totalRevenue = Array.from(contractRows).reduce((sum, row) => sum + parseNumeric(row.contract_value), 0)
    + Array.from(projectRows).reduce((sum, row) => sum + parseNumeric(row.budget), 0);
  const totalExpenses = Array.from(expenseRows).reduce((sum, row) => sum + parseNumeric(row.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const pendingPayments = Array.from(purchaseRows)
    .filter((row) => row.payment_status !== 'Paid')
    .reduce((sum, row) => sum + parseNumeric(row.total_amount), 0);

  const progressCounts = {
    Planned: 0,
    'In Progress': 0,
    Completed: 0,
  };

  projectRows.forEach((project) => {
    const status = String(project.status || '').trim();
    if (status === 'Completed') progressCounts.Completed += 1;
    else if (status === 'In Progress') progressCounts['In Progress'] += 1;
    else progressCounts.Planned += 1;
  });

  const donut = {
    Completed: 0,
    'In Progress': 0,
    'Not Started': 0,
    'On Hold': 0,
  };

  projectRows.forEach((project) => {
    const status = String(project.status || '').trim();
    if (status === 'Completed') donut.Completed += 1;
    else if (status === 'In Progress') donut['In Progress'] += 1;
    else if (status === 'On Hold') donut['On Hold'] += 1;
    else donut['Not Started'] += 1;
  });

  const completedPercent = projectRows.length ? Math.round((donut.Completed / projectRows.length) * 100) : 0;
  const recentActivities = await queryRows('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6');
  const lowStock = inventoryRows.filter((item) => parseNumeric(item.quantity) <= parseNumeric(item.minimum_stock));
  const categoryTotals = {};
  expenseRows.forEach((row) => {
    const category = row.category || 'Miscellaneous';
    categoryTotals[category] = (categoryTotals[category] || 0) + parseNumeric(row.amount);
  });

  return {
    projectRows,
    employeeRows,
    inventoryRows,
    equipmentRows,
    expenseRows,
    purchaseRows,
    contractRows,
    kpis: {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingPayments,
      totalProjects: projectRows.length,
      totalEmployees: employeeRows.length,
      totalEquipment: equipmentRows.length,
      totalInventory: inventoryRows.length,
    },
    progressChart: Object.entries(progressCounts).map(([name, value]) => ({ name, value })),
    statusChart: Object.entries(donut).map(([name, value]) => ({ name, value })),
    completedPercent,
    recentActivities,
    lowStock,
    categoryTotals,
  };
}

app.get('/api/dashboard', requireAuth('session'), async (req, res) => {
  const dashboard = await getProjectDashboardStats();
  return res.json(dashboard);
});

app.get('/api/notifications', requireAuth('session'), async (req, res) => {
  const lowStock = await queryRows('SELECT * FROM inventory_items WHERE quantity <= minimum_stock');
  const dueEquipment = await queryRows("SELECT * FROM equipment WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date <= (CURRENT_DATE + INTERVAL '7 days')::text");
  const pendingPurchases = await queryRows('SELECT * FROM purchases WHERE payment_status != ?', ['Paid']);

  const notifications = [];
  lowStock.forEach((item) => {
    notifications.push({ id: item.id, type: 'low-stock', message: `${item.item_name} is below minimum stock.` });
  });
  dueEquipment.forEach((item) => {
    notifications.push({ id: item.id, type: 'maintenance', message: `${item.equipment_name} needs maintenance soon.` });
  });
  pendingPurchases.forEach((item) => {
    notifications.push({ id: item.id, type: 'payment', message: `${item.purchase_id} payment is still pending.` });
  });

  return res.json(notifications.slice(0, 8));
});

app.get('/api/search', requireAuth('session'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.json([]);
  }

  const results = [];
  const searches = [
    ['projects', "SELECT id, project_name AS name, project_id, 'Project' AS type FROM projects WHERE project_name LIKE ? OR client_name LIKE ? OR project_id LIKE ?", [q, q, q]],
    ['employees', "SELECT id, name, employee_id, 'Employee' AS type FROM employees WHERE name LIKE ? OR department LIKE ? OR employee_id LIKE ?", [q, q, q]],
    ['equipment', "SELECT id, equipment_name AS name, equipment_id, 'Equipment' AS type FROM equipment WHERE equipment_name LIKE ? OR category LIKE ? OR equipment_id LIKE ?", [q, q, q]],
    ['inventory', "SELECT id, item_name AS name, item_id, 'Inventory' AS type FROM inventory_items WHERE item_name LIKE ? OR category LIKE ? OR item_id LIKE ?", [q, q, q]],
    ['expenses', "SELECT id, description AS name, expense_id AS item_id, 'Expense' AS type FROM expenses WHERE description LIKE ? OR category LIKE ? OR expense_id LIKE ?", [q, q, q]],
    ['contracts', "SELECT id, client AS name, contract_id AS item_id, 'Contract' AS type FROM contracts WHERE client LIKE ? OR project LIKE ? OR contract_id LIKE ?", [q, q, q]],
  ];

  for (const [tableName, query, params] of searches) {
    const pattern = `%${q}%`;
    const rows = await queryRows(query, params.map(() => pattern));
    rows.forEach((row) => {
      results.push({ ...row, tableName });
    });
  }

  return res.json(results.slice(0, 12));
});

async function createRecord(tableName, fields, values, actionName) {
  const result = await execute(
    `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')}) RETURNING id`,
    values
  );
  await addAuditLog(actionName, tableName, result.rows[0].id);
  return result;
}

app.get('/api/projects', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM projects ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/projects', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const projectName = String(payload.project_name || payload.projectName || '').trim();
  if (!projectName) {
    return res.status(400).json({ message: 'Project name is required.' });
  }
  const record = {
    project_id: payload.project_id || payload.projectId || `PRO-${Date.now()}`,
    project_name: projectName,
    client_name: payload.client_name || payload.clientName || '',
    client_contact: payload.client_contact || payload.clientContact || '',
    project_type: payload.project_type || payload.projectType || 'Construction',
    location: payload.location || '',
    start_date: payload.start_date || payload.startDate || '',
    expected_end_date: payload.expected_end_date || payload.expectedEndDate || '',
    budget: parseNumeric(payload.budget, 0),
    actual_cost: parseNumeric(payload.actual_cost || payload.actualCost, 0),
    progress: parseNumeric(payload.progress, 0),
    project_manager: payload.project_manager || payload.projectManager || '',
    status: payload.status || 'Planning',
    description: payload.description || '',
  };

  await createRecord(
    'projects',
    ['project_id', 'project_name', 'client_name', 'client_contact', 'project_type', 'location', 'start_date', 'expected_end_date', 'budget', 'actual_cost', 'progress', 'project_manager', 'status', 'description'],
    [record.project_id, record.project_name, record.client_name, record.client_contact, record.project_type, record.location, record.start_date, record.expected_end_date, record.budget, record.actual_cost, record.progress, record.project_manager, record.status, record.description],
    'Created project'
  );

  return res.status(201).json({ success: true, message: 'Project created successfully.' });
});

app.put('/api/projects/:id', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const id = Number(req.params.id);
  const projectName = String(payload.project_name || payload.projectName || '').trim();
  if (!projectName) {
    return res.status(400).json({ message: 'Project name is required.' });
  }

  await execute(
    `UPDATE projects SET project_id = ?, project_name = ?, client_name = ?, client_contact = ?, project_type = ?, location = ?, start_date = ?, expected_end_date = ?, budget = ?, actual_cost = ?, progress = ?, project_manager = ?, status = ?, description = ? WHERE id = ?`
  , [
    payload.project_id || payload.projectId || `PRO-${id}`,
    projectName,
    payload.client_name || payload.clientName || '',
    payload.client_contact || payload.clientContact || '',
    payload.project_type || payload.projectType || 'Construction',
    payload.location || '',
    payload.start_date || payload.startDate || '',
    payload.expected_end_date || payload.expectedEndDate || '',
    parseNumeric(payload.budget, 0),
    parseNumeric(payload.actual_cost || payload.actualCost, 0),
    parseNumeric(payload.progress, 0),
    payload.project_manager || payload.projectManager || '',
    payload.status || 'Planning',
    payload.description || '',
    id,
  ]);
  await addAuditLog('Updated project', 'projects', id);
  return res.json({ success: true, message: 'Project updated successfully.' });
});

app.delete('/api/projects/:id', requireAuth('session'), async (req, res) => {
  const id = Number(req.params.id);
  await execute('DELETE FROM projects WHERE id = ?', [id]);
  await addAuditLog('Deleted project', 'projects', id);
  return res.json({ success: true, message: 'Project deleted successfully.' });
});

app.get('/api/employees', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM employees ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/employees', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const name = String(payload.name || '').trim();
  if (!name) {
    return res.status(400).json({ message: 'Employee name is required.' });
  }

  await createRecord(
    'employees',
    ['employee_id', 'name', 'father_name', 'cnic', 'phone', 'email', 'address', 'department', 'designation', 'joining_date', 'salary', 'employment_type', 'status'],
    [
      payload.employee_id || payload.employeeId || `EMP-${Date.now()}`,
      name,
      payload.father_name || payload.fatherName || '',
      payload.cnic || '',
      payload.phone || '',
      payload.email || '',
      payload.address || '',
      payload.department || '',
      payload.designation || '',
      payload.joining_date || payload.joiningDate || '',
      parseNumeric(payload.salary, 0),
      payload.employment_type || payload.employmentType || 'Permanent',
      payload.status || 'Active',
    ],
    'Added employee'
  );
  return res.status(201).json({ success: true, message: 'Employee created successfully.' });
});

app.put('/api/employees/:id', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const id = Number(req.params.id);
  await execute(
    `UPDATE employees SET employee_id = ?, name = ?, father_name = ?, cnic = ?, phone = ?, email = ?, address = ?, department = ?, designation = ?, joining_date = ?, salary = ?, employment_type = ?, status = ? WHERE id = ?`
  , [
    payload.employee_id || payload.employeeId || `EMP-${id}`,
    payload.name || '',
    payload.father_name || payload.fatherName || '',
    payload.cnic || '',
    payload.phone || '',
    payload.email || '',
    payload.address || '',
    payload.department || '',
    payload.designation || '',
    payload.joining_date || payload.joiningDate || '',
    parseNumeric(payload.salary, 0),
    payload.employment_type || payload.employmentType || 'Permanent',
    payload.status || 'Active',
    id,
  ]);
  await addAuditLog('Updated employee', 'employees', id);
  return res.json({ success: true, message: 'Employee updated successfully.' });
});

app.delete('/api/employees/:id', requireAuth('session'), async (req, res) => {
  const id = Number(req.params.id);
  await execute('DELETE FROM employees WHERE id = ?', [id]);
  await addAuditLog('Deleted employee', 'employees', id);
  return res.json({ success: true, message: 'Employee deleted successfully.' });
});

app.get('/api/inventory', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM inventory_items ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/inventory', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const name = String(payload.item_name || payload.itemName || '').trim();
  if (!name) {
    return res.status(400).json({ message: 'Item name is required.' });
  }

  await createRecord(
    'inventory_items',
    ['item_id', 'item_name', 'category', 'unit', 'quantity', 'minimum_stock', 'purchase_price', 'supplier', 'warehouse', 'status'],
    [
      payload.item_id || payload.itemId || `INV-${Date.now()}`,
      name,
      payload.category || '',
      payload.unit || '',
      parseNumeric(payload.quantity, 0),
      parseNumeric(payload.minimum_stock || payload.minimumStock, 0),
      parseNumeric(payload.purchase_price || payload.purchasePrice, 0),
      payload.supplier || '',
      payload.warehouse || '',
      payload.status || 'Active',
    ],
    'Updated inventory'
  );
  return res.status(201).json({ success: true, message: 'Inventory item created successfully.' });
});

app.put('/api/inventory/:id', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const id = Number(req.params.id);
  await execute(
    `UPDATE inventory_items SET item_id = ?, item_name = ?, category = ?, unit = ?, quantity = ?, minimum_stock = ?, purchase_price = ?, supplier = ?, warehouse = ?, status = ? WHERE id = ?`
  , [
    payload.item_id || payload.itemId || `INV-${id}`,
    payload.item_name || payload.itemName || '',
    payload.category || '',
    payload.unit || '',
    parseNumeric(payload.quantity, 0),
    parseNumeric(payload.minimum_stock || payload.minimumStock, 0),
    parseNumeric(payload.purchase_price || payload.purchasePrice, 0),
    payload.supplier || '',
    payload.warehouse || '',
    payload.status || 'Active',
    id,
  ]);
  await addAuditLog('Updated inventory', 'inventory_items', id);
  return res.json({ success: true, message: 'Inventory item updated successfully.' });
});

app.delete('/api/inventory/:id', requireAuth('session'), async (req, res) => {
  const id = Number(req.params.id);
  await execute('DELETE FROM inventory_items WHERE id = ?', [id]);
  await addAuditLog('Deleted inventory item', 'inventory_items', id);
  return res.json({ success: true, message: 'Inventory item deleted successfully.' });
});

app.get('/api/equipment', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM equipment ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/equipment', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const name = String(payload.equipment_name || payload.equipmentName || '').trim();
  if (!name) {
    return res.status(400).json({ message: 'Equipment name is required.' });
  }

  await createRecord(
    'equipment',
    ['equipment_id', 'equipment_name', 'category', 'model', 'registration_number', 'purchase_date', 'purchase_cost', 'current_value', 'location', 'assigned_project', 'operator', 'status', 'maintenance_date', 'next_maintenance_date'],
    [
      payload.equipment_id || payload.equipmentId || `EQ-${Date.now()}`,
      name,
      payload.category || '',
      payload.model || '',
      payload.registration_number || payload.registrationNumber || '',
      payload.purchase_date || payload.purchaseDate || '',
      parseNumeric(payload.purchase_cost || payload.purchaseCost, 0),
      parseNumeric(payload.current_value || payload.currentValue, 0),
      payload.location || '',
      payload.assigned_project || payload.assignedProject || '',
      payload.operator || '',
      payload.status || 'Available',
      payload.maintenance_date || payload.maintenanceDate || '',
      payload.next_maintenance_date || payload.nextMaintenanceDate || '',
    ],
    'Added equipment'
  );
  return res.status(201).json({ success: true, message: 'Equipment created successfully.' });
});

app.put('/api/equipment/:id', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const id = Number(req.params.id);
  await execute(
    `UPDATE equipment SET equipment_id = ?, equipment_name = ?, category = ?, model = ?, registration_number = ?, purchase_date = ?, purchase_cost = ?, current_value = ?, location = ?, assigned_project = ?, operator = ?, status = ?, maintenance_date = ?, next_maintenance_date = ? WHERE id = ?`
  , [
    payload.equipment_id || payload.equipmentId || `EQ-${id}`,
    payload.equipment_name || payload.equipmentName || '',
    payload.category || '',
    payload.model || '',
    payload.registration_number || payload.registrationNumber || '',
    payload.purchase_date || payload.purchaseDate || '',
    parseNumeric(payload.purchase_cost || payload.purchaseCost, 0),
    parseNumeric(payload.current_value || payload.currentValue, 0),
    payload.location || '',
    payload.assigned_project || payload.assignedProject || '',
    payload.operator || '',
    payload.status || 'Available',
    payload.maintenance_date || payload.maintenanceDate || '',
    payload.next_maintenance_date || payload.nextMaintenanceDate || '',
    id,
  ]);
  await addAuditLog('Updated equipment', 'equipment', id);
  return res.json({ success: true, message: 'Equipment updated successfully.' });
});

app.delete('/api/equipment/:id', requireAuth('session'), async (req, res) => {
  const id = Number(req.params.id);
  await execute('DELETE FROM equipment WHERE id = ?', [id]);
  await addAuditLog('Deleted equipment', 'equipment', id);
  return res.json({ success: true, message: 'Equipment deleted successfully.' });
});

app.get('/api/expenses', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM expenses ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/expenses', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  if (!payload.category || !payload.amount) {
    return res.status(400).json({ message: 'Expense category and amount are required.' });
  }

  await createRecord(
    'expenses',
    ['expense_id', 'date', 'category', 'project', 'site', 'description', 'amount', 'payment_method', 'paid_by', 'status', 'reference_number', 'notes'],
    [
      payload.expense_id || payload.expenseId || `EXP-${Date.now()}`,
      payload.date || '',
      payload.category,
      payload.project || '',
      payload.site || '',
      payload.description || '',
      parseNumeric(payload.amount, 0),
      payload.payment_method || payload.paymentMethod || 'Cash',
      payload.paid_by || payload.paidBy || '',
      payload.status || 'Pending',
      payload.reference_number || payload.referenceNumber || '',
      payload.notes || '',
    ],
    'Created expense'
  );
  return res.status(201).json({ success: true, message: 'Expense created successfully.' });
});

app.put('/api/expenses/:id', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const id = Number(req.params.id);
  await execute(
    `UPDATE expenses SET expense_id = ?, date = ?, category = ?, project = ?, site = ?, description = ?, amount = ?, payment_method = ?, paid_by = ?, status = ?, reference_number = ?, notes = ? WHERE id = ?`
  , [
    payload.expense_id || payload.expenseId || `EXP-${id}`,
    payload.date || '',
    payload.category || '',
    payload.project || '',
    payload.site || '',
    payload.description || '',
    parseNumeric(payload.amount, 0),
    payload.payment_method || payload.paymentMethod || 'Cash',
    payload.paid_by || payload.paidBy || '',
    payload.status || 'Pending',
    payload.reference_number || payload.referenceNumber || '',
    payload.notes || '',
    id,
  ]);
  await addAuditLog('Updated expense', 'expenses', id);
  return res.json({ success: true, message: 'Expense updated successfully.' });
});

app.delete('/api/expenses/:id', requireAuth('session'), async (req, res) => {
  const id = Number(req.params.id);
  await execute('DELETE FROM expenses WHERE id = ?', [id]);
  await addAuditLog('Deleted expense', 'expenses', id);
  return res.json({ success: true, message: 'Expense deleted successfully.' });
});

app.get('/api/purchases', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM purchases ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/purchases', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const purchaseId = payload.purchase_id || payload.purchaseId || `PUR-${Date.now()}`;
  const total = parseNumeric(payload.total_amount || payload.totalAmount, 0);
  await createRecord(
    'purchases',
    ['purchase_id', 'supplier', 'project', 'date', 'items', 'quantity', 'unit_price', 'tax', 'discount', 'total_amount', 'payment_status'],
    [
      purchaseId,
      payload.supplier || '',
      payload.project || '',
      payload.date || '',
      payload.items || '',
      parseNumeric(payload.quantity, 0),
      parseNumeric(payload.unit_price || payload.unitPrice, 0),
      parseNumeric(payload.tax, 0),
      parseNumeric(payload.discount, 0),
      total,
      payload.payment_status || payload.paymentStatus || 'Pending',
    ],
    'Created purchase'
  );
  return res.status(201).json({ success: true, message: 'Purchase created successfully.' });
});

app.get('/api/contracts', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM contracts ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/contracts', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const contractId = payload.contract_id || payload.contractId || `CTR-${Date.now()}`;
  await createRecord(
    'contracts',
    ['contract_id', 'client', 'project', 'contract_date', 'contract_value', 'start_date', 'end_date', 'payment_terms', 'status', 'notes'],
    [
      contractId,
      payload.client || '',
      payload.project || '',
      payload.contract_date || payload.contractDate || '',
      parseNumeric(payload.contract_value || payload.contractValue, 0),
      payload.start_date || payload.startDate || '',
      payload.end_date || payload.endDate || '',
      payload.payment_terms || payload.paymentTerms || '',
      payload.status || 'Draft',
      payload.notes || '',
    ],
    'Created contract'
  );
  return res.status(201).json({ success: true, message: 'Contract created successfully.' });
});

app.get('/api/sites', requireAuth('session'), async (req, res) => {
  const rows = await queryRows('SELECT * FROM sites ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/sites', requireAuth('session'), async (req, res) => {
  const payload = req.body || {};
  const siteName = String(payload.site_name || payload.siteName || '').trim();
  if (!siteName) {
    return res.status(400).json({ message: 'Site name is required.' });
  }

  await createRecord('sites', ['site_name', 'supervisor', 'engineer', 'workers', 'status', 'location'], [siteName, payload.supervisor || '', payload.engineer || '', parseNumeric(payload.workers, 0), payload.status || 'Active', payload.location || ''], 'Created site');
  return res.status(201).json({ success: true, message: 'Site created successfully.' });
});

app.get('/api/reports', requireAuth('reports'), async (req, res) => {
  const type = String(req.query.type || 'project');
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';
  const projectFilter = req.query.project || '';

  let rows = [];
  switch (type) {
    case 'expense':
      rows = await queryRows('SELECT * FROM expenses ORDER BY created_at DESC');
      break;
    case 'financial': {
      const expenseRows = await queryRows('SELECT * FROM expenses ORDER BY created_at DESC');
      const contractRows = await queryRows('SELECT * FROM contracts ORDER BY created_at DESC');
      rows = [...expenseRows, ...contractRows];
      break;
    }
    case 'inventory':
      rows = await queryRows('SELECT * FROM inventory_items ORDER BY created_at DESC');
      break;
    case 'equipment':
      rows = await queryRows('SELECT * FROM equipment ORDER BY created_at DESC');
      break;
    case 'employee':
      rows = await queryRows('SELECT * FROM employees ORDER BY created_at DESC');
      break;
    case 'payroll':
      rows = await queryRows('SELECT * FROM payroll ORDER BY created_at DESC');
      break;
    case 'purchase':
      rows = await queryRows('SELECT * FROM purchases ORDER BY created_at DESC');
      break;
    case 'sales':
      rows = await queryRows('SELECT * FROM contracts ORDER BY created_at DESC');
      break;
    default:
      rows = await queryRows('SELECT * FROM projects ORDER BY created_at DESC');
  }

  let filtered = rows.filter((row) => {
    const projectValue = String(row.project || row.location || row.assigned_project || '');
    const rowDate = String(row.date || row.contract_date || row.start_date || row.joining_date || '');
    const matchesProject = !projectFilter || projectValue.toLowerCase().includes(projectFilter.toLowerCase());
    const matchesDate =
      (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
    return matchesProject && matchesDate;
  });

  const summary = {
    totalRecords: filtered.length,
    totalValue: filtered.reduce((sum, row) => sum + parseNumeric(row.amount || row.contract_value || row.total_amount || row.budget || row.salary || row.quantity || row.current_value), 0),
  };

  return res.json({ type, rows: filtered, summary });
});

async function startServer() {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`BUILDCORE ERP API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to initialize PostgreSQL database:', error.message);
  process.exitCode = 1;
});
