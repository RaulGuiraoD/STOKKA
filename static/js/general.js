// --- LÓGICA DE CONTRASEÑAS STOKKA  ---

function togglePassword(inputId, iconId) {
    // Intentamos buscar por ID (compatibilidad) o por proximidad
    const icon = document.getElementById(iconId);
    const container = icon ? icon.closest('.position-relative') : null;
    const input = container ? container.querySelector('input') : document.getElementById(inputId);

    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

function checkInput(inputElementOrId, iconId) {
    const input = (typeof inputElementOrId === 'string') 
        ? document.getElementById(inputElementOrId) 
        : inputElementOrId;
    
    const container = input.closest('.position-relative');
    const icon = container ? container.querySelector('.fa-eye, .fa-eye-slash') : document.getElementById(iconId);
    
    if (input && icon) {
        if (input.value.length > 0) {
            icon.classList.remove('d-none');
        } else {
            icon.classList.add('d-none');
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

// Escuchador global para capturar inputs nuevos (como los de los modales AJAX)
document.addEventListener('input', function (e) {
    if (e.target.type === 'password' || e.target.id.includes('password')) {
        checkInput(e.target, null); 
    }
});

function submitFotoForm() {
    document.getElementById('fotoForm').submit();
}

document.addEventListener("DOMContentLoaded", function () {

    // --- CARGA DINÁMICA DE MODAL EDITAR USUARIO (ADMIN)---
    const modalBody = document.getElementById('bodyEditarUsuario');

    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-cargar-editar')) {
            const btn = e.target.closest('.btn-cargar-editar');
            const url = btn.getAttribute('data-url');

            // Limpiamos y ponemos el spinner mientras carga
            modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';

            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(response => response.text())
                .then(html => {
                    modalBody.innerHTML = html;
                })
                .catch(err => {
                    modalBody.innerHTML = '<div class="alert alert-danger">Error al cargar el formulario.</div>';
                });
        }
    });

    const errorAdminSignal = document.querySelector('[class*="open_admin_edit_modal_"]');

    if (errorAdminSignal) {
        // Extraemos el ID del nombre de la clase (ej: de 'open_admin_edit_modal_5' sacamos '5')
        const classList = errorAdminSignal.className.split(' ');
        const targetClass = classList.find(c => c.startsWith('open_admin_edit_modal_'));
        const userId = targetClass.split('_').pop();

        // 2. Buscamos el botón de editar de ESE usuario específico en la tabla
        // Usamos el atributo data-url que ya tienes para localizarlo
        const btnEditar = document.querySelector(`.btn-cargar-editar[data-url*="/${userId}/"]`);

        if (btnEditar) {
            setTimeout(() => {
                btnEditar.click(); // Esto dispara tu función fetch automáticamente
                
                // 3. El "Trim" / Auto-focus: 
                // Esperamos un poco a que el fetch termine de cargar el HTML en el modal
                setTimeout(() => {
                    const passInput = document.getElementById('id_password');
                    if (passInput) {
                        passInput.focus();
                        // Opcional: si quieres limpiar el campo si hubo error
                        passInput.value = ''; 
                    }
                }, 600); // Un pelín más de tiempo para asegurar que el fetch terminó
            }, 400);
        }
    }

    // --- CARGA DINÁMICA MODAL EDITAR PERFIL ---

    // 1. SELECTORES DE SEÑALES 
    const errorPerfil = document.querySelector('.open_edit_modal');
    const errorNuevoUsuario = document.querySelector('.open_add_modal');

    // 2. LÓGICA: ERROR EN EDITAR MI PERFIL (
    if (errorPerfil) {
        const btnPerfil = document.querySelector('.btn-cargar-editar-perfil');
        if (btnPerfil) {
            setTimeout(() => {
                btnPerfil.click(); // Esto disparará tu lógica de fetch automática
            }, 400);
        }
    }

    // 3. LÓGICA: ERROR EN NUEVO USUARIO (ESTÁTICO)
    if (errorNuevoUsuario) {
        const modalElement = document.getElementById('modalNuevoUsuario');
        if (modalElement) {
            console.log("Reabriendo modal Nuevo Usuario...");
            setTimeout(() => {
                const modalAdd = new bootstrap.Modal(modalElement);
                modalAdd.show();
            }, 400);
        }
    }

    // 4. REVISIÓN DEL FETCH 
    const btnCargarPerfil = document.querySelector('.btn-cargar-editar-perfil');
    const bodyPerfil = document.getElementById('bodyEditarPerfil');

    if (btnCargarPerfil && bodyPerfil) {
        btnCargarPerfil.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            console.log("Cargando contenido desde:", url);
            
            // Ponemos el spinner
            bodyPerfil.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';
            
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(response => {
                    if (!response.ok) throw new Error('Error en red');
                    return response.text();
                })
                .then(html => {
                    bodyPerfil.innerHTML = html;
                    console.log("Contenido del perfil cargado con éxito.");
                })
                .catch(err => {
                    console.error("Error Fetch:", err);
                    bodyPerfil.innerHTML = '<div class="alert alert-danger m-3">Error al cargar el formulario.</div>';
                });
        });
    }

    // 2. LÓGICA DEL SIDEBAR Y OVERLAY
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.querySelector(".dashboard-sidebar");

    // Solo ejecutamos si ambos elementos existen en el HTML
    if (toggleBtn && sidebar) {
        // Crear overlay dinámicamente si no existe ya
        let overlay = document.querySelector(".sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.classList.add("sidebar-overlay");
            document.body.appendChild(overlay);
        }

        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        });

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }

    // 3. OCULTAR BARRA INFERIOR AL HACER SCROLL (Mobile)
    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollThreshold = 15;

    window.addEventListener('scroll', function (e) {
        if (!sidebar) return; // Si no hay sidebar, no hacemos nada

        let currentScrollY = window.pageYOffset || document.documentElement.scrollTop || (e.target.scrollTop > 0 ? e.target.scrollTop : 0);

        // Si estamos arriba del todo, siempre mostrar
        if (currentScrollY <= 10) {
            sidebar.classList.remove('sidebar-hidden');
            lastScrollY = currentScrollY;
            return;
        }

        const delta = currentScrollY - lastScrollY;

        if (Math.abs(delta) > scrollThreshold) {
            // Solo ocultamos si estamos en formato móvil (barra inferior)
            if (window.innerWidth <= 991) {
                if (delta > 0) {
                    sidebar.classList.add('sidebar-hidden');
                } else {
                    sidebar.classList.remove('sidebar-hidden');
                }
            }
            lastScrollY = currentScrollY;
        }
    }, true);

});