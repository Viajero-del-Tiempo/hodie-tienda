import { Timestamp } from 'firebase/firestore';
import { PackagingOption } from './packaging.model';
import { ShippingAddress } from './user.model';

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
  productName: string;
  productSku: string;
  quantity: number;

  // Precio unitario en el momento de la compra
  price: number;

  // Empaque seleccionado por el cliente
  // Empaque seleccionado por el cliente
  selectedPackaging: PackagingOption | null;

  // URL de la imagen para mostrar en el resumen
  imageUrl: string;
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

  // Estado y seguimiento
  status: OrderStatus;
  trackingNumber?: string; // Número de seguimiento del transportista

  // Totales
  subtotal: number; // Suma de (item.price * item.quantity)
  shippingCost: number; // Costo de envío
  total: number; // subtotal + shippingCost

  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
