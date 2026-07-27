const HOY_STR = new Date().toLocaleDateString();

let registros = JSON.parse(localStorage.getItem('registros_combustible')) || [];
let historialSemanal = JSON.parse(localStorage.getItem('historial_semanal')) || {};

function cargarDatos() {
    registros = JSON.parse(localStorage.getItem('registros_combustible')) || [];
    historialSemanal = JSON.parse(localStorage.getItem('historial_semanal')) || {};
    renderTablaAdmin();
    renderHistorialAdmin();
}

function renderTablaAdmin() {
    const tbody = document.querySelector("#tablaAdmin tbody");
    tbody.innerHTML = "";
    
    if (registros.length === 0) {
        document.getElementById("sinRegistros").style.display = "block";
        return;
    }
    
    document.getElementById("sinRegistros").style.display = "none";
    let total = 0;
    
    registros.forEach((r, index) => {
        total += parseFloat(r.Litros) || 0;
        let hora = r.Fecha_Hora.split(',')[1] || r.Fecha_Hora;
        let fila = `<tr>
            <td>${hora.trim()}</td>
            <td>${r.Nombre_Apellido}</td>
            <td>${r.Cedula}</td>
            <td>${r.Litros}</td>
            <td>${r.Lugar}</td>
            <td>${r.Encargado}</td>
            <td><button class="btn-eliminar" onclick="eliminarRegistro(${index})">Eliminar</button></td>
        </tr>`;
        tbody.innerHTML += fila;
    });
}

function renderHistorialAdmin() {
    const contenedor = document.getElementById("historialAdmin");
    const fechas = Object.keys(historialSemanal);
    
    if (fechas.length === 0) {
        contenedor.innerHTML = "<p class='sin-datos'>No hay datos en el historial semanal.</p>";
        return;
    }
    
    contenedor.innerHTML = "";
    fechas.reverse().forEach(fecha => {
        let lista = historialSemanal[fecha];
        let totalDia = lista.reduce((s, r) => s + parseFloat(r.Litros), 0);
        
        let div = document.createElement('div');
        div.className = 'historial-dia';
        div.innerHTML = `
            <div class="historial-header">
                <strong>Día: ${fecha} (Total: ${totalDia.toFixed(2)} L)</strong>
                <button class="btn-eliminar-pequeno" onclick="eliminarDia('${fecha}')">Eliminar Día</button>
            </div>
            <table class="tabla-mini">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Nombre</th>
                        <th>CI</th>
                        <th>Litros</th>
                        <th>Lugar</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map((item, idx) => {
                        let hora = item.Fecha_Hora.split(',')[1] || item.Fecha_Hora;
                        return `<tr>
                            <td>${hora.trim()}</td>
                            <td>${item.Nombre_Apellido}</td>
                            <td>${item.Cedula}</td>
                            <td>${item.Litros}</td>
                            <td>${item.Lugar}</td>
                            <td><button class="btn-eliminar" onclick="eliminarRegistroHistorial('${fecha}', ${idx})">Eliminar</button></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
        contenedor.appendChild(div);
    });
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

function eliminarRegistro(index) {
    verificarClave(() => {
        if (confirm("¿Está seguro de que desea eliminar este registro?")) {
            registros.splice(index, 1);
            localStorage.setItem('registros_combustible', JSON.stringify(registros));
            cargarDatos();
        }
    });
}

function eliminarRegistroHistorial(fecha, index) {
    verificarClave(() => {
        if (confirm("¿Está seguro de que desea eliminar este registro del historial?")) {
            historialSemanal[fecha].splice(index, 1);
            if (historialSemanal[fecha].length === 0) {
                delete historialSemanal[fecha];
            }
            localStorage.setItem('historial_semanal', JSON.stringify(historialSemanal));
            cargarDatos();
        }
    });
}

function eliminarDia(fecha) {
    verificarClave(() => {
        if (confirm(`¿Está seguro de que desea eliminar todos los registros del día ${fecha}?`)) {
            delete historialSemanal[fecha];
            localStorage.setItem('historial_semanal', JSON.stringify(historialSemanal));
            cargarDatos();
        }
    });
}

function exportarJSON() {
    verificarClave(() => {
        const datos = {
            registros_combustible: registros,
            historial_semanal: historialSemanal,
            ultima_fecha_registro: localStorage.getItem('ultima_fecha_registro') || HOY_STR,
            fecha_exportacion: new Date().toISOString(),
            total_general: registros.reduce((sum, r) => sum + parseFloat(r.Litros), 0)
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo_combustible_${new Date().toISOString().slice(0, 10)}.json`;
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
                if (confirm("¿Está seguro? Esto reemplazará todos los datos actuales.")) {
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
                    cargarDatos();
                    alert("Datos restaurados correctamente desde el archivo JSON.");
                }
            } catch (error) {
                alert("Error al leer el archivo JSON. Verifique que el archivo sea válido.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });
}

function limpiarHistorial() {
    verificarClave(() => {
        if (confirm("¿Está seguro de que desea eliminar todo el historial semanal? Esta acción no se puede deshacer.")) {
            historialSemanal = {};
            localStorage.setItem('historial_semanal', JSON.stringify(historialSemanal));
            cargarDatos();
        }
    });
}

function reiniciarTodo() {
    verificarClave(() => {
        if (confirm("¿Está seguro? Esto eliminará TODOS los datos actuales y del historial. Esta acción no se puede deshacer.")) {
            localStorage.removeItem('registros_combustible');
            localStorage.removeItem('historial_semanal');
            localStorage.removeItem('ultima_fecha_registro');
            registros = [];
            historialSemanal = {};
            cargarDatos();
        }
    });
}

cargarDatos();