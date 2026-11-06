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
  id?: string;
  recipientName?: string; // Opcional únicamente para registros históricos.
  recipientDocument?: string;
  alias: string; // ej. "Casa", "Oficina"
  street: string;
  city: string;
  department: string;
  postalCode?: string;
  instructions?: string; // Indicaciones adicionales para la entrega
}

export interface RucValidation {
  status: 'valid' | 'mismatch_confirmed';
  expectedDigit: number;
}
export interface BillingProfile {
  id?: string;
  alias?: string;
  legalName: string;
  ruc: string;
  rucValidation?: RucValidation;
  confirmedRuc?: string;
  acknowledgeRucMismatch?: boolean;
}
export interface BillingSnapshot {
  invoiceRequested: boolean;
  legalName?: string;
  ruc?: string;
  rucValidation?: RucValidation;
}
export interface BillingInput extends BillingSnapshot {
  confirmedRuc?: string;
  acknowledgeRucMismatch?: boolean;
}
export interface RucAnalysis {
  ruc: string;
  suggestedRuc: string;
  expectedDigit: number;
  status: 'valid' | 'mismatch' | 'confirmation_required';
  requiresConfirmation: boolean;
}
export interface ProfileUpdate {
  version: string;
  displayName: string;
  addresses: ShippingAddress[];
  billingProfiles: BillingProfile[];
  defaultAddressId?: string | null;
  defaultBillingProfileId?: string | null;
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
  role?: UserRole | 'customer' | 'admin'; // Rol de permisos
  whatsapp_verified: boolean; // Verificación de WhatsApp
  profile_status: "incomplete" | "complete"; // Estado de registro de perfil
  
  // Direcciones guardadas por el usuario
  addresses?: ShippingAddress[];
  defaultAddressId?: string | null;
  billingProfiles?: BillingProfile[];
  defaultBillingProfileId?: string | null;
  version?: string;

  //Dirección de facturación
  billingAddress?: BillingAddress;
  
  // Estado activo / desactivado (soft-delete)
  active?: boolean;
  deletedAt?: any;

  // Metadatos
  createdAt: any; // Fecha de registro (Timestamp o Date)
}
