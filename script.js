const HOY_STR = new Date().toLocaleDateString();

// Comprobar si cambió el día para reiniciar registros diarios
let ultimaFecha = localStorage.getItem('ultima_fecha_registro') || HOY_STR;
let registros = JSON.parse(localStorage.getItem('registros_combustible')) || [];
let historialSemanal = JSON.parse(localStorage.getItem('historial_semanal')) || {};

if (ultimaFecha !== HOY_STR) {
    if (registros.length > 0) {
        historialSemanal[ultimaFecha] = registros;
        // Mantener solo los últimos 7 días en el historial
        const fechas = Object.keys(historialSemanal);
        if (fechas.length > 7) {
            delete historialSemanal[fechas[0]];
        }
        localStorage.setItem('historial_semanal', JSON.stringify(historialSemanal));
    }
    registros = [];
    localStorage.setItem('registros_combustible', JSON.stringify(registros));
    localStorage.setItem('ultima_fecha_registro', HOY_STR);
}

function actualizarPantalla() {
    const tbody = document.querySelector("#tablaRegistros tbody");
    tbody.innerHTML = "";
    let total = 0;

    registros.forEach(r => {
        total += parseFloat(r.Litros) || 0;
        let hora = r.Fecha_Hora.split(',')[1] || r.Fecha_Hora; // Muestra solo la hora en la tabla rápida
        let fila = `<tr>
            <td>${hora.trim()}</td>
            <td>${r.Nombre_Apellido}</td>
            <td>${r.Cedula}</td>
            <td>${r.Litros}</td>
            <td>${r.Lugar}</td>
        </tr>`;
        tbody.innerHTML += fila;
    });

    document.getElementById("totalLitros").innerText = total.toFixed(2) + " L";
    localStorage.setItem('registros_combustible', JSON.stringify(registros));
}

function guardarRegistro() {
    const nombre = document.getElementById("nombre").value.trim();
    const cedula = document.getElementById("cedula").value.trim();
    const litrosInput = document.getElementById("litros").value;
    const encargado = document.getElementById("encargado").value.trim();
    const lugar = document.getElementById("lugar").value.trim();

    if (!nombre || !cedula || !litrosInput || !encargado || !lugar) {
        alert("Por favor, complete todos los campos.");
        return;
    }

    const ahora = new Date();
    const fechaHora = ahora.toLocaleString();

    registros.push({
        Fecha_Hora: fechaHora,
        Nombre_Apellido: nombre,
        Cedula: cedula,
        Litros: parseFloat(litrosInput),
        Encargado: encargado,
        Lugar: lugar
    });

    localStorage.setItem('ultima_fecha_registro', HOY_STR);
    actualizarPantalla();
    
    // Limpiar campos
    document.getElementById("nombre").value = "";
    document.getElementById("cedula").value = "";
    document.getElementById("litros").value = "";
    document.getElementById("encargado").value = "";
    document.getElementById("lugar").value = "";
}

function exportarExcel() {
    if (registros.length === 0) {
        alert("No hay datos registrados hoy para exportar.");
        return;
    }

    let datosExportar = [...registros];
    let totalLitros = registros.reduce((sum, r) => sum + r.Litros, 0);

    datosExportar.push({
        Fecha_Hora: "TOTAL GENERAL",
        Nombre_Apellido: "",
        Cedula: "",
        Litros: totalLitros,
        Encargado: "",
        Lugar: ""
    });

    const hoja = XLSX.utils.json_to_sheet(datosExportar);

    hoja['!cols'] = [
        { wch: 25 }, { wch: 22 }, { wch: 16 },
        { wch: 12 }, { wch: 22 }, { wch: 48 }
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Combustible");

    const fechaHoy = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `Reporte_Combustible_${fechaHoy}.xlsx`);
}

function verificarClave(callback) {
    const claveCorrecta = 'admin123';
    const claveIngresada = prompt('Ingrese la clave de administrador:');
    if (claveIngresada === claveCorrecta) {
        callback();
    } else if (claveIngresada !== null) {
        alert('Clave incorrecta.');
    }
}

function exportarJSON() {
    verificarClave(() => {
        const datos = {
            registros_combustible: registros,
            historial_semanal: historialSemanal,
            ultima_fecha_registro: localStorage.getItem('ultima_fecha_registro') || HOY_STR,
            fecha_exportacion: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `combustible_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function importarJSON(event) {
    verificarClave(() => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const datos = JSON.parse(e.target.result);
                if (datos.registros_combustible) {
                    registros = Array.isArray(datos.registros_combustible) ? datos.registros_combustible : [];
                    localStorage.setItem('registros_combustible', JSON.stringify(registros));
                }
                if (datos.historial_semanal) {
                    historialSemanal = typeof datos.historial_semanal === 'object' ? datos.historial_semanal : {};
                    localStorage.setItem('historial_semanal', JSON.stringify(historialSemanal));
                }
                if (datos.ultima_fecha_registro) {
                    localStorage.setItem('ultima_fecha_registro', datos.ultima_fecha_registro);
                }
                actualizarPantalla();
                alert("Datos restaurados correctamente desde el archivo JSON.");
            } catch (error) {
                alert("Error al leer el archivo JSON. Asegúrese de que el archivo es válido.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });
}

function abrirHistorial() {
    const contenedor = document.getElementById("contenidoHistorial");
    contenedor.innerHTML = "";

    const fechas = Object.keys(historialSemanal);
    if (fechas.length === 0) {
        contenedor.innerHTML = "<p style='font-size:0.9rem;'>No hay registros guardados de días anteriores esta semana.</p>";
    } else {
        fechas.reverse().forEach(fecha => {
            let lista = historialSemanal[fecha];
            let totalDia = lista.reduce((s, r) => s + r.Litros, 0);
            let html = `<div style="border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px;">
                <strong style="font-size:0.9rem;">Día: ${fecha} (Total: ${totalDia.toFixed(2)} L)</strong>
                <ul style="font-size:0.75rem; font-weight:normal; margin: 5px 0; padding-left: 18px;">`;
            
            lista.forEach(item => {
                html += `<li>${item.Nombre_Apellido} (${item.Cedula}) - <b>${item.Litros} L</b></li>`;
            });

            html += `</ul></div>`;
            contenedor.innerHTML += html;
        });
    }

    document.getElementById("modalHistorial").style.display = "flex";
}

function cerrarHistorial() {
    document.getElementById("modalHistorial").style.display = "none";
}

// Inicializar al cargar
actualizarPantalla();