import { Timestamp } from '@angular/fire/firestore'; // Import Timestamp

/**
 * Roles de usuario en el sistema.
 */
export enum UserRole {
  Customer = 'customer',
  Admin = 'admin',
}

/**
 * Representa una dirección de envío del usuario.
 */
export interface ShippingAddress {
  alias: string; // ej. "Casa", "Oficina"
  street: string;
  city: string;
  department: string;
  postalCode?: string;
  instructions?: string; // Indicaciones adicionales para la entrega
}

/**
 * Representa la dirección de facturación del usuario.
 */
export interface BillingAddress {
  alias: string; // ej. "Casa", "Oficina"
  street: string;
  city: string;
  department: string;
  postalCode?: string;
}


/**
 * Representa un usuario de la tienda.
 */
export interface User {
  uid: string; // ID de autenticación de Firebase
  phoneNumber: string; // Número de WhatsApp para login y notificaciones
  displayName: string; // Nombre del cliente
  whatsapp_verified: boolean; // Verificación de WhatsApp
  profile_status: "incomplete" | "complete"; // Estado de registro de perfil
  
  // Direcciones guardadas por el usuario
  addresses?: ShippingAddress[];

  //Dirección de facturación
  billingAddress?: BillingAddress;
  
  // Rol del usuario
  role: UserRole;
  
  // Metadatos
  createdAt: Timestamp; // Fecha de registro
}

