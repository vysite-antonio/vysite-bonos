// Tipos de la app derivados del esquema real de Supabase (lib/database.types.ts,
// generado y NO editado a mano). Aquí solo añadimos lo que la BD no expresa:
// uniones literales (rol, tipo, modalidad) y los campos de join que llegan al
// hacer select("*, clientes(nombre)") pero no forman parte de la fila cruda.
import type { Tables } from "./database.types";

export type Rol = "admin" | "tecnico";
export type Modalidad = "presencial" | "remota";
export type TipoServicio = "tecnico" | "marketing";

export type Perfil = Omit<Tables<"profiles">, "rol"> & { rol: Rol };

export type Cliente = Tables<"clientes">;

export interface Bono extends Tables<"bonos"> {
  clientes?: { nombre: string } | null;
}

export interface Servicio
  extends Omit<Tables<"servicios">, "tipo" | "modalidad"> {
  tipo: TipoServicio;
  modalidad: Modalidad;
  clientes?: { nombre: string } | null;
  bonos?: { num_factura: string } | null;
}
