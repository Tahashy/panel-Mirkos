/**
 * Servicio de Impresión para Impresoras Térmicas usando QZ Tray
 * Optimizado para Mirkos Chicken con formatos de Comanda y Ticket profesional.
 */
import * as qz from 'qz-tray';

export const impresionService = {
    /**
     * Asegura que exista una conexión activa con el agente QZ Tray
     */
    conectar: async () => {
        try {
            if (qz.websocket.isActive()) return true;
            await qz.websocket.connect();
            return true;
        } catch (error) {
            console.error('Error al conectar con QZ Tray:', error);
            throw new Error('QZ Tray no está ejecutándose. Por favor ábrelo.');
        }
    },

    /**
     * Busca impresoras instaladas en el Sistema Operativo
     */
    buscarImpresoras: async () => {
        await impresionService.conectar();
        return await qz.printers.find();
    },

    /**
     * Envía una lista de comandos RAW a una impresora específica
     */
    enviarAlPlugin: async (operaciones, nombreImpresora) => {
        try {
            await impresionService.conectar();
            const config = qz.configs.create(nombreImpresora);
            await qz.print(config, operaciones);
            return true;
        } catch (error) {
            console.error('Error de impresión QZ:', error);
            throw error;
        }
    },

    /**
     * Genera el formato de TICKET DE VENTA (Caja)
     * Basado en el diseño visual de Mirkos Chicken
     */
    formatearTicket: (pedido, opciones = {}) => {
        const char = {
            init: '\x1B\x40',
            center: '\x1B\x61\x01',
            left: '\x1B\x61\x00',
            right: '\x1B\x61\x02',
            boldOn: '\x1B\x45\x01',
            boldOff: '\x1B\x45\x00',
            doubleH: '\x1B\x21\x10',
            normal: '\x1B\x21\x00',
            cut: '\x1D\x56\x41\x03'
        };

        let d = "";
        d += char.init;

        // --- ENCABEZADO EMPRESA ---
        d += char.center + char.boldOn + "Mirkos Chicken\n" + char.boldOff;
        d += "Av. Manuel Dorrego Mz-5 Lt-14\n";
        d += "Tel: 978501075\n";
        d += "--------------------------------\n";

        // --- INFO PEDIDO ---
        d += char.left;
        d += char.boldOn + "Pedido: " + char.boldOff + "#" + (pedido.numero_pedido || pedido.id.substring(0, 8)) + "\n";
        d += char.boldOn + "Fecha: " + char.boldOff + new Date(pedido.created_at).toLocaleString() + "\n";
        if (pedido.cliente_nombre || pedido.cliente?.nombre) {
            d += char.boldOn + "Cliente: " + char.boldOff + (pedido.cliente_nombre || pedido.cliente?.nombre) + "\n";
        }
        d += char.boldOn + "Tipo: " + char.boldOff + (pedido.tipo || 'LOCAL').toUpperCase() + "\n";
        d += "--------------------------------\n";

        // --- ITEMS ---
        (pedido.pedido_items || []).forEach(item => {
            const nombre = (item.nombre || item.producto_nombre || 'Producto').substring(0, 22);
            const cant = item.cantidad;
            const precioTotal = (parseFloat(item.precio || item.precio_unitario || 0) * item.cantidad).toFixed(2);

            // Línea 1: Cantidad x Nombre
            d += `${cant} x ${nombre}\n`;
            // Línea 2: Precio alineado a la derecha
            d += char.right + `S/ ${precioTotal}\n` + char.left;

            if (item.agregados && item.agregados.length > 0) {
                item.agregados.forEach(ag => {
                    d += `  + ${ag.nombre}\n`;
                });
            }
        });

        d += "--------------------------------\n";

        // --- TOTALES ---
        d += char.right;
        const totalNum = parseFloat(pedido.total || 0).toFixed(2);
        d += `Subtotal: S/ ${totalNum}\n`;
        d += char.boldOn + `TOTAL: S/ ${totalNum}\n` + char.boldOff;
        if (pedido.metodo_pago) {
            d += `Método pago: ${pedido.metodo_pago.toUpperCase()}\n`;
        }

        // --- PIE ---
        d += "\n" + char.center + "¡Gracias por su visita!\n\n\n";
        d += char.cut;

        return [d];
    },

    /**
     * Genera el formato de COMANDA (Cocina)
     * Basado en el diseño visual de Mirkos Chicken
     */
    formatearComanda: (pedido) => {
        const char = {
            init: '\x1B\x40',
            center: '\x1B\x61\x01',
            left: '\x1B\x61\x00',
            boldOn: '\x1B\x45\x01',
            boldOff: '\x1B\x45\x00',
            doubleH: '\x1B\x21\x10',
            doubleSize: '\x1D\x21\x11', // Double width and height
            normal: '\x1D\x21\x00',
            cut: '\x1D\x56\x41\x03'
        };

        let d = "";
        d += char.init;

        // --- TITULO COMANDA ---
        d += char.center + char.doubleSize + "COMANDA COCINA" + char.normal + "\n\n";

        // --- INFO PEDIDO ---
        d += char.left;
        d += char.boldOn + "Pedido: " + char.boldOff + "#" + (pedido.numero_pedido || pedido.id.substring(0, 8)) + "\n";
        d += char.boldOn + "Fecha: " + char.boldOff + new Date(pedido.created_at).toLocaleString() + "\n";
        d += char.boldOn + "Tipo: " + char.boldOff + (pedido.tipo || 'LOCAL').toUpperCase() + "\n";

        if (pedido.tipo === 'mesa') {
            d += char.boldOn + "MESA: " + char.boldOff + (pedido.mesa_nombre || 'N/A') + "\n";
        }

        d += "--------------------------------\n";

        // --- ITEMS (RESALTADOS) ---
        (pedido.pedido_items || []).forEach(item => {
            d += char.boldOn + `${item.cantidad} x ${item.nombre || item.producto_nombre}` + char.boldOff + "\n";

            if (item.agregados && item.agregados.length > 0) {
                item.agregados.forEach(ag => {
                    d += `  > ${ag.nombre}\n`;
                });
            }
            if (item.notas) {
                d += char.boldOn + `  NOTA: ${item.notas}` + char.boldOff + "\n";
            }
        });

        // --- PIE ---
        d += "--------------------------------\n";
        d += char.center + "--- FIN COMANDA ---\n\n\n";
        d += char.cut;

        return [d];
    }
};
