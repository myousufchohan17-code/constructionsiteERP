import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CircleAlert,
  CircleCheck,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MoonStar,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SunMedium,
  Tractor,
  Trash2,
  User2,
  Users,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';
import logoPng from './assets/logo.png';

const THEME_COLORS = ['#38206B', '#8B5CF6', '#A78BFA', '#22A06B', '#F59E0B', '#EF4444'];

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Site Management', icon: Building2, path: '/sites' },
  { label: 'Employees', icon: Users, path: '/employees' },
  { label: 'HR & Payroll', icon: BriefcaseBusiness, path: '/payroll' },
  { label: 'Inventory', icon: Warehouse, path: '/inventory' },
  { label: 'Equipment', icon: Tractor, path: '/equipment' },
  { label: 'Purchases', icon: ShoppingCart, path: '/purchases' },
  { label: 'Sales & Contracts', icon: FileText, path: '/contracts' },
  { label: 'Finance', icon: CircleDollarSign, path: '/finance' },
  { label: 'Expenses', icon: ReceiptOutline, path: '/expenses' },
  { label: 'Reports', icon: ShieldCheck, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const MODULE_PATHS = Object.fromEntries(NAV_ITEMS.map(({ label, path }) => [label, path]));
const PATH_TO_MODULE = Object.fromEntries(Object.entries(MODULE_PATHS).map(([label, path]) => [path, label]));

const defaultProjectForm = {
  project_id: '',
  project_name: '',
  client_name: '',
  client_contact: '',
  project_type: '',
  location: '',
  start_date: '',
  expected_end_date: '',
  budget: '',
  actual_cost: '',
  progress: '',
  project_manager: '',
  status: '',
  description: '',
};

const defaultEmployeeForm = {
  employee_id: '',
  name: '',
  father_name: '',
  cnic: '',
  phone: '',
  email: '',
  address: '',
  department: '',
  designation: '',
  joining_date: '',
  salary: '',
  employment_type: '',
  status: '',
};

const defaultInventoryForm = {
  item_id: '',
  item_name: '',
  category: '',
  unit: '',
  quantity: '',
  minimum_stock: '',
  purchase_price: '',
  supplier: '',
  warehouse: '',
  status: '',
};

const defaultEquipmentForm = {
  equipment_id: '',
  equipment_name: '',
  category: '',
  model: '',
  registration_number: '',
  purchase_date: '',
  purchase_cost: '',
  current_value: '',
  location: '',
  assigned_project: '',
  operator: '',
  status: '',
  maintenance_date: '',
  next_maintenance_date: '',
};

const defaultExpenseForm = {
  expense_id: '',
  date: '',
  category: '',
  project: '',
  site: '',
  description: '',
  amount: '',
  payment_method: '',
  paid_by: '',
  status: '',
  reference_number: '',
  notes: '',
};

const defaultSiteForm = {
  site_name: '',
  supervisor: '',
  engineer: '',
  workers: '',
  status: 'Active',
  location: '',
};

const defaultContractForm = {
  contract_id: '',
  client: '',
  project: '',
  contract_date: '',
  contract_value: '',
  start_date: '',
  end_date: '',
  payment_terms: '',
  status: 'Draft',
  notes: '',
};

const defaultPurchaseForm = {
  purchase_id: '',
  supplier: '',
  project: '',
  date: '',
  items: '',
  quantity: '',
  unit_price: '',
  tax: '',
  discount: '',
  total_amount: '',
  payment_status: 'Pending',
};

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

const formatCurrency = (value) => {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatMoney = (value) => formatCurrency(value);

function ReceiptOutline(props) {
  return <FileText {...props} />;
}

function ClockIcon(props) {
  return <BriefcaseBusiness {...props} />;
}

function parseToNumber(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getInitials(name) {
  if (!name) return 'BC';
  const words = String(name).trim().split(/\s+/);
  return words.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'BC';
}

async function apiFetch(route, options = {}, authMode = 'session') {
  const tokenKey = authMode === 'reports' ? 'buildcore_reports_session' : 'buildcore_session';
  const token = localStorage.getItem(tokenKey);
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !options.skipAuth) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${route}`, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('buildcore_session')));
  const [reportsUnlocked, setReportsUnlocked] = useState(Boolean(localStorage.getItem('buildcore_reports_session')));
  const [selectedModule, setSelectedModule] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [appAlert, setAppAlert] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const alertTimer = useRef(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [reportsPin, setReportsPin] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('buildcore_theme') || 'light');
  const [settings, setSettings] = useState(defaultSettings);
  const [pinChange, setPinChange] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [dashboard, setDashboard] = useState({
    kpis: {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      pendingPayments: 0,
      totalProjects: 0,
      totalEmployees: 0,
      totalEquipment: 0,
      totalInventory: 0,
    },
    progressChart: [],
    statusChart: [],
    completedPercent: 0,
    recentActivities: [],
    lowStock: [],
    categoryTotals: {},
    projectRows: [],
  });
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [sites, setSites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reportsData, setReportsData] = useState({ rows: [], summary: { totalRecords: 0, totalValue: 0 } });
  const [loading, setLoading] = useState(false);
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [employeeForm, setEmployeeForm] = useState(defaultEmployeeForm);
  const [inventoryForm, setInventoryForm] = useState(defaultInventoryForm);
  const [equipmentForm, setEquipmentForm] = useState(defaultEquipmentForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [siteForm, setSiteForm] = useState(defaultSiteForm);
  const [contractForm, setContractForm] = useState(defaultContractForm);
  const [purchaseForm, setPurchaseForm] = useState(defaultPurchaseForm);
  const [projectEditingId, setProjectEditingId] = useState(null);
  const [employeeEditingId, setEmployeeEditingId] = useState(null);
  const [inventoryEditingId, setInventoryEditingId] = useState(null);
  const [equipmentEditingId, setEquipmentEditingId] = useState(null);
  const [expenseEditingId, setExpenseEditingId] = useState(null);
  const [siteEditingId, setSiteEditingId] = useState(null);
  const [contractEditingId, setContractEditingId] = useState(null);
  const [purchaseEditingId, setPurchaseEditingId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const openForm = (moduleName) => setActiveForm({ module: moduleName, locationKey: location.key });
  const isFormOpen = (moduleName) => activeForm?.module === moduleName && activeForm.locationKey === location.key;
  const [reportsFilter, setReportsFilter] = useState({
    type: 'project',
    project: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    document.body.classList.toggle('app-dark', theme === 'dark');
    localStorage.setItem('buildcore_theme', theme);
  }, [theme]);

  useEffect(() => {
    const currentPath = location.pathname || '/';
    if (currentPath === '/') {
      navigate('/dashboard', { replace: true });
      return;
    }

    const matchedModule = PATH_TO_MODULE[currentPath];
    if (matchedModule) {
      setSelectedModule(matchedModule);
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [location.pathname, navigate]);

  const loadSettings = async () => {
    try {
      const result = await apiFetch('/settings');
      setSettings({ ...defaultSettings, ...result });
    } catch (error) {
      console.error(error);
    }
  };

  const refreshData = async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const [dashboardRes, projectRes, employeeRes, inventoryRes, equipmentRes, expenseRes, purchaseRes, contractRes, siteRes, notificationRes] = await Promise.all([
        apiFetch('/dashboard'),
        apiFetch('/projects'),
        apiFetch('/employees'),
        apiFetch('/inventory'),
        apiFetch('/equipment'),
        apiFetch('/expenses'),
        apiFetch('/purchases'),
        apiFetch('/contracts'),
        apiFetch('/sites'),
        apiFetch('/notifications'),
      ]);

      setDashboard(dashboardRes);
      setProjects(projectRes);
      setEmployees(employeeRes);
      setInventory(inventoryRes);
      setEquipment(equipmentRes);
      setExpenses(expenseRes);
      setPurchases(purchaseRes);
      setContracts(contractRes);
      setSites(siteRes);
      setNotifications(notificationRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    window.clearTimeout(alertTimer.current);
    setAppAlert({ message, type });
    alertTimer.current = window.setTimeout(() => setAppAlert(null), 4500);
  };

  const requestDelete = (resource, id, route) => {
    setDeleteConfirmation({
      resource,
      onConfirm: async () => {
        try {
          await apiFetch(`${route}/${id}`, { method: 'DELETE' });
          await refreshData();
          showAlert(`${resource} deleted successfully.`);
        } catch (error) {
          showAlert(error.message, 'error');
        }
      },
    });
  };

  useEffect(() => () => window.clearTimeout(alertTimer.current), []);

  useEffect(() => {
    if (!authenticated) return;
    loadSettings();
    refreshData();
  }, [authenticated]);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch(`/search?q=${encodeURIComponent(searchTerm)}`);
        setSearchResults(result || []);
      } catch (error) {
        console.error(error);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleUnlock = async (event) => {
    event.preventDefault();
    try {
      const result = await apiFetch('/auth/verify-pin', { method: 'POST', body: { pin } }, 'session');
      localStorage.setItem('buildcore_session', result.token);
      setAuthenticated(true);
      setPin('');
      setPinError('');
    } catch (error) {
      setPinError(error.message);
      setPin('');
    }
  };

  const handleReportsUnlock = async (event) => {
    event.preventDefault();
    try {
      const result = await apiFetch('/auth/verify-reports-pin', { method: 'POST', body: { pin: reportsPin } }, 'reports');
      localStorage.setItem('buildcore_reports_session', result.token);
      setReportsUnlocked(true);
      setReportsError('');
      setReportsPin('');
      loadReports();
    } catch (error) {
      setReportsError(error.message);
      setReportsPin('');
    }
  };

  const lockSession = () => {
    localStorage.removeItem('buildcore_session');
    localStorage.removeItem('buildcore_reports_session');
    setAuthenticated(false);
    setReportsUnlocked(false);
    setSelectedModule('Dashboard');
    setPin('');
    setReportsPin('');
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  };

  const logout = () => {
    lockSession();
  };

  const updateSettings = async (event) => {
    event.preventDefault();
    try {
      const result = await apiFetch('/settings', {
        method: 'PUT',
        body: settings,
      });
      setSettings(result.settings || settings);
      showAlert('Settings saved successfully.');
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const changePin = async (event) => {
    event.preventDefault();
    if (pinChange.newPin !== pinChange.confirmPin) {
      showAlert('New PIN and confirmation do not match.', 'error');
      return;
    }

    try {
      const result = await apiFetch('/auth/change-pin', {
        method: 'POST',
        body: { currentPin: pinChange.currentPin, newPin: pinChange.newPin },
      });
      setPinChange({ currentPin: '', newPin: '', confirmPin: '' });
      showAlert(result.message);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const loadReports = async () => {
    try {
      const result = await apiFetch(`/reports?type=${reportsFilter.type}&project=${encodeURIComponent(reportsFilter.project)}&startDate=${encodeURIComponent(reportsFilter.startDate)}&endDate=${encodeURIComponent(reportsFilter.endDate)}`, {}, 'reports');
      setReportsData(result);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (reportsUnlocked) {
      loadReports();
    }
  }, [reportsUnlocked, reportsFilter]);

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    try {
      if (projectEditingId) {
        await apiFetch(`/projects/${projectEditingId}`, { method: 'PUT', body: projectForm });
      } else {
        await apiFetch('/projects', { method: 'POST', body: projectForm });
      }
      showAlert(projectEditingId ? 'Project updated successfully.' : 'Project added successfully.');
      setProjectForm(defaultProjectForm);
      setProjectEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deleteProject = async (id) => {
    requestDelete('Project', id, '/projects');
  };

  const handleEmployeeSubmit = async (event) => {
    event.preventDefault();
    try {
      if (employeeEditingId) {
        await apiFetch(`/employees/${employeeEditingId}`, { method: 'PUT', body: employeeForm });
      } else {
        await apiFetch('/employees', { method: 'POST', body: employeeForm });
      }
      showAlert(employeeEditingId ? 'Employee updated successfully.' : 'Employee added successfully.');
      setEmployeeForm(defaultEmployeeForm);
      setEmployeeEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deleteEmployee = async (id) => {
    requestDelete('Employee', id, '/employees');
  };

  const handleInventorySubmit = async (event) => {
    event.preventDefault();
    try {
      if (inventoryEditingId) {
        await apiFetch(`/inventory/${inventoryEditingId}`, { method: 'PUT', body: inventoryForm });
      } else {
        await apiFetch('/inventory', { method: 'POST', body: inventoryForm });
      }
      showAlert(inventoryEditingId ? 'Inventory item updated successfully.' : 'Inventory item added successfully.');
      setInventoryForm(defaultInventoryForm);
      setInventoryEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deleteInventory = async (id) => {
    requestDelete('Inventory item', id, '/inventory');
  };

  const handleEquipmentSubmit = async (event) => {
    event.preventDefault();
    try {
      if (equipmentEditingId) {
        await apiFetch(`/equipment/${equipmentEditingId}`, { method: 'PUT', body: equipmentForm });
      } else {
        await apiFetch('/equipment', { method: 'POST', body: equipmentForm });
      }
      showAlert(equipmentEditingId ? 'Equipment updated successfully.' : 'Equipment added successfully.');
      setEquipmentForm(defaultEquipmentForm);
      setEquipmentEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deleteEquipment = async (id) => {
    requestDelete('Equipment', id, '/equipment');
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    try {
      if (expenseEditingId) {
        await apiFetch(`/expenses/${expenseEditingId}`, { method: 'PUT', body: expenseForm });
      } else {
        await apiFetch('/expenses', { method: 'POST', body: expenseForm });
      }
      showAlert(expenseEditingId ? 'Expense updated successfully.' : 'Expense added successfully.');
      setExpenseForm(defaultExpenseForm);
      setExpenseEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deleteExpense = async (id) => {
    requestDelete('Expense', id, '/expenses');
  };

  const handleSiteSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiFetch('/sites', { method: 'POST', body: siteForm });
      showAlert('Site added successfully.');
      setSiteForm(defaultSiteForm);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const handleContractSubmit = async (event) => {
    event.preventDefault();
    try {
      if (contractEditingId) {
        await apiFetch(`/contracts/${contractEditingId}`, { method: 'PUT', body: contractForm });
      } else {
        await apiFetch('/contracts', { method: 'POST', body: contractForm });
      }
      showAlert(contractEditingId ? 'Contract updated successfully.' : 'Contract added successfully.');
      setContractForm(defaultContractForm);
      setContractEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    try {
      if (purchaseEditingId) {
        await apiFetch(`/purchases/${purchaseEditingId}`, { method: 'PUT', body: purchaseForm });
      } else {
        await apiFetch('/purchases', { method: 'POST', body: purchaseForm });
      }
      showAlert(purchaseEditingId ? 'Purchase updated successfully.' : 'Purchase added successfully.');
      setPurchaseForm(defaultPurchaseForm);
      setPurchaseEditingId(null);
      setActiveForm(null);
      refreshData();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const deletePurchase = async (id) => {
    requestDelete('Purchase', id, '/purchases');
  };

  const monthlyExpenseData = useMemo(() => {
    const totals = {};
    expenses.forEach((item) => {
      if (!item.date) return;
      const month = new Date(item.date).toLocaleString('en-US', { month: 'short' });
      totals[month] = (totals[month] || 0) + parseToNumber(item.amount);
    });

    return Object.entries(totals).map(([month, value]) => ({ month, value }));
  }, [expenses]);

  const projectStatusData = dashboard.statusChart || [];
  const pieColors = ['#22A06B', '#8B5CF6', '#F59E0B', '#EF4444'];
  const notificationCount = notifications.length;
  const payrollRows = useMemo(
    () =>
      employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        salary: Number(employee.salary || 0),
        deductions: 0,
        overtime: 0,
        status: employee.status || 'Active',
      })),
    [employees],
  );

  if (!authenticated) {
    return (
      <div className="pin-screen">
        <div className="pin-card">
          <div className="brand-block">
            <img src={logoPng} alt="BUILDCORE ERP Logo" className="brand-logo pin-logo" />
            <div>
              <h1>BUILDCORE ERP</h1>
              <p>Secure Construction Management</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="pin-form">
            <label className="pin-label">Enter your PIN to continue.</label>
            <div className="pin-input-row">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                aria-label="Four-digit PIN"
                autoComplete="current-password"
                className="pin-digit"
                required
              />
            </div>
            {pinError ? <div className="form-error">{pinError}</div> : null}
            <button type="submit" className="primary-btn wide-btn">Unlock ERP</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`erp-shell ${theme === 'dark' ? 'dark' : 'light'}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand-box">
          <div className="brand-mark brand-mark-logo">
            <img src={logoPng} alt="BUILDCORE ERP Logo" className="brand-logo" />
          </div>
          <div className="brand-copy">
            <h2>BUILDCORE ERP</h2>
            <small>Construction Management System</small>
          </div>
          <button type="button" className="collapse-btn" onClick={() => {
            if (window.matchMedia('(max-width: 840px)').matches) {
              setSidebarOpen(false);
              setSidebarCollapsed(false);
              return;
            }
            setSidebarCollapsed((prev) => !prev);
          }} aria-label="Toggle sidebar">
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              className={`nav-item ${selectedModule === label ? 'active' : ''}`}
              onClick={() => {
                setActiveForm(null);
                setSidebarOpen(false);
                navigate(path);
                if (label === 'Reports' && !reportsUnlocked) {
                  setReportsUnlocked(false);
                }
              }}
              type="button"
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      {sidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} /> : null}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn mobile-only" onClick={() => setSidebarOpen((prev) => !prev)}>
              <Menu size={18} />
            </button>
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                placeholder="Search projects, employees, inventory..."
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="topbar-actions">
            <div className="header-action-wrap">
              <button type="button" className="icon-btn" title="Notifications" onClick={() => setNotificationsOpen((prev) => !prev)}>
                <Bell size={17} />
                {notificationCount ? <span className="notification-dot" /> : null}
              </button>
              {notificationsOpen ? (
                <div className="notification-panel">
                  <div className="panel-header-row">
                    <strong>Notifications</strong>
                    <button type="button" className="mini-link" onClick={() => setNotificationsOpen(false)}>Close</button>
                  </div>
                  {notifications.length ? (
                    notifications.map((item) => (
                      <div key={`${item.type}-${item.id || item.message}`} className="notification-item">
                        <span className="notification-bullet" />
                        <div>
                          <strong>{item.type || 'System'}</strong>
                          <p>{item.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">No notifications.</p>
                  )}
                </div>
              ) : null}
            </div>
            <button type="button" className="theme-toggle" onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>
              {theme === 'light' ? <MoonStar size={17} /> : <SunMedium size={17} />}
            </button>
            <div className="profile-wrap">
              <button type="button" className="profile-pill" onClick={() => setProfileMenuOpen((prev) => !prev)}>
                <div className="avatar">AO</div>
                <div>
                  <strong>Admin Owner</strong>
                  <small>Owner</small>
                </div>
                <ChevronDown size={15} />
              </button>
              {profileMenuOpen ? (
                <div className="profile-menu">
                  <button type="button" onClick={() => { setActiveForm(null); setSelectedModule('Settings'); navigate('/settings'); setProfileMenuOpen(false); }}>Profile Settings</button>
                  <button type="button" onClick={() => { setActiveForm(null); setSelectedModule('Dashboard'); navigate('/dashboard'); setProfileMenuOpen(false); }}>Dashboard</button>
                  <button type="button" className="danger-item" onClick={() => { lockSession(); setProfileMenuOpen(false); }}>Lock ERP</button>
                </div>
              ) : null}
            </div>
            <button type="button" className="plain-btn" onClick={lockSession}>
              <Lock size={16} />
              Lock ERP
            </button>
            <button type="button" className="plain-btn danger" onClick={logout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {appAlert ? (
          <div className={`app-toast ${appAlert.type}`} role={appAlert.type === 'error' ? 'alert' : 'status'} aria-live={appAlert.type === 'error' ? 'assertive' : 'polite'}>
            {appAlert.type === 'error' ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
            <span>{appAlert.message}</span>
            <button type="button" aria-label="Dismiss alert" onClick={() => { window.clearTimeout(alertTimer.current); setAppAlert(null); }}><X size={17} /></button>
          </div>
        ) : null}

        {deleteConfirmation ? (
          <div className="confirm-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setDeleteConfirmation(null); }}>
            <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
              <div className="confirm-dialog-heading">
                <span className="confirm-dialog-icon"><Trash2 size={21} /></span>
                <div>
                  <p className="eyebrow">Confirm deletion</p>
                  <h2 id="delete-dialog-title">Delete {deleteConfirmation.resource}?</h2>
                </div>
              </div>
              <p id="delete-dialog-description">This record will be permanently removed. This action cannot be undone.</p>
              <div className="button-row confirm-dialog-actions">
                <button type="button" className="secondary-btn" onClick={() => setDeleteConfirmation(null)}>Cancel</button>
                <button type="button" className="confirm-delete-btn" onClick={() => { const confirmAction = deleteConfirmation.onConfirm; setDeleteConfirmation(null); void confirmAction(); }}>Delete {deleteConfirmation.resource}</button>
              </div>
            </section>
          </div>
        ) : null}

        {searchResults.length ? (
          <div className="search-results">
            {searchResults.map((item) => (
              <button key={`${item.tableName}-${item.id}`} type="button" className="search-result-item" onClick={() => { setSelectedModule('Dashboard'); setSearchTerm(''); }}>
                <span className="result-tag">{item.type}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="content-wrap">
          {selectedModule === 'Dashboard' ? (
            <div className="page-grid">
              <section className="hero-panel">
                <div className="hero-copy">
                  <p className="eyebrow">CONSTRUCTION ERP</p>
                  <h1>Build Smarter. Manage Better.</h1>
                  <p>
                    Streamline your construction operations with an all-in-one ERP system for planning,
                    finance, workforce, inventory, equipment and project management.
                  </p>
                  <button type="button" className="primary-btn" onClick={() => { setSelectedModule('Projects'); navigate('/projects'); }}>
                    View Projects
                  </button>
                </div>
              </section>

              <div className="stats-grid">
                <StatCard title="Total Revenue" value={formatMoney(dashboard.kpis.totalRevenue)} subtitle="Across active contracts and budgets" tone="purple" icon={<CircleDollarSign size={18} />} />
                <StatCard title="Total Expenses" value={formatMoney(dashboard.kpis.totalExpenses)} subtitle="Recorded project costs" tone="orange" icon={<ReceiptOutline size={18} />} />
                <StatCard title="Net Profit" value={formatMoney(dashboard.kpis.netProfit)} subtitle="Revenue minus expenses" tone="green" icon={<ShieldCheck size={18} />} />
                <StatCard title="Pending Payments" value={formatMoney(dashboard.kpis.pendingPayments)} subtitle="Unpaid and outstanding" tone="red" icon={<ShoppingCart size={18} />} />
                <StatCard title="Total Projects" value={dashboard.kpis.totalProjects} subtitle="Live jobs" tone="purple" icon={<FolderKanban size={18} />} />
                <StatCard title="Total Employees" value={dashboard.kpis.totalEmployees} subtitle="Workforce count" tone="green" icon={<Users size={18} />} />
                <StatCard title="Equipment" value={dashboard.kpis.totalEquipment} subtitle="Registered assets" tone="orange" icon={<Tractor size={18} />} />
                <StatCard title="Inventory Items" value={dashboard.kpis.totalInventory} subtitle="Stocked materials" tone="purple" icon={<Warehouse size={18} />} />
              </div>

              <div className="dashboard-row">
                <div className="panel-card chart-card wide-card">
                  <div className="card-header">
                    <h3>Project Progress</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard.progressChart || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="panel-card chart-card small-card">
                  <div className="card-header">
                    <h3>Project Status</h3>
                  </div>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={projectStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                          {projectStatusData.map((entry, index) => (
                            <Cell key={`cell-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <strong>{dashboard.completedPercent || 0}%</strong>
                      <span>Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard-lower-grid">
                <div className="panel-card">
                  <div className="card-header">
                    <h3>Recent Activity</h3>
                  </div>
                  <div className="activity-list">
                    {dashboard.recentActivities.length ? (
                      dashboard.recentActivities.map((activity) => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-dot" />
                          <div>
                            <strong>{activity.action}</strong>
                            <span>{activity.module_name}</span>
                          </div>
                          <small>{new Date(activity.created_at).toLocaleDateString()}</small>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">No recent activity yet.</p>
                    )}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="card-header">
                    <h3>Expense Categories</h3>
                  </div>
                  <div className="mini-list">
                    {Object.entries(dashboard.categoryTotals || {}).length ? (
                      Object.entries(dashboard.categoryTotals).map(([key, value], index) => (
                        <div className="mini-row" key={key}>
                          <span className="legend-dot" style={{ background: THEME_COLORS[index % THEME_COLORS.length] }} />
                          <span>{key}</span>
                          <strong>{formatMoney(value)}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">No expenses recorded</p>
                    )}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="card-header">
                    <h3>Top Expenses</h3>
                  </div>
                  <div className="mini-list">
                    {expenses.slice(0, 5).map((expense) => (
                      <div className="mini-row" key={expense.id}>
                        <span>{expense.category || 'Expense'}</span>
                        <strong>{formatMoney(expense.amount)}</strong>
                      </div>
                    ))}
                    {!expenses.length ? <p className="empty-text">No expenses recorded</p> : null}
                  </div>
                </div>
              </div>

              <div className="panel-card full-width-card">
                <div className="card-header">
                  <h3>Monthly Expense Trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyExpenseData}>
                    <defs>
                      <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="url(#expenseFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {selectedModule === 'Projects' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Projects</p>
                  <h2>Project portfolio</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setProjectEditingId(null); setProjectForm(defaultProjectForm); openForm('Projects'); }}><Plus size={16} /> Add Project</button>
              </div>

              <div className={`panel-card form-panel ${isFormOpen('Projects') ? 'form-open' : ''}`}>
                <h3>{projectEditingId ? 'Edit Project' : 'Create Project'}</h3>
                <form className="erp-form" onSubmit={handleProjectSubmit}>
                  <div className="form-grid two-col">
                    <input value={projectForm.project_id} onChange={(event) => setProjectForm({ ...projectForm, project_id: event.target.value })} placeholder="Project ID" />
                    <input value={projectForm.project_name} onChange={(event) => setProjectForm({ ...projectForm, project_name: event.target.value })} placeholder="Project Name" required />
                    <input value={projectForm.client_name} onChange={(event) => setProjectForm({ ...projectForm, client_name: event.target.value })} placeholder="Client Name" />
                    <input value={projectForm.client_contact} onChange={(event) => setProjectForm({ ...projectForm, client_contact: event.target.value })} placeholder="Client Contact" />
                    <input value={projectForm.project_type} onChange={(event) => setProjectForm({ ...projectForm, project_type: event.target.value })} placeholder="Project Type" />
                    <input value={projectForm.location} onChange={(event) => setProjectForm({ ...projectForm, location: event.target.value })} placeholder="Location" />
                    <input type="date" value={projectForm.start_date} onChange={(event) => setProjectForm({ ...projectForm, start_date: event.target.value })} />
                    <input type="date" value={projectForm.expected_end_date} onChange={(event) => setProjectForm({ ...projectForm, expected_end_date: event.target.value })} />
                    <input type="number" value={projectForm.budget} onChange={(event) => setProjectForm({ ...projectForm, budget: event.target.value })} placeholder="Budget" />
                    <input type="number" value={projectForm.actual_cost} onChange={(event) => setProjectForm({ ...projectForm, actual_cost: event.target.value })} placeholder="Actual Cost" />
                    <input type="number" value={projectForm.progress} onChange={(event) => setProjectForm({ ...projectForm, progress: event.target.value })} placeholder="Progress %" />
                    <input value={projectForm.project_manager} onChange={(event) => setProjectForm({ ...projectForm, project_manager: event.target.value })} placeholder="Project Manager" />
                    <select value={projectForm.status} onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}>
                      <option value="Planning">Planning</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} placeholder="Description" className="full-span" rows="3" />
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{projectEditingId ? 'Update Project' : 'Save Project'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setProjectEditingId(null); setProjectForm(defaultProjectForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {projects.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Budget</th>
                        <th>Progress</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td>{project.project_name}</td>
                          <td>{project.client_name}</td>
                          <td><span className="status-badge">{project.status}</span></td>
                          <td>{formatMoney(project.budget)}</td>
                          <td>{project.progress || 0}%</td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setProjectEditingId(project.id); setProjectForm({ ...defaultProjectForm, ...project, project_name: project.project_name, budget: project.budget ?? '', actual_cost: project.actual_cost ?? '', progress: project.progress ?? '' }); openForm('Projects'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deleteProject(project.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <HardHat size={36} />
                    <h3>No projects found</h3>
                    <p>Create your first construction project to start managing progress, budgets and site operations.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Site Management' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Site Management</p>
                  <h2>Construction sites</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setSiteForm(defaultSiteForm); openForm('Site Management'); }}><Plus size={16} /> Add Site</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Site Management') ? 'form-open' : ''}`}>
                <h3>Add Site</h3>
                <form className="erp-form" onSubmit={handleSiteSubmit}>
                  <div className="form-grid two-col">
                    <input value={siteForm.site_name} onChange={(event) => setSiteForm({ ...siteForm, site_name: event.target.value })} placeholder="Site Name" required />
                    <input value={siteForm.supervisor} onChange={(event) => setSiteForm({ ...siteForm, supervisor: event.target.value })} placeholder="Site Supervisor" />
                    <input value={siteForm.engineer} onChange={(event) => setSiteForm({ ...siteForm, engineer: event.target.value })} placeholder="Site Engineer" />
                    <input type="number" value={siteForm.workers} onChange={(event) => setSiteForm({ ...siteForm, workers: event.target.value })} placeholder="Workers" />
                    <input value={siteForm.location} onChange={(event) => setSiteForm({ ...siteForm, location: event.target.value })} placeholder="Location" />
                    <select value={siteForm.status} onChange={(event) => setSiteForm({ ...siteForm, status: event.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">Save Site</button>
                    <button type="button" className="secondary-btn" onClick={() => setActiveForm(null)}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {sites.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Supervisor</th>
                        <th>Engineer</th>
                        <th>Workers</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((site) => (
                        <tr key={site.id}>
                          <td>{site.site_name}</td>
                          <td>{site.supervisor}</td>
                          <td>{site.engineer}</td>
                          <td>{site.workers}</td>
                          <td><span className="status-badge">{site.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <Building2 size={36} />
                    <h3>No sites added</h3>
                    <p>Create your first site to track supervisors, engineering teams, staffing and progress.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Employees' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Employees</p>
                  <h2>Team directory</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setEmployeeEditingId(null); setEmployeeForm(defaultEmployeeForm); openForm('Employees'); }}><Plus size={16} /> Add Employee</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Employees') ? 'form-open' : ''}`}>
                <h3>{employeeEditingId ? 'Edit Employee' : 'Add Employee'}</h3>
                <form className="erp-form" onSubmit={handleEmployeeSubmit}>
                  <div className="form-grid two-col">
                    <input value={employeeForm.employee_id} onChange={(event) => setEmployeeForm({ ...employeeForm, employee_id: event.target.value })} placeholder="Employee ID" />
                    <input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} placeholder="Name" required />
                    <input value={employeeForm.father_name} onChange={(event) => setEmployeeForm({ ...employeeForm, father_name: event.target.value })} placeholder="Father Name" />
                    <input value={employeeForm.cnic} onChange={(event) => setEmployeeForm({ ...employeeForm, cnic: event.target.value })} placeholder="CNIC" />
                    <input value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} placeholder="Phone" />
                    <input type="email" value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} placeholder="Email" />
                    <input value={employeeForm.department} onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })} placeholder="Department" />
                    <input value={employeeForm.designation} onChange={(event) => setEmployeeForm({ ...employeeForm, designation: event.target.value })} placeholder="Designation" />
                    <input type="date" value={employeeForm.joining_date} onChange={(event) => setEmployeeForm({ ...employeeForm, joining_date: event.target.value })} />
                    <input type="number" value={employeeForm.salary} onChange={(event) => setEmployeeForm({ ...employeeForm, salary: event.target.value })} placeholder="Salary" />
                    <select value={employeeForm.employment_type} onChange={(event) => setEmployeeForm({ ...employeeForm, employment_type: event.target.value })}>
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                      <option value="Daily Wage">Daily Wage</option>
                    </select>
                    <select value={employeeForm.status} onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                    <textarea value={employeeForm.address} onChange={(event) => setEmployeeForm({ ...employeeForm, address: event.target.value })} placeholder="Address" className="full-span" rows="3" />
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{employeeEditingId ? 'Update Employee' : 'Save Employee'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setEmployeeEditingId(null); setEmployeeForm(defaultEmployeeForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {employees.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Designation</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td>{employee.name}</td>
                          <td>{employee.department}</td>
                          <td>{employee.designation}</td>
                          <td>{employee.phone}</td>
                          <td><span className="status-badge">{employee.status}</span></td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setEmployeeEditingId(employee.id); setEmployeeForm({ ...defaultEmployeeForm, ...employee, father_name: employee.father_name || '', phone: employee.phone || '' }); openForm('Employees'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deleteEmployee(employee.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <Users size={36} />
                    <h3>No employees added</h3>
                    <p>Add team members and manage departments, payroll and attendance from one workspace.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Inventory' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Inventory</p>
                  <h2>Material stock</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setInventoryEditingId(null); setInventoryForm(defaultInventoryForm); openForm('Inventory'); }}><Plus size={16} /> Add Item</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Inventory') ? 'form-open' : ''}`}>
                <h3>{inventoryEditingId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
                <form className="erp-form" onSubmit={handleInventorySubmit}>
                  <div className="form-grid two-col">
                    <input value={inventoryForm.item_id} onChange={(event) => setInventoryForm({ ...inventoryForm, item_id: event.target.value })} placeholder="Item ID" />
                    <input value={inventoryForm.item_name} onChange={(event) => setInventoryForm({ ...inventoryForm, item_name: event.target.value })} placeholder="Item Name" required />
                    <input value={inventoryForm.category} onChange={(event) => setInventoryForm({ ...inventoryForm, category: event.target.value })} placeholder="Category" />
                    <input value={inventoryForm.unit} onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })} placeholder="Unit" />
                    <input type="number" value={inventoryForm.quantity} onChange={(event) => setInventoryForm({ ...inventoryForm, quantity: event.target.value })} placeholder="Quantity" />
                    <input type="number" value={inventoryForm.minimum_stock} onChange={(event) => setInventoryForm({ ...inventoryForm, minimum_stock: event.target.value })} placeholder="Minimum Stock" />
                    <input type="number" value={inventoryForm.purchase_price} onChange={(event) => setInventoryForm({ ...inventoryForm, purchase_price: event.target.value })} placeholder="Purchase Price" />
                    <input value={inventoryForm.supplier} onChange={(event) => setInventoryForm({ ...inventoryForm, supplier: event.target.value })} placeholder="Supplier" />
                    <input value={inventoryForm.warehouse} onChange={(event) => setInventoryForm({ ...inventoryForm, warehouse: event.target.value })} placeholder="Warehouse" />
                    <select value={inventoryForm.status} onChange={(event) => setInventoryForm({ ...inventoryForm, status: event.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{inventoryEditingId ? 'Update Item' : 'Save Item'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setInventoryEditingId(null); setInventoryForm(defaultInventoryForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {inventory.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Qty</th>
                        <th>Warehouse</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id}>
                          <td>{item.item_name}</td>
                          <td>{item.category}</td>
                          <td>{item.quantity}</td>
                          <td>{item.warehouse}</td>
                          <td><span className="status-badge">{item.status}</span></td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setInventoryEditingId(item.id); setInventoryForm({ ...defaultInventoryForm, ...item, minimum_stock: item.minimum_stock || '', purchase_price: item.purchase_price || '', quantity: item.quantity || '' }); openForm('Inventory'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deleteInventory(item.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <Warehouse size={36} />
                    <h3>No inventory items</h3>
                    <p>Add materials, track stock and monitor low inventory levels automatically.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Equipment' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Equipment</p>
                  <h2>Fleet and machinery</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setEquipmentEditingId(null); setEquipmentForm(defaultEquipmentForm); openForm('Equipment'); }}><Plus size={16} /> Add Equipment</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Equipment') ? 'form-open' : ''}`}>
                <h3>{equipmentEditingId ? 'Edit Equipment' : 'Add Equipment'}</h3>
                <form className="erp-form" onSubmit={handleEquipmentSubmit}>
                  <div className="form-grid two-col">
                    <input value={equipmentForm.equipment_id} onChange={(event) => setEquipmentForm({ ...equipmentForm, equipment_id: event.target.value })} placeholder="Equipment ID" />
                    <input value={equipmentForm.equipment_name} onChange={(event) => setEquipmentForm({ ...equipmentForm, equipment_name: event.target.value })} placeholder="Equipment Name" required />
                    <input value={equipmentForm.category} onChange={(event) => setEquipmentForm({ ...equipmentForm, category: event.target.value })} placeholder="Category" />
                    <input value={equipmentForm.model} onChange={(event) => setEquipmentForm({ ...equipmentForm, model: event.target.value })} placeholder="Model" />
                    <input value={equipmentForm.registration_number} onChange={(event) => setEquipmentForm({ ...equipmentForm, registration_number: event.target.value })} placeholder="Registration Number" />
                    <input type="date" value={equipmentForm.purchase_date} onChange={(event) => setEquipmentForm({ ...equipmentForm, purchase_date: event.target.value })} />
                    <input type="number" value={equipmentForm.purchase_cost} onChange={(event) => setEquipmentForm({ ...equipmentForm, purchase_cost: event.target.value })} placeholder="Purchase Cost" />
                    <input type="number" value={equipmentForm.current_value} onChange={(event) => setEquipmentForm({ ...equipmentForm, current_value: event.target.value })} placeholder="Current Value" />
                    <input value={equipmentForm.location} onChange={(event) => setEquipmentForm({ ...equipmentForm, location: event.target.value })} placeholder="Location" />
                    <input value={equipmentForm.assigned_project} onChange={(event) => setEquipmentForm({ ...equipmentForm, assigned_project: event.target.value })} placeholder="Assigned Project" />
                    <input value={equipmentForm.operator} onChange={(event) => setEquipmentForm({ ...equipmentForm, operator: event.target.value })} placeholder="Operator" />
                    <select value={equipmentForm.status} onChange={(event) => setEquipmentForm({ ...equipmentForm, status: event.target.value })}>
                      <option value="Available">Available</option>
                      <option value="In Use">In Use</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                    <input type="date" value={equipmentForm.maintenance_date} onChange={(event) => setEquipmentForm({ ...equipmentForm, maintenance_date: event.target.value })} />
                    <input type="date" value={equipmentForm.next_maintenance_date} onChange={(event) => setEquipmentForm({ ...equipmentForm, next_maintenance_date: event.target.value })} />
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{equipmentEditingId ? 'Update Equipment' : 'Save Equipment'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setEquipmentEditingId(null); setEquipmentForm(defaultEquipmentForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {equipment.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Equipment</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((asset) => (
                        <tr key={asset.id}>
                          <td>{asset.equipment_name}</td>
                          <td>{asset.category}</td>
                          <td><span className="status-badge">{asset.status}</span></td>
                          <td>{asset.location}</td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setEquipmentEditingId(asset.id); setEquipmentForm({ ...defaultEquipmentForm, ...asset }); openForm('Equipment'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deleteEquipment(asset.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <Wrench size={36} />
                    <h3>No equipment registered</h3>
                    <p>Start by registering key construction equipment and maintenance schedules.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Expenses' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Expenses</p>
                  <h2>Expense control</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setExpenseEditingId(null); setExpenseForm(defaultExpenseForm); openForm('Expenses'); }}><Plus size={16} /> Add Expense</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Expenses') ? 'form-open' : ''}`}>
                <h3>{expenseEditingId ? 'Edit Expense' : 'Add Expense'}</h3>
                <form className="erp-form" onSubmit={handleExpenseSubmit}>
                  <div className="form-grid two-col">
                    <input value={expenseForm.expense_id} onChange={(event) => setExpenseForm({ ...expenseForm, expense_id: event.target.value })} placeholder="Expense ID" />
                    <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} />
                    <input value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} placeholder="Category" />
                    <input value={expenseForm.project} onChange={(event) => setExpenseForm({ ...expenseForm, project: event.target.value })} placeholder="Project" />
                    <input value={expenseForm.site} onChange={(event) => setExpenseForm({ ...expenseForm, site: event.target.value })} placeholder="Site" />
                    <input value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="Description" />
                    <input type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="Amount" />
                    <input value={expenseForm.payment_method} onChange={(event) => setExpenseForm({ ...expenseForm, payment_method: event.target.value })} placeholder="Payment Method" />
                    <input value={expenseForm.paid_by} onChange={(event) => setExpenseForm({ ...expenseForm, paid_by: event.target.value })} placeholder="Paid By" />
                    <input value={expenseForm.reference_number} onChange={(event) => setExpenseForm({ ...expenseForm, reference_number: event.target.value })} placeholder="Reference Number" />
                    <select value={expenseForm.status} onChange={(event) => setExpenseForm({ ...expenseForm, status: event.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Paid">Paid</option>
                    </select>
                    <textarea value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} placeholder="Notes" rows="3" className="full-span" />
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{expenseEditingId ? 'Update Expense' : 'Save Expense'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setExpenseEditingId(null); setExpenseForm(defaultExpenseForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {expenses.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Project</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.category}</td>
                          <td>{expense.project}</td>
                          <td>{expense.date}</td>
                          <td>{formatMoney(expense.amount)}</td>
                          <td><span className="status-badge">{expense.status}</span></td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setExpenseEditingId(expense.id); setExpenseForm({ ...defaultExpenseForm, ...expense }); openForm('Expenses'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deleteExpense(expense.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <ReceiptOutline size={36} />
                    <h3>No expenses recorded</h3>
                    <p>Track labor, materials, maintenance and subcontractor costs with live expense reporting.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'HR & Payroll' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">HR & Payroll</p>
                  <h2>Payroll overview</h2>
                </div>
              </div>

              <div className="stats-grid">
                <StatCard title="Total Payroll" value={formatMoney(payrollRows.reduce((sum, row) => sum + Number(row.salary || 0), 0))} subtitle="Current month payroll" tone="purple" icon={<BriefcaseBusiness size={18} />} />
                <StatCard title="Active Staff" value={payrollRows.filter((item) => item.status === 'Active').length} subtitle="Currently on payroll" tone="green" icon={<Users size={18} />} />
                <StatCard title="Overtime" value={formatMoney(payrollRows.reduce((sum, row) => sum + Number(row.overtime || 0), 0))} subtitle="Additional labor cost" tone="orange" icon={<ClockIcon />} />
                <StatCard title="Deductions" value={formatMoney(payrollRows.reduce((sum, row) => sum + Number(row.deductions || 0), 0))} subtitle="Net adjustments" tone="red" icon={<ShieldCheck size={18} />} />
              </div>

              <div className="panel-card table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Salary</th>
                      <th>Overtime</th>
                      <th>Deductions</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.department}</td>
                        <td>{formatMoney(row.salary)}</td>
                        <td>{formatMoney(row.overtime)}</td>
                        <td>{formatMoney(row.deductions)}</td>
                        <td><span className="status-badge">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {selectedModule === 'Purchases' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Purchases</p>
                  <h2>Procurement register</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setPurchaseEditingId(null); setPurchaseForm(defaultPurchaseForm); openForm('Purchases'); }}><Plus size={16} /> Add Purchase</button>
              </div>

              <div className={`panel-card form-panel ${isFormOpen('Purchases') ? 'form-open' : ''}`}>
                <h3>{purchaseEditingId ? 'Edit Purchase' : 'Add Purchase'}</h3>
                <form className="erp-form" onSubmit={handlePurchaseSubmit}>
                  <div className="form-grid two-col">
                    <input value={purchaseForm.purchase_id} onChange={(event) => setPurchaseForm({ ...purchaseForm, purchase_id: event.target.value })} placeholder="Purchase ID" />
                    <input value={purchaseForm.supplier} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })} placeholder="Supplier" />
                    <input value={purchaseForm.project} onChange={(event) => setPurchaseForm({ ...purchaseForm, project: event.target.value })} placeholder="Project" />
                    <input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} />
                    <input value={purchaseForm.items} onChange={(event) => setPurchaseForm({ ...purchaseForm, items: event.target.value })} placeholder="Items" />
                    <input type="number" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} placeholder="Quantity" />
                    <input type="number" value={purchaseForm.unit_price} onChange={(event) => setPurchaseForm({ ...purchaseForm, unit_price: event.target.value })} placeholder="Unit Price" />
                    <input type="number" value={purchaseForm.tax} onChange={(event) => setPurchaseForm({ ...purchaseForm, tax: event.target.value })} placeholder="Tax" />
                    <input type="number" value={purchaseForm.discount} onChange={(event) => setPurchaseForm({ ...purchaseForm, discount: event.target.value })} placeholder="Discount" />
                    <input type="number" value={purchaseForm.total_amount} onChange={(event) => setPurchaseForm({ ...purchaseForm, total_amount: event.target.value })} placeholder="Total Amount" />
                    <select value={purchaseForm.payment_status} onChange={(event) => setPurchaseForm({ ...purchaseForm, payment_status: event.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{purchaseEditingId ? 'Update Purchase' : 'Save Purchase'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setPurchaseEditingId(null); setPurchaseForm(defaultPurchaseForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {purchases.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Items</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td>{purchase.supplier}</td>
                          <td>{purchase.items}</td>
                          <td>{purchase.date}</td>
                          <td>{formatMoney(purchase.total_amount)}</td>
                          <td><span className="status-badge">{purchase.payment_status}</span></td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setPurchaseEditingId(purchase.id); setPurchaseForm({ ...defaultPurchaseForm, ...purchase }); openForm('Purchases'); }}><Pencil size={14} /></button>
                            <button type="button" className="table-action danger" onClick={() => deletePurchase(purchase.id)}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <ShoppingCart size={36} />
                    <h3>No purchases recorded</h3>
                    <p>Track material orders and supplier payments in one place.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Sales & Contracts' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Sales & Contracts</p>
                  <h2>Contracts pipeline</h2>
                </div>
                <button type="button" className="primary-btn" onClick={() => { setContractEditingId(null); setContractForm(defaultContractForm); openForm('Sales & Contracts'); }}><Plus size={16} /> Add Contract</button>
              </div>
              <div className={`panel-card form-panel ${isFormOpen('Sales & Contracts') ? 'form-open' : ''}`}>
                <h3>{contractEditingId ? 'Edit Contract' : 'Add Contract'}</h3>
                <form className="erp-form" onSubmit={handleContractSubmit}>
                  <div className="form-grid two-col">
                    <input value={contractForm.contract_id} onChange={(event) => setContractForm({ ...contractForm, contract_id: event.target.value })} placeholder="Contract ID" />
                    <input value={contractForm.client} onChange={(event) => setContractForm({ ...contractForm, client: event.target.value })} placeholder="Client" />
                    <input value={contractForm.project} onChange={(event) => setContractForm({ ...contractForm, project: event.target.value })} placeholder="Project" />
                    <input type="date" value={contractForm.contract_date} onChange={(event) => setContractForm({ ...contractForm, contract_date: event.target.value })} />
                    <input type="number" value={contractForm.contract_value} onChange={(event) => setContractForm({ ...contractForm, contract_value: event.target.value })} placeholder="Contract Value" />
                    <input type="date" value={contractForm.start_date} onChange={(event) => setContractForm({ ...contractForm, start_date: event.target.value })} />
                    <input type="date" value={contractForm.end_date} onChange={(event) => setContractForm({ ...contractForm, end_date: event.target.value })} />
                    <input value={contractForm.payment_terms} onChange={(event) => setContractForm({ ...contractForm, payment_terms: event.target.value })} placeholder="Payment Terms" />
                    <select value={contractForm.status} onChange={(event) => setContractForm({ ...contractForm, status: event.target.value })}>
                      <option value="Draft">Draft</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <textarea value={contractForm.notes} onChange={(event) => setContractForm({ ...contractForm, notes: event.target.value })} placeholder="Notes" rows="3" className="full-span" />
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-btn">{contractEditingId ? 'Update Contract' : 'Save Contract'}</button>
                    <button type="button" className="secondary-btn" onClick={() => { setContractEditingId(null); setContractForm(defaultContractForm); setActiveForm(null); }}>Cancel</button>
                  </div>
                </form>
              </div>

              <div className="panel-card table-panel">
                {contracts.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Project</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract) => (
                        <tr key={contract.id}>
                          <td>{contract.client}</td>
                          <td>{contract.project}</td>
                          <td>{formatMoney(contract.contract_value)}</td>
                          <td><span className="status-badge">{contract.status}</span></td>
                          <td className="action-cell">
                            <button type="button" className="table-action" onClick={() => { setContractEditingId(contract.id); setContractForm({ ...defaultContractForm, ...contract }); openForm('Sales & Contracts'); }}><Pencil size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <FileText size={36} />
                    <h3>No contracts yet</h3>
                    <p>Create your first contract and track project revenue, delivery dates and status.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {selectedModule === 'Reports' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Owner Reports</p>
                  <h2>Executive reporting</h2>
                </div>
              </div>

              {!reportsUnlocked ? (
                <div className="panel-card pin-panel">
                  <h3>Owner verification required</h3>
                  <form onSubmit={handleReportsUnlock} className="pin-form compact-pin">
                    <div className="pin-input-row">
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        value={reportsPin}
                        onChange={(event) => setReportsPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        aria-label="Four-digit owner PIN"
                        autoComplete="current-password"
                        className="pin-digit"
                        required
                      />
                    </div>
                    {reportsError ? <div className="form-error">{reportsError}</div> : null}
                    <button type="submit" className="primary-btn wide-btn">Unlock Reports</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="panel-card">
                    <div className="report-controls">
                      <select value={reportsFilter.type} onChange={(event) => setReportsFilter({ ...reportsFilter, type: event.target.value })}>
                        <option value="project">Project Report</option>
                        <option value="expense">Expense Report</option>
                        <option value="financial">Financial Report</option>
                        <option value="inventory">Inventory Report</option>
                        <option value="equipment">Equipment Report</option>
                        <option value="employee">Employee Report</option>
                        <option value="payroll">Payroll Report</option>
                        <option value="purchase">Purchase Report</option>
                        <option value="sales">Sales Report</option>
                      </select>
                      <input type="text" value={reportsFilter.project} onChange={(event) => setReportsFilter({ ...reportsFilter, project: event.target.value })} placeholder="Project filter" />
                      <input type="date" value={reportsFilter.startDate} onChange={(event) => setReportsFilter({ ...reportsFilter, startDate: event.target.value })} />
                      <input type="date" value={reportsFilter.endDate} onChange={(event) => setReportsFilter({ ...reportsFilter, endDate: event.target.value })} />
                    </div>
                  </div>

                  <div className="panel-card table-panel">
                    <div className="report-summary">
                      <div><label>Total records</label><strong>{reportsData.summary.totalRecords || 0}</strong></div>
                      <div><label>Total value</label><strong>{formatMoney(reportsData.summary.totalValue || 0)}</strong></div>
                    </div>

                    {reportsData.rows.length ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Record</th>
                            <th>Project</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportsData.rows.slice(0, 10).map((row, index) => (
                            <tr key={`${row.id || index}-${row.name || row.project || row.item_name}`}>
                              <td>{row.project_name || row.name || row.item_name || row.expense_id || row.contract_id || row.equipment_name || row.employee_id}</td>
                              <td>{row.project || row.location || row.department || row.category || 'N/A'}</td>
                              <td>{formatMoney(row.amount || row.contract_value || row.total_amount || row.budget || row.salary || row.current_value || row.quantity || 0)}</td>
                              <td><span className="status-badge">{row.status || 'Active'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-state">
                        <FileText size={36} />
                        <h3>No report rows found</h3>
                        <p>Records will appear here once projects, expenses or contracts are created.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {selectedModule === 'Settings' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Settings</p>
                  <h2>Company preferences</h2>
                </div>
              </div>

              <form className="panel-card settings-form" onSubmit={updateSettings}>
                <div className="form-grid two-col">
                  <input value={settings.companyName} onChange={(event) => setSettings({ ...settings, companyName: event.target.value })} placeholder="Company Name" />
                  <input value={settings.companyPhone} onChange={(event) => setSettings({ ...settings, companyPhone: event.target.value })} placeholder="Company Phone" />
                  <input type="email" value={settings.companyEmail} onChange={(event) => setSettings({ ...settings, companyEmail: event.target.value })} placeholder="Company Email" />
                  <input value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} placeholder="Currency" />
                  <input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} placeholder="Timezone" />
                  <input value={settings.dateFormat} onChange={(event) => setSettings({ ...settings, dateFormat: event.target.value })} placeholder="Date Format" />
                  <textarea value={settings.companyAddress} onChange={(event) => setSettings({ ...settings, companyAddress: event.target.value })} rows="3" className="full-span" placeholder="Company Address" />
                </div>
                <div className="button-row">
                  <button type="submit" className="primary-btn">Save Settings</button>
                </div>
              </form>

              <form className="panel-card settings-form pin-change-form" onSubmit={changePin}>
                <div>
                  <h3>Change ERP PIN</h3>
                  <p>Use a four-digit PIN to unlock the ERP.</p>
                </div>
                <div className="form-grid two-col">
                  <label>Current PIN
                    <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pinChange.currentPin} onChange={(event) => setPinChange({ ...pinChange, currentPin: event.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="current-password" required />
                  </label>
                  <label>New PIN
                    <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pinChange.newPin} onChange={(event) => setPinChange({ ...pinChange, newPin: event.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="new-password" required />
                  </label>
                  <label>Confirm New PIN
                    <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pinChange.confirmPin} onChange={(event) => setPinChange({ ...pinChange, confirmPin: event.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="new-password" required />
                  </label>
                </div>
                <div className="button-row">
                  <button type="submit" className="primary-btn">Update PIN</button>
                </div>
              </form>
            </div>
          ) : null}

          {selectedModule === 'Finance' ? (
            <div className="module-shell">
              <div className="module-header">
                <div>
                  <p className="eyebrow">Finance</p>
                  <h2>Financial overview</h2>
                </div>
              </div>
              <div className="stats-grid">
                <StatCard title="Total Income" value={formatMoney(dashboard.kpis.totalRevenue)} subtitle="Contract and project pipeline" tone="purple" icon={<CircleDollarSign size={18} />} />
                <StatCard title="Total Expenses" value={formatMoney(dashboard.kpis.totalExpenses)} subtitle="Operating costs" tone="orange" icon={<ReceiptOutline size={18} />} />
                <StatCard title="Net Profit" value={formatMoney(dashboard.kpis.netProfit)} subtitle="Actual performance" tone="green" icon={<ShieldCheck size={18} />} />
                <StatCard title="Outstanding Receivables" value={formatMoney(dashboard.kpis.pendingPayments)} subtitle="Due across projects" tone="red" icon={<ShoppingCart size={18} />} />
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, tone, icon }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-body">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

export default App;
