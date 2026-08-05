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
  clientes?: { nombre: string } | null;
  bonos?: { num_factura: string } | null;
}
