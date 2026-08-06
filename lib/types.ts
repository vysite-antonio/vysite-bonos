export type Rol = "admin" | "tecnico";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  cif: string | null;
  direccion?: string | null;
  token_portal?: string;
  token_generado_en?: string | null;
}

export interface Bono {
  id: string;
  cliente_id: string;
  num_factura: string;
  horas_totales: number;
  horas_usadas: number;
  precio: number | null;
  precio_hora: number | null;
  fecha_creacion: string;
  fecha_caducidad: string | null;
  notas: string | null;
  activo: boolean;
  // Papelera: true si un admin lo eliminó. La fila no se borra (para no
  // romper el historial de sus partes); se filtra en las vistas normales y
  // se recupera con restaurar_bono, o se purga de verdad a los 30 días.
  eliminado: boolean;
  eliminado_en: string | null;
  eliminado_por: string | null;
  clientes?: { nombre: string } | null;
}

export type Modalidad = "presencial" | "remota";

export interface Servicio {
  id: string;
  num_parte: string;
  bono_id: string | null;
  cliente_id: string;
  trabajador_id: string | null;
  trabajador_nombre: string | null;
  tipo: "tecnico" | "marketing";
  modalidad: Modalidad;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  horas: number;
  descripcion: string;
  material: string | null;
  firma_cliente: string | null;
  firma_tecnico: string | null;
  firmante_nombre: string | null;
  creado_por: string | null;
  creado_en: string;
  anulado: boolean;
  anulado_motivo: string | null;
  anulado_por: string | null;
  anulado_en: string | null;
  // Traza de edición posterior a la firma. Si editado es true, el PDF lo
  // indica: el cliente firmó una versión anterior del documento.
  editado: boolean;
  editado_en: string | null;
  editado_por: string | null;
  clientes?: { nombre: string } | null;
  bonos?: { num_factura: string } | null;
}
