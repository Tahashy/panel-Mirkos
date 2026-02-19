/**
 * Servicio de Impresión para Impresoras Térmicas (ESC/POS)
 * Utiliza el Plugin de Impresión de Parzibyte como intermediario.
 */

const PLUGIN_URL = 'http://localhost:8080/imprimir';

export const impresionService = {
    /**
     * Envía una lista de comandos al plugin local
     */
    enviarAlPlugin: async (operaciones, ipImpresora) => {
        try {
            const payload = {
                operaciones: operaciones,
                nombreImpresora: ipImpresora, // El plugin de parzibyte permite usar la IP como nombre si es de red
                serial: ""
            };

            const response = await fetch(PLUGIN_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.ok) throw new Error(result.message || 'Error en el plugin');
            return true;
        } catch (error) {
            console.error('Error de impresión:', error);
            throw error;
        }
    },

    /**
     * Genera comandos básicos ESC/POS para un ticket de pedido
     */
    formatearTicket: (pedido, opciones = {}) => {
        const ops = [];

        // Inicializar
        ops.push({ nombre: "Iniciar", argumentos: [] });
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [1] }); // Centro

        // Encabezado
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [true] });
        ops.push({ nombre: "EscribirTexto", argumentos: [`${opciones.empresa || 'MIRKOS'}\n`] });
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [false] });
        ops.push({ nombre: "EscribirTexto", argumentos: [`Pedido #${pedido.numero_pedido}\n`] });
        ops.push({ nombre: "EscribirTexto", argumentos: [`Fecha: ${new Date(pedido.created_at).toLocaleString()}\n`] });
        ops.push({ nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] });

        // Items
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [0] }); // Izquierda
        (pedido.pedido_items || []).forEach(item => {
            const nombre = (item.nombre || item.producto_nombre || 'Producto').substring(0, 20);
            const cant = item.cantidad.toString().padStart(2, ' ');
            const precio = (parseFloat(item.precio || item.precio_unitario || 0) * item.cantidad).toFixed(2);

            ops.push({ nombre: "EscribirTexto", argumentos: [`${cant}x ${nombre.padEnd(20, ' ')} ${precio.padStart(7, ' ')}\n`] });

            // Agregados
            if (item.agregados && item.agregados.length > 0) {
                item.agregados.forEach(ag => {
                    ops.push({ nombre: "EscribirTexto", argumentos: [`   + ${ag.nombre.substring(0, 25)}\n`] });
                });
            }
        });

        ops.push({ nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] });

        // Totales
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [2] }); // Derecha
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [true] });
        ops.push({ nombre: "EscribirTexto", argumentos: [`TOTAL: $${parseFloat(pedido.total || 0).toFixed(2)}\n`] });
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [false] });

        // Pie
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [1] }); // Centro
        ops.push({ nombre: "EscribirTexto", argumentos: ["\n¡Gracias por su preferencia!\n\n\n"] });

        // Corte
        ops.push({ nombre: "Corte", argumentos: [1] });

        return ops;
    },

    /**
     * Genera comandos para comanda de cocina
     */
    formatearComanda: (pedido) => {
        const ops = [];
        ops.push({ nombre: "Iniciar", argumentos: [] });
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [1] });
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [true] });
        ops.push({ nombre: "EscribirTexto", argumentos: ["*** COMANDA DE COCINA ***\n"] });
        ops.push({ nombre: "EscribirTexto", argumentos: [`PEDIDO #${pedido.numero_pedido}\n`] });
        ops.push({ nombre: "EstablecerEnfatizado", argumentos: [false] });

        if (pedido.tipo === 'mesa') {
            ops.push({ nombre: "EscribirTexto", argumentos: [`MESA: ${pedido.mesa_nombre || 'N/A'}\n`] });
        }

        ops.push({ nombre: "EscribirTexto", argumentos: ["--------------------------------\n"] });
        ops.push({ nombre: "EstablecerAlineacion", argumentos: [0] });

        (pedido.pedido_items || []).forEach(item => {
            ops.push({ nombre: "EstablecerEnfatizado", argumentos: [true] });
            ops.push({ nombre: "EscribirTexto", argumentos: [`${item.cantidad}x ${item.nombre || item.producto_nombre}\n`] });
            ops.push({ nombre: "EstablecerEnfatizado", argumentos: [false] });

            if (item.agregados && item.agregados.length > 0) {
                item.agregados.forEach(ag => {
                    ops.push({ nombre: "EscribirTexto", argumentos: [`  > ${ag.nombre}\n`] });
                });
            }
            if (item.notas) {
                ops.push({ nombre: "EscribirTexto", argumentos: [`  NOTA: ${item.notas}\n`] });
            }
        });

        ops.push({ nombre: "EscribirTexto", argumentos: ["\n\n"] });
        ops.push({ nombre: "Corte", argumentos: [1] });

        return ops;
    }
};
