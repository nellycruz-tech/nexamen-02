const API = 'https://backend-farmacia-d90l.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ App.js cargado correctamente");

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // 1. NAVEGACIÓN AUTH
    document.getElementById('show-register').onclick = (e) => { 
        e.preventDefault(); 
        loginForm.classList.add('hidden'); 
        registerForm.classList.remove('hidden'); 
    };

    document.getElementById('show-login').onclick = (e) => { 
        e.preventDefault(); 
        registerForm.classList.add('hidden'); 
        loginForm.classList.remove('hidden'); 
    };

    // 2. REGISTRO
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const rol = document.getElementById('reg-rol').value;

        if (nombre.length < 3) return alert('Nombre muy corto');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Correo inválido');
        if (password.length < 6) return alert('Contraseña mín. 6 caracteres');

        try {
            const res = await fetch(`${API}/registrar`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password, rol })
            });
            const data = await res.json();
            if (res.ok) { 
                alert('✅ Registro exitoso. Inicie sesión.'); 
                document.getElementById('show-login').click();
            } else { 
                alert('❌ ' + data.error); 
            }
        } catch (err) { 
            alert('❌ Error de conexión con el backend'); 
        }
    };

    // 3. LOGIN
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('rol', data.rol);
                localStorage.setItem('nombre', data.nombre);
                initDashboard();
            } else { 
                alert('❌ ' + data.error); 
            }
        } catch (err) { 
            alert('❌ Error de conexión'); 
        }
    };

    // 4. INICIALIZAR DASHBOARD
    function initDashboard() {
        const token = localStorage.getItem('token');
        if (!token) return;

        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
        document.getElementById('user-name').textContent = localStorage.getItem('nombre');
        document.getElementById('user-rol').textContent = localStorage.getItem('rol');

        // Mostrar menús según rol
        const rol = localStorage.getItem('rol');
        if (rol === 'administrador') {
            document.querySelectorAll('.admin-only, .mod-only').forEach(el => el.classList.remove('hidden'));
        } else if (rol === 'moderador') {
            document.querySelectorAll('.mod-only').forEach(el => el.classList.remove('hidden'));
        }

        cargarCatalogo();
        configurarNavegacion();
    }

    // 5. CONFIGURAR NAVEGACIÓN (AQUÍ ESTABA EL ERROR)
    function configurarNavegacion() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                
                // Actualizar menú activo
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // OCULTAR TODAS las secciones y QUITARLES la clase 'active'
                document.querySelectorAll('.section').forEach(s => {
                    s.classList.remove('active');
                    s.classList.add('hidden'); // ← ESTO ASEGURA QUE SE OCULTEN
                });
                
                // MOSTRAR la sección seleccionada (QUITANDO 'hidden' y poniendo 'active')
                const targetSection = document.getElementById(`sec-${section}`);
                if (targetSection) {
                    targetSection.classList.remove('hidden'); // ← ¡AQUÍ ESTABA LA SOLUCIÓN!
                    targetSection.classList.add('active');
                }
                
                document.getElementById('page-title').textContent = link.textContent.trim();

                // Cargar datos según la sección
                if (section === 'catalogo') cargarCatalogo();
                if (section === 'gestionar') { cargarGestionar(); cargarCategoriasSelect(); }
                if (section === 'categorias') cargarCategoriasTabla();
            };
        });

        document.getElementById('logout-btn').onclick = () => {
            localStorage.clear();
            location.reload();
        };
    }

    // 6. FUNCIONES DE CARGA DE DATOS
    async function cargarCatalogo() {
        const res = await fetch(`${API}/productos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const productos = await res.json();
        document.getElementById('tabla-catalogo').innerHTML = productos.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria ? p.categoria.nombre : 'N/A'}</td>
                <td>S/ ${parseFloat(p.precio).toFixed(2)}</td>
                <td><span style="color: ${p.stock < 50 ? 'red' : 'green'}">${p.stock}</span></td>
            </tr>
        `).join('');
    }

    async function cargarGestionar() {
        const res = await fetch(`${API}/productos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const productos = await res.json();
        const rol = localStorage.getItem('rol');
        
        document.getElementById('tabla-gestionar').innerHTML = productos.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td>S/ ${parseFloat(p.precio).toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editarProducto(${p.id}, '${p.nombre}', ${p.precio}, ${p.stock}, ${p.categoriaId})">Editar</button>
                    ${rol === 'administrador' ? `<button class="action-btn btn-delete" onclick="eliminarProducto(${p.id})">Eliminar</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    async function cargarCategoriasSelect() {
        const res = await fetch(`${API}/categorias`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const cats = await res.json();
        document.getElementById('prod-categoria').innerHTML = '<option value="">Seleccione...</option>' + 
            cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    }

    async function cargarCategoriasTabla() {
        const res = await fetch(`${API}/categorias`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const cats = await res.json();
        document.getElementById('tabla-categorias').innerHTML = cats.map(c => `
            <tr><td>${c.id}</td><td>${c.nombre}</td><td>${c.descripcion || '-'}</td></tr>
        `).join('');
    }

    // 7. FORMULARIOS DE GESTIÓN
    document.getElementById('producto-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const data = {
            nombre: document.getElementById('prod-nombre').value,
            precio: parseFloat(document.getElementById('prod-precio').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            categoriaId: parseInt(document.getElementById('prod-categoria').value)
        };

        if (!data.categoriaId) return alert('Seleccione una categoría');

        const url = id ? `${API}/productos/${id}` : `${API}/productos`;
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method, 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert(id ? '✅ Actualizado' : '✅ Creado');
            resetForm();
            cargarGestionar();
            cargarCatalogo();
        } else {
            alert('❌ Error al guardar');
        }
    };

    document.getElementById('categoria-form').onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('cat-nombre').value;
        if (nombre.length < 3) return alert('Nombre muy corto');
        
        const res = await fetch(`${API}/categorias`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ nombre })
        });
        
        if (res.ok) { 
            document.getElementById('categoria-form').reset(); 
            cargarCategoriasTabla(); 
            cargarCategoriasSelect(); 
        } else {
            alert('❌ Error al crear categoría');
        }
    };

    // 8. FUNCIONES GLOBALES (Editar/Eliminar)
    window.editarProducto = (id, nombre, precio, stock, catId) => {
        document.getElementById('prod-id').value = id;
        document.getElementById('prod-nombre').value = nombre;
        document.getElementById('prod-precio').value = precio;
        document.getElementById('prod-stock').value = stock;
        document.getElementById('prod-categoria').value = catId;
        document.getElementById('form-title').textContent = 'Editar Producto';
        document.getElementById('btn-submit-prod').textContent = 'Actualizar';
        document.getElementById('btn-cancel-edit').classList.remove('hidden');
    };

    window.eliminarProducto = async (id) => {
        if (!confirm('¿Eliminar este producto?')) return;
        const res = await fetch(`${API}/productos/${id}`, {
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { cargarGestionar(); cargarCatalogo(); }
    };

    document.getElementById('btn-cancel-edit').onclick = () => {
        document.getElementById('producto-form').reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('form-title').textContent = 'Agregar Nuevo Producto';
        document.getElementById('btn-submit-prod').textContent = 'Guardar';
        document.getElementById('btn-cancel-edit').classList.add('hidden');
    };

    // Iniciar si ya hay sesión
    if (localStorage.getItem('token')) initDashboard();
});