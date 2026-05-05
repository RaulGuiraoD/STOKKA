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

// --- LÓGICA DE AVISO PARA CAMBIO DE CORREO EN EDITAR PERFIL  ---
function confirmarGuardarPerfil() {
    var form  = document.getElementById('formEditarPerfil');

    // Validación nativa del navegador (required, email format, etc.)
    if (!form.reportValidity()) return;

    var inputEmail    = document.getElementById('inputEmailPerfil');
    var emailActual   = inputEmail.dataset.emailOriginal.trim().toLowerCase();
    var emailNuevo    = inputEmail.value.trim().toLowerCase();
    var emailCambiado = emailActual !== emailNuevo;

    if (emailCambiado) {
        // Mostramos el nuevo email en el modal de confirmación
        document.getElementById('nuevoEmailPreview').textContent = inputEmail.value.trim();
        var modal = new bootstrap.Modal(document.getElementById('modalConfirmarEmail'));
        modal.show();
    } else {
        form.submit();
    }
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
        btnCargarPerfil.addEventListener('click', function () {
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

    const successAlerts = document.querySelectorAll('#container-mensajes .alert-success-stokka');
    successAlerts.forEach(function (alert) {
        setTimeout(function () {
            if (alert) {
                alert.classList.remove('show');

                setTimeout(function () {
                    alert.remove();
                }, 600);
            }
        }, 3000);
    });

});

/* ICONO INFORMACIÓN */
document.addEventListener('DOMContentLoaded', () => {
    const icons = document.querySelectorAll('.info-icon');

    icons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            // Cerramos otros iconos abiertos
            icons.forEach(i => i !== icon && i.classList.remove('active'));
            // Alternamos el actual
            icon.classList.toggle('active');
        });
    });

    // Cerrar al hacer clic fuera del icono
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('info-icon')) {
            icons.forEach(icon => icon.classList.remove('active'));
        }
    });
});

// =============================================================================
// ACCESIBILIDAD: FILTRO DE DALTONISMO PERSONAL
// Los colores se guardan en localStorage — solo afectan al usuario actual
// en este dispositivo. No van a BD ni afectan a otros usuarios.
// =============================================================================

const FILTROS_DALTONISMO = {
    normal: {
        '--verde-stokka':     null,
        '--verde-secundario': null,
        '--rojo-alerta':      null,
        '--amarillo-alerta':  null,
    },
    protanopia: {
        '--verde-stokka':     '#4B4B00',
        '--verde-secundario': '#9E9E00',
        '--rojo-alerta':      '#0070B8',
        '--amarillo-alerta':  '#C8B400',
    },
    deuteranopia: {
        '--verde-stokka':     '#4B4B00',
        '--verde-secundario': '#9E9E00',
        '--rojo-alerta':      '#0057A8',
        '--amarillo-alerta':  '#C8B400',
    },
    tritanopia: {
        '--verde-stokka':     '#CC0000',
        '--verde-secundario': '#009E9E',
        '--rojo-alerta':      '#8B008B',
        '--amarillo-alerta':  '#FF6600',
    },
    acromatopsia: {
        '--verde-stokka':     '#333333',
        '--verde-secundario': '#777777',
        '--rojo-alerta':      '#111111',
        '--amarillo-alerta':  '#999999',
    },
    alto_contraste: {
        '--verde-stokka':     '#000080',
        '--verde-secundario': '#FFD700',
        '--rojo-alerta':      '#FF4500',
        '--amarillo-alerta':  '#00CED1',
    },
};

// Lee los colores base del tema de empresa desde las variables CSS actuales
// (que ya cargó el context processor en base.html)
function obtenerColoresBase() {
    const style = getComputedStyle(document.documentElement);
    return {
        '--verde-stokka':     style.getPropertyValue('--verde-stokka').trim(),
        '--verde-secundario': style.getPropertyValue('--verde-secundario').trim(),
        '--rojo-alerta':      style.getPropertyValue('--rojo-alerta').trim(),
        '--amarillo-alerta':  style.getPropertyValue('--amarillo-alerta').trim(),
    };
}

// Aplica un filtro a las variables CSS del documento
function aplicarFiltroCSS(tipo) {
    const variables = [
        '--verde-stokka',
        '--verde-secundario',
        '--rojo-alerta',
        '--amarillo-alerta',
    ];

    if (tipo === 'normal') {
        variables.forEach(v => document.documentElement.style.removeProperty(v));
        return;
    }

    const base   = obtenerColoresBase();
    const filtro = FILTROS_DALTONISMO[tipo];

    variables.forEach(v => {
        const color = filtro[v] || base[v];
        document.documentElement.style.setProperty(v, color);
    });
}

