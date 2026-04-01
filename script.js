class EmployeeManager {
    constructor() {
        this.employees = JSON.parse(localStorage.getItem('employees')) || [];
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.bindEvents();
        this.renderStats();
        this.renderEmployees();
    }

    bindEvents() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Form
        document.getElementById('employeeForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('addSampleBtn').addEventListener('click', () => this.addSampleEmployee());

        // Search & Filter
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchEmployees(e.target.value));
        document.getElementById('deptFilter').addEventListener('change', (e) => this.filterByDept(e.target.value));

        // CSV Upload
        document.getElementById('csvFile').addEventListener('change', (e) => this.handleCsvSelect(e));
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadCsv());
    }

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        if (password === 'admin123') {
            document.getElementById('loginSection').classList.remove('active');
            document.getElementById('dashboardSection').classList.add('active');
            this.showMessage('✅ Login successful!', 'success');
        } else {
            this.showMessage('❌ Invalid password!', 'error');
        }
    }

    logout() {
        document.getElementById('dashboardSection').classList.remove('active');
        document.getElementById('loginSection').classList.add('active');
        document.getElementById('employeeForm').reset();
        document.getElementById('password').value = '';
    }

    handleSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;

        const employee = {
            id: Date.now().toString(),
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            department: document.getElementById('department').value || '',
            manager: document.getElementById('manager').value.trim()
        };

        // Apply relationship mapping
        this.applyRelationshipMapping(employee);

        if (document.getElementById('editId').value) {
            const id = document.getElementById('editId').value;
            const index = this.employees.findIndex(emp => emp.id === id);
            this.employees[index] = { ...this.employees[index], ...employee };
            this.showMessage('✅ Employee updated!', 'success');
        } else {
            this.employees.unshift(employee);
            this.showMessage('✅ Employee added!', 'success');
        }

        this.saveData();
        this.resetForm();
        this.renderEmployees();
        this.renderStats();
    }

    validateForm() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!name) return this.showMessage('Name required', 'error'), false;
        if (!email || !email.includes('@')) return this.showMessage('Valid email required', 'error'), false;
        if (this.employees.find(emp => emp.email === email && emp.id !== document.getElementById('editId').value)) {
            return this.showMessage('Email already exists', 'error'), false;
        }
        return true;
    }

    applyRelationshipMapping(employee) {
        // Department normalization
        const dept = employee.department.toUpperCase().trim();
        if (dept === 'IT') employee.department = 'IT';
        else if (dept === 'HR') employee.department = 'HR';
        else if (dept === 'FINANCE') employee.department = 'Finance';
        else if (dept === 'MARKETING') employee.department = 'Marketing';
        else employee.department = 'General';

        // Manager linking (dot walking)
        if (employee.manager) {
            const manager = this.employees.find(emp => emp.name.toLowerCase() === employee.manager.toLowerCase());
            if (manager) {
                employee.managerLinked = manager.id;
                employee.manager = manager.name;
                this.showMessage(`🔗 Linked to manager: ${manager.name}`, 'success');
            }
        }
    }

    addSampleEmployee() {
        const sample = {
            id: Date.now().toString(),
            name: `Sample Employee ${this.employees.length + 1}`,
            email: `sample${this.employees.length + 1}@company.com`,
            phone: '',
            department: 'IT',
            manager: ''
        };
        this.applyRelationshipMapping(sample);
        this.employees.unshift(sample);
        this.saveData();
        this.renderEmployees();
        this.renderStats();
        this.showMessage('📝 Sample employee added', 'success');
    }

    editEmployee(id) {
        const emp = this.employees.find(e => e.id === id);
        if (emp) {
            document.getElementById('editId').value = id;
            document.getElementById('name').value = emp.name;
            document.getElementById('email').value = emp.email;
            document.getElementById('phone').value = emp.phone;
            document.getElementById('department').value = emp.department;
            document.getElementById('manager').value = emp.manager;
            document.getElementById('formTitle').textContent = '✏️ Edit Employee';
            document.getElementById('submitBtn').textContent = 'Update Employee';
            document.getElementById('cancelBtn').style.display = 'inline-block';
            document.getElementById('name').focus();
        }
    }

    deleteEmployee(id) {
        if (confirm('Delete this employee?')) {
            this.employees = this.employees.filter(e => e.id !== id);
            this.saveData();
            this.renderEmployees();
            this.renderStats();
            this.showMessage('🗑️ Employee deleted', 'success');
        }
    }

    cancelEdit() {
        this.resetForm();
    }

    resetForm() {
        document.getElementById('employeeForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('formTitle').textContent = '➕ Add Employee';
        document.getElementById('submitBtn').textContent = 'Add Employee';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    handleCsvSelect(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('uploadBtn').disabled = false;
            document.getElementById('uploadBtn').textContent = `Import ${file.name}`;
        }
    }

    async uploadCsv() {
        const file = document.getElementById('csvFile').files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const imported = this.parseCsv(csv);
            imported.forEach(emp => this.applyRelationshipMapping(emp));
            this.employees.push(...imported);
            this.saveData();
            this.renderEmployees();
            this.renderStats();
            document.getElementById('csvFile').value = '';
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('uploadBtn').textContent = 'Import CSV';
            this.showMessage(`✅ Imported ${imported.length} employees`, 'success');
        };
        reader.readAsText(file);
    }

    parseCsv(csv) {
        const lines = csv.trim().split('\n').slice(1);
        return lines.map(line => {
            const [name, email, phone, dept, manager] = line.split(',').map(s => s.trim().replace(/['"]/g, ''));
            return {
                id: Date.now().toString() + Math.random(),
                name: name || 'Unknown',
                email: email || '',
                phone: phone || '',
                department: dept || '',
                manager: manager || ''
            };
        }).filter(emp => emp.name && emp.email);
    }

    searchEmployees(query) {
        this.renderEmployees(query);
    }

    filterByDept(dept) {
        const input = document.getElementById('searchInput');
        this.renderEmployees(input.value, dept);
    }

    renderEmployees(query = '', deptFilter = '') {
        let data = [...this.employees];
        
        if (query) {
            query = query.toLowerCase();
            data = data.filter(emp => 
                emp.name.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query) ||
                emp.department.toLowerCase().includes(query) ||
                emp.manager.toLowerCase().includes(query)
            );
        }
        
        if (deptFilter) {
            data = data.filter(emp => emp.department === deptFilter);
        }

        const tbody = document.getElementById('employeesTableBody');
        const totalCount = document.getElementById('totalCount');
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text-light);">No employees found</td></tr>';
        } else {
            tbody.innerHTML = data.map(emp => `
                <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '-'}</td>
                    <td>
                        <span class="dept-badge dept-${emp.department.toLowerCase()}">${emp.department || 'General'}</span>
                    </td>
                    <td>${emp.manager || '-'}</td>
                    <td class="actions">
                        <button onclick="employeeManager.editEmployee('${emp.id}')" title="Edit">✏️</button>
                        <button onclick="employeeManager.deleteEmployee('${emp.id}')" title="Delete">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }
        
        totalCount.textContent = data.length;
        this.renderStats();
    }

    renderStats() {
        const stats = document.getElementById('stats');
        const total = this.employees.length;
        const depts = {};
        const managers = new Set();
        
        this.employees.forEach(emp => {
            depts[emp.department] = (depts[emp.department] || 0) + 1;
            if (emp.manager) managers.add(emp.manager);
        });

        stats.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${total}</div>
                <div>Total Employees</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(depts).length}</div>
                <div>Departments</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${managers.size}</div>
                <div>Managers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.employees.filter(e => e.managerLinked).length}</div>
                <div>Linked Reports</div>
            </div>
        `;
    }

    saveData() {
        localStorage.setItem('employees', JSON.stringify(this.employees));
    }

    showMessage(text, type = 'info') {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.className = `message ${type} show`;
        setTimeout(() => msg.classList.remove('show'), 4000);
    }
}

// Global functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app
const employeeManager = new EmployeeManager();

// Sample data on first load
if (employeeManager.employees.length === 0) {
    const sampleData = [
        {name: 'John Doe', email: 'john@company.com', phone: '123-456-7890', department: 'IT', manager: ''},
        {name: 'Jane Smith', email: 'jane@company.com', phone: '098-765-4321', department: 'HR', manager: 'John Doe'},
        {name: 'Bob Johnson', email: 'bob@company.com', phone: '111-222-3333', department: 'IT', manager: 'John Doe'}
    ];
    sampleData.forEach(emp => {
        emp.id = Date.now().toString() + Math.random();
        employeeManager.applyRelationshipMapping(emp);
        employeeManager.employees.push(emp);
    });
    employeeManager.saveData();
    employeeManager.renderEmployees();
    employeeManager.renderStats();
}

