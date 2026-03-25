import productProteinKids from "@/assets/product-protein-kids.png";
import productTcf4 from "@/assets/product-tcf4.png";
import productEaa from "@/assets/product-eaa.png";

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice: number;
  image: string;
  benefits: string[];
  rating: number;
  reviews: number;
  badge?: string;
  stock: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Active Health PROTEIN KIDS",
    slug: "protein-kids",
    shortDescription: "Proteína premium para crianças com sabor irresistível e nutrição completa.",
    description: "O Active Health PROTEIN KIDS foi desenvolvido com a mais alta tecnologia farmacêutica para oferecer proteína de qualidade superior para crianças em fase de crescimento. Fórmula exclusiva com vitaminas e minerais essenciais.",
    price: 149.90,
    originalPrice: 199.90,
    image: productProteinKids,
    benefits: [
      "Proteína de alta biodisponibilidade",
      "Vitaminas e minerais essenciais",
      "Sabor aprovado pelas crianças",
      "Sem açúcar adicionado",
      "Aprovado por pediatras",
    ],
    rating: 4.9,
    reviews: 127,
    badge: "Mais Vendido",
    stock: 23,
  },
  {
    id: "2",
    name: "TCF-4 Control",
    slug: "tcf4-control",
    shortDescription: "Controle avançado com tecnologia farmacêutica de ponta.",
    description: "O TCF-4 Control é um suplemento de alta performance desenvolvido com tecnologia exclusiva para controle metabólico avançado. Formulação premium com ingredientes de origem farmacêutica.",
    price: 189.90,
    originalPrice: 249.90,
    image: productTcf4,
    benefits: [
      "Tecnologia TCF-4 exclusiva",
      "Controle metabólico avançado",
      "Ingredientes farmacêuticos",
      "Resultados em 30 dias",
      "Sem efeitos colaterais",
    ],
    rating: 4.8,
    reviews: 89,
    badge: "Lançamento",
    stock: 15,
  },
  {
    id: "3",
    name: "EAA Aminoácido",
    slug: "eaa-aminoacido",
    shortDescription: "Aminoácidos essenciais para recuperação e performance muscular.",
    description: "O EAA Aminoácido da D7 Pharma oferece todos os 9 aminoácidos essenciais em proporções cientificamente otimizadas para máxima absorção e recuperação muscular.",
    price: 129.90,
    originalPrice: 169.90,
    image: productEaa,
    benefits: [
      "9 aminoácidos essenciais",
      "Absorção ultrarrápida",
      "Recuperação muscular acelerada",
      "Melhora da performance",
      "Pureza farmacêutica",
    ],
    rating: 4.7,
    reviews: 64,
    badge: "Estoque Limitado",
    stock: 8,
  },
];
