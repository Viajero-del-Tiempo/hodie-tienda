import { User } from '../../src/app/core/models/user.model';
import { ShippingOptions } from '../../src/app/core/models/order.model';
export const addressFixture = () => ({ id: 'test-address', alias: 'Dirección Alfa', recipientName: 'Destinatario Alfa',
  street: 'Referencia ficticia', city: 'Ciudad Alfa', department: 'Departamento Alfa', recipientDocument: '1234567' });
export const shippingOptions = (requiresRecipientDocument = true): ShippingOptions => ({ city: 'Ciudad Alfa',
  shippingMethod: requiresRecipientDocument ? 'transportadora_contra_entrega' : 'local_gratis', shippingCost: 0,
  requiresRecipientDocument, label: requiresRecipientDocument ? 'Transportadora contra entrega' : 'Envío local gratuito' });
export const userFixture = (addresses = true): User => ({ uid: 'test-user', displayName: 'Cliente Alfa', phoneNumber: 'test-phone',
  role: 'customer', active: true, whatsapp_verified: true, profile_status: 'complete', createdAt: '2026-01-01', version: 'test-version',
  addresses: addresses ? [addressFixture(), { ...addressFixture(), id: 'test-second', street: 'Otra referencia' }] : [],
  defaultAddressId: addresses ? 'test-second' : null, billingProfiles: [], defaultBillingProfileId: null });
