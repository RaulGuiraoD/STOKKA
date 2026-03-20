document.addEventListener("DOMContentLoaded", function () {
    // 1. CONFIGURACIÓN GRÁFICO SEMÁFORO (Doughnut)
    const ctxSemaforo = document.getElementById('chartSemaforo');
    if (ctxSemaforo) {
        const valores = JSON.parse(ctxSemaforo.dataset.valores);
        new Chart(ctxSemaforo, {
            type: 'doughnut',
            data: {
                labels: ['Crítico', 'Aviso', 'OK'],
                datasets: [{
                    data: valores,
                    backgroundColor: ['#C10D00', '#F5C907', '#1CA300'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // 2. CONFIGURACIÓN GRÁFICO BARRAS (Top Stock)
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
                    backgroundColor: '#003D00',
                    borderRadius: 10,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
    // 3. CONFIGURACIÓN GRÁFICO ADMIN (Solo si existe el elemento)
    const ctxAdmin = document.getElementById('chartAdmin');
    if (ctxAdmin) {
        new Chart(ctxAdmin, {
            type: 'line', // Un gráfico de líneas para ver actividad temporal
            data: {
                labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
                datasets: [{
                    label: 'Movimientos de Stock Totales',
                    data: [12, 19, 3, 5, 2, 3, 7], // Datos de prueba, luego vendrán de la DB
                    borderColor: '#198754',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: '#19875411'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }
});