// Actualiza el preview de colores en el panel
function actualizarPreviewDaltonismo(tipo) {
    const base   = obtenerColoresBase();
    const filtro = FILTROS_DALTONISMO[tipo] || FILTROS_DALTONISMO.normal;

    const prev = {
        'dprev-principal':  filtro['--verde-stokka']     || base['--verde-stokka'],
        'dprev-secundario': filtro['--verde-secundario']  || base['--verde-secundario'],
        'dprev-alerta':     filtro['--rojo-alerta']       || base['--rojo-alerta'],
        'dprev-aviso':      filtro['--amarillo-alerta']   || base['--amarillo-alerta'],
    };

    Object.keys(prev).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.background = prev[id];
        // Ajusta el color del texto según luminosidad
        const hex = prev[id].replace('#', '');
        const r = parseInt(hex.substr(0,2), 16);
        const g = parseInt(hex.substr(2,2), 16);
        const b = parseInt(hex.substr(4,2), 16);
        const luminosidad = (r * 299 + g * 587 + b * 114) / 1000;
        el.style.color = luminosidad > 128 ? 'black' : 'white';
    });
}

// Carga y aplica el filtro guardado al arrancar la página
function cargarFiltroDaltonismo() {
    const tipoGuardado = localStorage.getItem('stokka_daltonismo') || 'normal';
    if (tipoGuardado !== 'normal') {
        aplicarFiltroCSS(tipoGuardado);
    }
    return tipoGuardado;
}

// Inicializa el panel si estamos en la página de perfil
document.addEventListener('DOMContentLoaded', function () {

    // Aplicar filtro guardado en todas las páginas
    cargarFiltroDaltonismo();

    // El resto solo si el panel existe (página de perfil)
    const panel = document.getElementById('panelDaltonismo');
    if (!panel) return;

    let tipoSeleccionado = localStorage.getItem('stokka_daltonismo') || 'normal';

    // Marcar el botón activo al abrir el panel
    function marcarActivo(tipo) {
        document.querySelectorAll('.btn-daltonismo').forEach(btn => {
            btn.classList.toggle('activo', btn.dataset.tipo === tipo);
        });
    }

    // Preview inicial
    actualizarPreviewDaltonismo(tipoSeleccionado);
    marcarActivo(tipoSeleccionado);

    // Click en cada tipo
    document.querySelectorAll('.btn-daltonismo').forEach(btn => {
        btn.addEventListener('click', function () {
            tipoSeleccionado = this.dataset.tipo;
            marcarActivo(tipoSeleccionado);
            actualizarPreviewDaltonismo(tipoSeleccionado);
            // Preview en vivo antes de confirmar
            aplicarFiltroCSS(tipoSeleccionado);
        });
    });

    // Aplicar y guardar
    document.getElementById('btnAplicarDaltonismo')?.addEventListener('click', function () {
        localStorage.setItem('stokka_daltonismo', tipoSeleccionado);
        // Cerrar el panel
        const collapse = bootstrap.Collapse.getOrCreateInstance(
            document.getElementById('panelDaltonismo')
        );
        collapse.hide();
    });

    // Restablecer — vuelve a los colores del tema de empresa
    document.getElementById('btnRestablecerDaltonismo')?.addEventListener('click', function () {
        tipoSeleccionado = 'normal';
        localStorage.removeItem('stokka_daltonismo');
        aplicarFiltroCSS('normal');
        actualizarPreviewDaltonismo('normal');
        marcarActivo('normal');
    });
});

// =============================================================================
// SISTEMA DE ICONOS INFORMATIVOS
// Los iconos con clase .info-icon pueden ocultarse globalmente por el usuario.
// Los que tienen data-permanente="true" nunca se ocultan.
// El estado se guarda en localStorage.
// =============================================================================

function aplicarEstadoIconosInfo() {
    const ocultos = localStorage.getItem('stokka_info_ocultos') === 'true';
    document.querySelectorAll('.info-icon:not([data-permanente="true"])').forEach(icon => {
        icon.classList.toggle('oculto', ocultos);
    });
    // Actualiza el toggle del perfil si existe en esta página
    const toggle = document.getElementById('toggleIconosInfo');
    if (toggle) {
        toggle.checked = !ocultos;
        const label = document.getElementById('labelToggleIconos');
        if (label) label.textContent = ocultos ? 'Mostrar iconos' : 'Ocultar iconos';
    }
}

function toggleIconosInfo(activar) {
    localStorage.setItem('stokka_info_ocultos', activar ? 'false' : 'true');
    aplicarEstadoIconosInfo();
}

// Se ejecuta en todas las páginas al cargar
document.addEventListener('DOMContentLoaded', function () {
    aplicarEstadoIconosInfo();
});
