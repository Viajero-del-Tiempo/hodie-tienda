import { Timestamp } from 'firebase/firestore';
import { CatalogPackagingOption } from './catalog.model';
import { BillingInput, BillingSnapshot, ShippingAddress } from './user.model';

/**
 * Estados por los que puede pasar un pedido.
 */
export enum OrderStatus {
  Pending = 'pending', // Pago pendiente
  Paid = 'paid', // Pagado
  Preparing = 'preparing', // En preparación
  Shipped = 'shipped', // Enviado
  Delivered = 'delivered', // Entregado
  Cancelled = 'cancelled', // Cancelado
}

/**
 * Representa un item dentro de un pedido.
 * Guardamos los datos del producto aquí para que el pedido no cambie
 * si el producto original es modificado en el futuro.
 */
export interface OrderItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  sku?: string;
  productName: string;
  productSku: string;
  quantity: number;

  // Precio unitario en el momento de la compra
  price: number;

  // Empaque seleccionado por el cliente
  selectedPackaging: CatalogPackagingOption | null;

  // URL de la imagen para mostrar en el resumen
  imageUrl: string;

  // Datos de personalización
  customization?: string;
  customizationPending?: boolean;
  customizationImageUrl?: string;
  customizationImagePending?: boolean;
  instructions?: string;
}

export interface CreateOrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  packagingType: string | null;
  customization?: string;
  customizationPending?: boolean;
  customizationImagePending?: boolean;
}

export interface CreateOrderRequest {
  items: CreateOrderItem[];
  shippingAddress: ShippingAddress;
  billing?: BillingInput;
  saveShippingAddress?: boolean;
  saveBillingProfile?: boolean;
}

export interface ShippingOptions {
  city: string;
  shippingMethod: 'local_gratis' | 'transportadora_contra_entrega';
  shippingCost: number;
  requiresRecipientDocument: boolean;
  label: string;
}
export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  createdAt?: string;
  updatedAt?: string;
  total: number;
  status: string;
}
export interface CustomerOrder extends CustomerOrderSummary {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billing: BillingSnapshot | null;
  subtotal: number;
  shippingCost: number;
  shippingMethod?: string;
  trackingNumber?: string;
  pdfDelivered?: boolean;
}
export interface CustomerOrdersPage {
  orders: CustomerOrderSummary[];
  nextCursor: string | null;
}

/**
 * Representa un pedido completo.
 */
export interface Order {
  id: string; // ID del documento en Firestore
  orderNumber: string; // Un número de pedido más amigable para el cliente (ej. "HODIE-00123")

  // Información del cliente
  userId: string;
  userDisplayName: string;
  userPhoneNumber: string;

  // Items del pedido
  items: OrderItem[];

  // Dirección de envío para este pedido
  shippingAddress: ShippingAddress;
  billing?: BillingSnapshot | null;
  shippingMethod?: string;

  // Estado y seguimiento
  status: OrderStatus;
  trackingNumber?: string; // Número de seguimiento del transportista

  // Totales
  subtotal: number; // Suma de (item.price * item.quantity)
  shippingCost: number; // Costo de envío
  total: number; // subtotal + shippingCost

  // Estado del comprobante
  pdfDelivered?: boolean; // true: comprobante entregado por WhatsApp; false: pendiente de envío

  // Estado de personalización
  customizationPending?: boolean; // true: tiene al menos un ítem con personalización pendiente
  customizationImagePending?: boolean;

  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
