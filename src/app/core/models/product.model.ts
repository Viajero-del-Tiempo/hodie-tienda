import { Timestamp } from 'firebase/firestore';
import { PackagingType } from './packaging.model';

/**
 * Representa un producto en la tienda.
 */
export interface Product {
  id: string; // ID del documento en Firestore
  name: string; // Nombre del producto (ej. "Taza Personalizada")
  description: string; // Descripción detallada
  price: number; // Precio base del producto
  sku: string; // Código de producto único
  
  // Imágenes del producto
  imageUrls?: string[]; // Lista de URLs de las imágenes (opcional)

  // Precios de los empaques para este producto específico
  packagingPrices?: {
    [key in PackagingType]?: number;
  };
  
  // Control de inventario
  stock: number; // Cantidad disponible
  
  // Estado de activación (soft-delete)
  active?: boolean;
  deletedAt?: Timestamp;

  // Metadatos
  createdAt: Timestamp; // Fecha de creación del producto
  updatedAt: Timestamp; // Última fecha de actualización
}