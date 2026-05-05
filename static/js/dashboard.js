document.addEventListener("DOMContentLoaded", function () {
    function getCSSVar(varName) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(varName).trim();
    }

    // Se llama cada vez que se necesita un color — nunca en caché global
    function colores() {
        return {
            verdeOscuro:     getCSSVar('--verde-stokka'),
            verdeSecundario: getCSSVar('--verde-secundario'),
            rojo:            getCSSVar('--rojo-alerta'),
            amarillo:        getCSSVar('--amarillo-alerta'),
            grisFondo:       getCSSVar('--gris-fondo'),
        };
    }

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
    };

    // GRÁFICO SEMÁFORO (Doughnut)
    const ctxSemaforo = document.getElementById('chartSemaforo');
    if (ctxSemaforo) {
        const c = colores();
        const valores = JSON.parse(ctxSemaforo.dataset.valores);
        new Chart(ctxSemaforo, {
            type: 'doughnut',
            data: {
                labels: ['Crítico', 'Aviso', 'Correcto'],
                datasets: [{
                    data: valores,
                    backgroundColor: [c.rojo, c.amarillo, c.verdeSecundario],
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
                cutout: '67%'
            }
        });
    }

    // GRÁFICO BARRAS (Top Stock)
    const ctxBarras = document.getElementById('chartBarras');
    if (ctxBarras) {
        const c = colores();
        new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: JSON.parse(ctxBarras.dataset.labels),
                datasets: [{
                    data: JSON.parse(ctxBarras.dataset.valores),
                    backgroundColor: c.verdeOscuro,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // GRÁFICO BALANCE OPERATIVO (PolarArea)
    const ctxRadar = document.getElementById('chartRadar');
    if (ctxRadar) {
        const c = colores();
        const valoresReales = JSON.parse(ctxRadar.dataset.valores);
        new Chart(ctxRadar, {
            type: 'polarArea',
            data: {
                labels: ['Uds. Críticas', 'Uds. Aviso', 'Uds. OK'],
                datasets: [{
                    data: valoresReales,
                    backgroundColor: [c.rojo, c.amarillo, c.verdeSecundario],
                    borderWidth: 1,
                    borderColor: c.verdeOscuro
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

    // GRÁFICO HISTORIAL (Line — datos reales)
    const ctxAdmin = document.getElementById('chartAdmin');
    if (ctxAdmin) {
        const c = colores();
        const labels  = JSON.parse(ctxAdmin.dataset.labels);
        const valores = JSON.parse(ctxAdmin.dataset.valores);
        new Chart(ctxAdmin, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Movimientos de stock',
                    data: valores,
                    borderColor: c.verdeSecundario,
                    backgroundColor: c.verdeSecundario + '22',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: c.verdeSecundario
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