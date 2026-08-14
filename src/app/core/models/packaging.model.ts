export enum PackagingType {
  Box = 'caja',
  Bag = 'bolsa',
  Wrapping = 'envoltorio',
}

export interface PackagingOption {
  type: PackagingType;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export const PACKAGING_OPTIONS: PackagingOption[] = [
  {
    type: PackagingType.Box,
    name: 'Caja de Regalo',
    description: 'Una elegante caja con lazo, ideal para sorprender.',
    price: 0,
    imageUrl: 'https://placehold.co/100x100/eeeeee/aaaaaa?text=Caja',
  },
  {
    type: PackagingType.Bag,
    name: 'Bolsa Decorativa',
    description: 'Una bolsa de papel con un diseño moderno.',
    price: 0,
    imageUrl: 'https://placehold.co/100x100/eeeeee/aaaaaa?text=Bolsa',
  },
  {
    type: PackagingType.Wrapping,
    name: 'Envoltorio Especial',
    description: 'Papel de regalo con un diseño único.',
    price: 0,
    imageUrl: 'https://placehold.co/100x100/eeeeee/aaaaaa?text=Envoltorio',
  },
];
