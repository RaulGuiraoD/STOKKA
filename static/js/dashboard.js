document.addEventListener("DOMContentLoaded", function () {
    // 1. FUNCIÓN PARA EXTRAER COLORES DEL CSS 
    const getCSSVar = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };

    // Mapeamos tus variables de CSS
    const colores = {
        verdeOscuro: getCSSVar('--verde-stokka'),      // #003D00
        verdeSecundario: getCSSVar('--verde-secundario'), // #1CA300
        rojo: getCSSVar('--rojo-alerta'),             // #C10D00
        amarillo: getCSSVar('--amarillo-alerta'),       // #F5C907
        grisFondo: getCSSVar('--gris-fondo')           // #F2F4F6
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
                    // Usamos tus colores de alerta y el verde secundario para "OK"
                    backgroundColor: [colores.rojo, colores.amarillo, colores.verdeSecundario],
                    borderWidth: 0,
                    hoverOffset: 15
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
                cutout: '70%' // Estilo moderno tipo anillo
            }
        });
    }

    // 3. GRÁFICO BARRAS (Top Stock)
    const ctxBarras = document.getElementById('chartBarras');
    if (ctxBarras) {
        const labels = JSON.parse(ctxBarras.dataset.labels);
        const valores = JSON.parse(ctxBarras.dataset.valores);
        new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades',
                    data: valores,
                    // Usamos tu verde oscuro principal para las barras
                    backgroundColor: colores.verdeOscuro,
                    borderRadius: 10,
                    barThickness: 'flex',
                    maxBarThickness: 40
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#e9ecef', drawBorder: false }
                    },
                    x: { grid: { display: false } }
                }
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
});