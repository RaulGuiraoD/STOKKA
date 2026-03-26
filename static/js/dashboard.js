document.addEventListener("DOMContentLoaded", function () {
    // 1. FUNCIÓN PARA EXTRAER COLORES DEL CSS 
    const getCSSVar = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };

    // Mapeamos tus variables de CSS
    const colores = {
        verdeOscuro: getCSSVar('--verde-stokka'),           // #003D00
        verdeSecundario: getCSSVar('--verde-secundario'),   // #1CA300
        rojo: getCSSVar('--rojo-alerta'),                   // #C10D00
        amarillo: getCSSVar('--amarillo-alerta'),           // #F5C907
        grisFondo: getCSSVar('--gris-fondo')                // #F2F4F6
    };

    // Configuración común para que los gráficos sean responsivos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
    };

    // 2. GRÁFICO SEMÁFORO (Doughnut)
    const ctxSemaforo = document.getElementById('chartSemaforo');
    if (ctxSemaforo) {
        const valores = JSON.parse(ctxSemaforo.dataset.valores);
        new Chart(ctxSemaforo, {
            type: 'doughnut',
            data: {
                labels: ['Crítico', 'Aviso', 'Correcto'],
                datasets: [{
                    data: valores,
                    backgroundColor: [colores.rojo, colores.amarillo, colores.verdeSecundario],
                    borderWidth: -10,
                    hoverOffset: 5
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 20 }
                    }
                },
                cutout: '67%' // Estilo moderno tipo anillo
            }
        });
    }

    // 3. GRÁFICO BARRAS (Top Stock)
    const ctxBarras = document.getElementById('chartBarras');
    if (ctxBarras) {
        new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: JSON.parse(ctxBarras.dataset.labels),
                datasets: [{
                    data: JSON.parse(ctxBarras.dataset.valores),
                    backgroundColor: colores.verdeOscuro,
                    borderRadius: 8
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
    // 4. GRÁFICO BALANCE OPERATIVO (Top Stock)
    const ctxRadar = document.getElementById('chartRadar');
    if (ctxRadar) {
        const valoresReales = JSON.parse(ctxRadar.dataset.valores);
        new Chart(ctxRadar, {
            type: 'polarArea',
            data: {
                labels: ['Uds. Críticas', 'Uds. Aviso', 'Uds. OK'],
                datasets: [{
                    data: valoresReales,
                    backgroundColor: [
                        colores.rojo,
                        colores.amarillo,
                        colores.verdeSecundario
                    ],
                    borderWidth: 1,
                    borderColor: colores.verdeOscuro
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { ticks: { display: false }, grid: { color: '#f0f0f0' } } },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }
            }
        });
    }

    // 4. GRÁFICO ADMIN (Actividad de Stock)
    const ctxAdmin = document.getElementById('chartAdmin');
    if (ctxAdmin) {
        new Chart(ctxAdmin, {
            type: 'line',
            data: {
                labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
                datasets: [{
                    label: 'Movimientos',
                    data: [5, 12, 8, 15, 10, 22, 14],
                    borderColor: colores.verdeSecundario,
                    backgroundColor: colores.verdeSecundario + '22', // Añadimos transparencia
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: colores.verdeSecundario
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { display: false }
                }
            }
        });
    }

    const alerts = document.querySelectorAll('.custom-alert');
    if (alerts.length > 0) {
        alerts.forEach(function (alert) {
            setTimeout(function () {
                try {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                } catch (e) {
                    // Si Bootstrap no ha cargado aún o el elemento ya no está
                    alert.style.display = 'none';
                }
            }, 3000);
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

    // --- CARGA DINÁMICA MODAL EDITAR PERFIL ---
    const btnEditarPerfil = document.querySelector('.btn-cargar-editar-perfil');
    const bodyPerfil = document.getElementById('bodyEditarPerfil');

    // 1. Lógica para abrir automáticamente si hay error
    const señalErrorPerfil = document.querySelector('.open_edit_modal');
    if (señalErrorPerfil && btnEditarPerfil) {
        setTimeout(() => {
            btnEditarPerfil.click();
            console.log("Abriendo modal por error detectado...");
        }, 200); // Un pelín más de delay para asegurar
    }

    // 2. Lógica del click manual 
    if (btnEditarPerfil) {
        btnEditarPerfil.addEventListener('click', function () {
            const url = this.getAttribute('data-url');
            if (bodyPerfil) {
                bodyPerfil.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';
                fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(response => response.text())
                    .then(html => { bodyPerfil.innerHTML = html; })
                    .catch(err => { bodyPerfil.innerHTML = '<div class="alert alert-danger">Error al cargar el formulario.</div>'; });
            }
        });
    }

});
function submitFotoForm() {
    document.getElementById('fotoForm').submit();
}