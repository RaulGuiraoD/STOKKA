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
        const labels = JSON.parse(ctxAdmin.dataset.labels);
        const valores = JSON.parse(ctxAdmin.dataset.valores);

        new Chart(ctxAdmin, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Movimientos de stock',
                    data: valores,
                    borderColor: colores.verdeSecundario,
                    backgroundColor: colores.verdeSecundario + '22',
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
                    y: {
                        display: true,
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

});

