// GERADO POR scripts/optimize-images.mjs — não editar à mão.
// Rode `npm run media:images` para regenerar.

export type GalleryImage = {
  /** Identificador estável, usado como valor em Product.imageUrl */
  slug: string;
  /** Caminho da versão grande (cards em destaque, modal) */
  src: string;
  /** Caminho da versão pequena (thumbnails, galeria do painel) */
  thumb: string;
};

export const GALLERY: GalleryImage[] = [
  { slug: "ambiente-rodizio-01", src: "/cardapio/ambiente-rodizio-01-1000.webp", thumb: "/cardapio/ambiente-rodizio-01-480.webp" },
  { slug: "ambiente-rodizio-02", src: "/cardapio/ambiente-rodizio-02-1000.webp", thumb: "/cardapio/ambiente-rodizio-02-480.webp" },
  { slug: "ambiente-casal-01", src: "/cardapio/ambiente-casal-01-1000.webp", thumb: "/cardapio/ambiente-casal-01-480.webp" },
  { slug: "ambiente-casal-02", src: "/cardapio/ambiente-casal-02-1000.webp", thumb: "/cardapio/ambiente-casal-02-480.webp" },
  { slug: "ceviche-tilapia-leite-de-coco-01", src: "/cardapio/ceviche-tilapia-leite-de-coco-01-1000.webp", thumb: "/cardapio/ceviche-tilapia-leite-de-coco-01-480.webp" },
  { slug: "ceviche-tilapia-leite-de-coco-02", src: "/cardapio/ceviche-tilapia-leite-de-coco-02-1000.webp", thumb: "/cardapio/ceviche-tilapia-leite-de-coco-02-480.webp" },
  { slug: "equipe-sushiman", src: "/cardapio/equipe-sushiman-1000.webp", thumb: "/cardapio/equipe-sushiman-480.webp" },
  { slug: "ambiente-ceviche-servido", src: "/cardapio/ambiente-ceviche-servido-1000.webp", thumb: "/cardapio/ambiente-ceviche-servido-480.webp" },
  { slug: "ambiente-mesa-completa", src: "/cardapio/ambiente-mesa-completa-1000.webp", thumb: "/cardapio/ambiente-mesa-completa-480.webp" },
  { slug: "niguiri-01", src: "/cardapio/niguiri-01-1000.webp", thumb: "/cardapio/niguiri-01-480.webp" },
  { slug: "niguiri-barriga-salmao-01", src: "/cardapio/niguiri-barriga-salmao-01-1000.webp", thumb: "/cardapio/niguiri-barriga-salmao-01-480.webp" },
  { slug: "niguiri-barriga-salmao-02", src: "/cardapio/niguiri-barriga-salmao-02-1000.webp", thumb: "/cardapio/niguiri-barriga-salmao-02-480.webp" },
  { slug: "combo-sushi-01", src: "/cardapio/combo-sushi-01-1000.webp", thumb: "/cardapio/combo-sushi-01-480.webp" },
  { slug: "temaki-salmao", src: "/cardapio/temaki-salmao-1000.webp", thumb: "/cardapio/temaki-salmao-480.webp" },
];

/** Busca uma imagem da galeria pelo slug. */
export function findGalleryImage(slug: string): GalleryImage | undefined {
  return GALLERY.find((g) => g.slug === slug);
}
