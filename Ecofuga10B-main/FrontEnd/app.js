/* app.js — EcoFugas (solo HTML/CSS/JS) ---------------------------------------
   - Persiste en localStorage (sin db.js).
   - Funciona con tu bienvenido.html (IDs existentes).
   - Soporta roles simples: s.role === 'admin' en localStorage.ecofuga_session.
   - Exportar a PDF es opcional (si no existe el botón o librerías, se omite).
-----------------------------------------------------------------------------*/

(function () {
  // ====== Utilidades de almacenamiento (localStorage) ======
  const DB_KEY = 'ecofuga_db';

  function initDB() {
    const exists = localStorage.getItem(DB_KEY);
    if (exists) return;

    // Si hay sesión, úsala; si no, crea una de demostración
    const s = getSession();
    const username = s?.username || 'Usuario';
    const role = s?.role || 'user';

    const demoUsers = [
      { id: 1, name: username, role },
      { id: 2, name: 'Técnico 1', role: 'user' },
      { id: 3, name: 'Técnico 2', role: 'user' }
    ];

    const today = new Date().toISOString().split('T')[0];

    const demoTasks = [
      {
        id: 1,
        title: 'Inspección de válvula principal',
        description: 'Revisar fugas en zona norte. Adjuntar evidencia.',
        assignedTo: 2,
        dueDate: today,
        status: 'pendiente',
        createdBy: 1,
        createdAt: today
      },
      {
        id: 2,
        title: 'Reparación de tubería en vestidores',
        description: 'Alta prioridad: presión inestable detectada.',
        assignedTo: 3,
        dueDate: today,
        status: 'en-progreso',
        createdBy: 1,
        createdAt: today
      },
      {
        id: 3,
        title: 'Cierre de reporte #1024',
        description: 'Verificar sellado y cerrar ticket.',
        assignedTo: 1,
        dueDate: today,
        status: 'completada',
        createdBy: 1,
        createdAt: today
      }
    ];

    const db = { users: demoUsers, tasks: demoTasks };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getDB() {
    try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); }
    catch { return { users: [], tasks: [] }; }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // ====== Sesión simple (compatible con tu script inline) ======
  function getSession() {
    try { return JSON.parse(localStorage.getItem('ecofuga_session') || 'null'); }
    catch { return null; }
  }

  function isAdminSession() {
    const s = getSession();
    if (!s) return false;
    // admin si trae role 'admin' o si el username es 'admin'
    const r = String(s.role || '').toLowerCase();
    const u = String(s.username || '').toLowerCase();
    return r === 'admin' || u === 'admin' || u === 'administrador';
  }

  // ====== DOM refs (luego de DOMContentLoaded) ======
  document.addEventListener('DOMContentLoaded', () => {
    initDB();

    const s = getSession();
    const admin = isAdminSession();

    // Referencias del HTML
    const usernameEl     = document.getElementById('username');
    const logoutBtn      = document.getElementById('logout');
    const newTaskBtn     = document.getElementById('new-task-btn');

    const filterUser     = document.getElementById('filter-user');
    const filterStatus   = document.getElementById('filter-status');
    const applyFilters   = document.getElementById('apply-filters');
    const exportPdfBtn   = document.getElementById('export-pdf-btn'); // opcional

    const tasksContainer = document.getElementById('tasks-container');

    // Modal y formulario
    const taskModal      = document.getElementById('task-modal');
    const modalContent   = document.querySelector('#task-modal .modal-content');
    const closeModalBtn  = document.querySelector('#task-modal .close');
    const taskForm       = document.getElementById('task-form');
    const deleteTaskBtn  = document.getElementById('delete-task');

    // Campos del form (IDs existentes en tu HTML)
    const fId        = document.getElementById('task-id');
    const fTitle     = document.getElementById('title');
    const fDesc      = document.getElementById('description');
    const fAssign    = document.getElementById('assigned-to');
    const fDue       = document.getElementById('due-date');
    const fStatus    = document.getElementById('status');
    const modalTitle = document.getElementById('modal-title');

    // Mostrar usuario en header (si tu script inline ya lo hace, esto no estorba)
    if (usernameEl && s?.username) usernameEl.textContent = s.username;

    // Mostrar/ocultar elementos según rol
    if (!admin && newTaskBtn) newTaskBtn.style.display = 'none';
    if (!admin && deleteTaskBtn) deleteTaskBtn.style.display = 'none';
    if (!admin && filterUser) filterUser.style.display = 'none';

    // ==== Cargar listas ====
    loadUsersToSelects();
    renderTasks(); // 1er render

    // ==== Listeners ====
    newTaskBtn?.addEventListener('click', openNewTaskModal);
    closeModalBtn?.addEventListener('click', closeTaskModal);
    taskForm?.addEventListener('submit', onSubmitTask);
    applyFilters?.addEventListener('click', renderTasks);
    logoutBtn?.addEventListener('click', handleLogout);

    // Delegación de clicks (editar/eliminar/estado rápido)
    document.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;

      // Click fuera del contenido para cerrar modal
      if (ev.target === taskModal) { closeTaskModal(); return; }

      const action = btn.dataset.action;
      if (!action) return;

      const card = btn.closest('[data-id]');
      const id = card ? Number(card.dataset.id) : null;

      if (action === 'edit' && id) {
        openEditModal(id);
      } else if (action === 'delete' && id && admin) {
        deleteTask(id);
      } else if (action === 'quick-status' && id && !admin) {
        // Solo usuarios no admin: cambio rápido de estado
        const next = prompt('Nuevo estado (pendiente | en-progreso | completada):', 'en-progreso');
        const valid = ['pendiente','en-progreso','completada'];
        if (next && valid.includes(next)) {
          const db = getDB();
          const idx = db.tasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            db.tasks[idx].status = next;
            saveDB(db);
            renderTasks();
          }
        } else if (next !== null) {
          alert('Estado no válido.');
        }
      }
    });

    // Exportar PDF (si el botón y las libs existen)
    if (exportPdfBtn && window.jspdf && window.jspdf.jsPDF) {
      exportPdfBtn.addEventListener('click', exportTasksToPDF);
    } else {
      // Si no quieres PDF, puedes eliminar el botón del HTML y esto no hará nada
    }

    // ==== Funciones ====

    function handleLogout() {
      localStorage.setItem('ecofuga_session', JSON.stringify({ logged: false, username: null, role: null }));
      window.location.href = 'auth.html';
    }

    function loadUsersToSelects() {
      const db = getDB();
      // Limpiar selects
      fAssign.innerHTML = '';
      if (filterUser) filterUser.innerHTML = '<option value="">Todos los usuarios</option>';

      db.users.forEach(u => {
        fAssign.add(new Option(u.name, u.id));
        if (filterUser && admin) filterUser.add(new Option(u.name, u.id));
      });
    }

    function renderTasks() {
      const db = getDB();
      const userF = filterUser?.value || '';
      const statusF = filterStatus?.value || '';

      // Si no es admin, solo ve sus tareas
      const viewer = db.users.find(u => u.name === (s?.username || 'Usuario')) || db.users[0];
      let list = db.tasks.slice();
      if (!admin) list = list.filter(t => Number(t.assignedTo) === Number(viewer?.id));

      // Filtros UI
      list = list.filter(t =>
        (!userF || String(t.assignedTo) === String(userF)) &&
        (!statusF || t.status === statusF)
      );

      if (!list.length) {
        tasksContainer.innerHTML = '<p class="no-tasks">No hay tareas que coincidan con los filtros.</p>';
        return;
      }

      tasksContainer.innerHTML = list.map(t => {
        const creator = db.users.find(u => u.id === t.createdBy)?.name || 'Desconocido';
        const assignee = db.users.find(u => u.id === t.assignedTo)?.name || 'Desconocido';

        return `
          <div class="task-card" data-id="${t.id}">
            <h3>${escapeHtml(t.title)}</h3>
            <p>${escapeHtml(t.description || 'Sin descripción')}</p>
            <div class="task-meta">
              <p><strong>Estado:</strong> <span class="status-${t.status}">${formatStatus(t.status)}</span></p>
              <p><strong>Asignada a:</strong> ${escapeHtml(assignee)}</p>
              <p><strong>Creada por:</strong> ${escapeHtml(creator)}</p>
              <p><strong>Fecha límite:</strong> ${escapeHtml(t.dueDate || 'No especificada')}</p>
            </div>
            <div class="task-actions">
              <button class="edit-btn" data-action="edit">Editar</button>
              ${admin ? '<button class="delete-btn" data-action="delete">Eliminar</button>' : ''}
              ${!admin ? '<button class="save-status-btn" data-action="quick-status">Actualizar estado</button>' : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    function openNewTaskModal() {
      modalTitle.textContent = 'Nueva Tarea';
      fId.value = '';
      taskForm.reset();
      fStatus.value = 'pendiente';

      // Permisos: admin edita todo; usuario no admin solo puede estatus (pero no ve botón "Nueva")
      setFormReadOnly(!admin);

      deleteTaskBtn.style.display = admin ? 'inline-block' : 'none';
      taskModal.style.display = 'block';
      modalContent.scrollTop = 0;
    }

    function openEditModal(taskId) {
      const db = getDB();
      const t = db.tasks.find(x => x.id === Number(taskId));
      if (!t) return;

      modalTitle.textContent = 'Editar Tarea';
      fId.value = t.id;
      fTitle.value = t.title;
      fDesc.value = t.description || '';
      fAssign.value = t.assignedTo;
      fDue.value = t.dueDate || '';
      fStatus.value = t.status;

      // Admin edita todo; usuario solo estado (coincide con tu bienvenido.html)
      setFormReadOnly(!admin);
      deleteTaskBtn.style.display = admin ? 'inline-block' : 'none';

      taskModal.style.display = 'block';
      modalContent.scrollTop = 0;
    }

    function closeTaskModal() {
      taskModal.style.display = 'none';
      modalContent.scrollTop = 0;
    }

    function setFormReadOnly(readOnlyNonStatus) {
      // Cuando readOnlyNonStatus = true => usuario NO admin: solo puede cambiar estado
      fTitle.readOnly  = readOnlyNonStatus;
      fDesc.readOnly   = readOnlyNonStatus;
      fDue.readOnly    = readOnlyNonStatus;
      fAssign.disabled = readOnlyNonStatus;
      // fStatus siempre editable (lo decide el servidor normalmente; aquí lo dejamos abierto)
    }

    function onSubmitTask(e) {
      e.preventDefault();

      const db = getDB();
      const idVal = Number(fId.value);
      const viewer = db.users.find(u => u.name === (s?.username || 'Usuario')) || db.users[0];

      const payload = {
        title: fTitle.value.trim(),
        description: fDesc.value.trim(),
        assignedTo: Number(fAssign.value),
        dueDate: fDue.value || null,
        status: fStatus.value
      };

      // Validación mínima
      if (!payload.title) { alert('El título es obligatorio.'); return; }
      if (!payload.assignedTo) { alert('Debes asignar la tarea.'); return; }

      if (!admin) {
        // Usuario no admin: solo puede cambiar estado de su propia tarea
        const idx = db.tasks.findIndex(t => t.id === idVal);
        if (idx !== -1) {
          // (opcional) Reforzar que sea su tarea:
          // if (Number(db.tasks[idx].assignedTo) !== Number(viewer.id)) return alert('No puedes editar esta tarea.');
          db.tasks[idx].status = payload.status;
          saveDB(db);
          closeTaskModal();
          renderTasks();
        }
        return;
      }

      if (idVal) {
        // Editar existente
        const idx = db.tasks.findIndex(t => t.id === idVal);
        if (idx !== -1) {
          db.tasks[idx] = { ...db.tasks[idx], ...payload };
        }
      } else {
        // Crear nueva (admin)
        const newId = db.tasks.length ? Math.max(...db.tasks.map(t => t.id)) + 1 : 1;
        db.tasks.push({
          id: newId,
          ...payload,
          createdBy: viewer?.id || 1,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }

      saveDB(db);
      closeTaskModal();
      renderTasks();
    }

    function deleteTask(taskId) {
      if (!admin) return;
      if (!confirm('¿Eliminar esta tarea?')) return;

      const db = getDB();
      db.tasks = db.tasks.filter(t => t.id !== Number(taskId));
      saveDB(db);
      closeTaskModal();
      renderTasks();
    }

    function exportTasksToPDF() {
      

      const db = getDB();
      const userF = filterUser?.value || '';
      const statusF = filterStatus?.value || '';

      const viewer = db.users.find(u => u.name === (s?.username || 'Usuario')) || db.users[0];
      let list = db.tasks.slice();
      if (!admin) list = list.filter(t => Number(t.assignedTo) === Number(viewer?.id));
      list = list.filter(t =>
        (!userF || String(t.assignedTo) === String(userF)) &&
        (!statusF || t.status === statusF)
      );

      if (!list.length) { alert('No hay tareas para exportar.'); return; }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Tareas — EcoFugas', 14, 22);

      const columns = ['ID','Título','Descripción','Estado','Asignada a','Fecha límite'];
      const rows = list.map(t => {
        const assignee = db.users.find(u => u.id === t.assignedTo)?.name || 'Desconocido';
        return [t.id, t.title, t.description || '-', formatStatus(t.status), assignee, t.dueDate || '-'];
      });

      autoTable(doc, {
        startY: 30,
        head: [columns],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 168, 232] } // azul de tu paleta
      });

      doc.save('tareas_ecofugas.pdf');
    }

    // ===== Helpers =====
    function formatStatus(s) {
      return ({ 'pendiente':'Pendiente', 'en-progreso':'En progreso', 'completada':'Completada' }[s] || s);
    }
    function escapeHtml(str) {
      return (str ?? '').toString().replace(/[&<>"']/g, (m) => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
      }[m]));
    }
  });
})();
