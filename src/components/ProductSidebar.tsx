import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface FilterSection {
  title: string;
  items: { value: string; label: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
}

interface ProductSidebarProps {
  manufacturers: { value: string; label: string; count: number }[];
  selectedManufacturers: string[];
  onToggleManufacturer: (v: string) => void;
  categories: { value: string; label: string; count: number }[];
  selectedCategories: string[];
  onToggleCategory: (v: string) => void;
  priceRange: [number, number];
  maxPrice: number;
  onPriceChange: (range: [number, number]) => void;
}

const CollapsibleFilter = ({ title, items, selected, onToggle }: FilterSection) => {
  const [open, setOpen] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-bold uppercase tracking-wide text-primary"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <label key={item.value} className="flex items-center gap-2 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
              <Checkbox
                checked={selected.includes(item.value)}
                onCheckedChange={() => onToggle(item.value)}
              />
              <span className="truncate">{item.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">({item.count})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductSidebar = ({
  manufacturers,
  selectedManufacturers,
  onToggleManufacturer,
  categories,
  selectedCategories,
  onToggleCategory,
  priceRange,
  maxPrice,
  onPriceChange,
}: ProductSidebarProps) => {
  const [priceOpen, setPriceOpen] = useState(true);

  return (
    <aside className="w-full space-y-4">
      <CollapsibleFilter
        title="Fabricante"
        items={manufacturers}
        selected={selectedManufacturers}
        onToggle={onToggleManufacturer}
      />

      <CollapsibleFilter
        title="Categorias"
        items={categories}
        selected={selectedCategories}
        onToggle={onToggleCategory}
      />

      {maxPrice > 0 && (
        <div className="border-b border-border pb-4">
          <button
            onClick={() => setPriceOpen(!priceOpen)}
            className="flex w-full items-center justify-between py-2 text-sm font-bold uppercase tracking-wide text-primary"
          >
            Preços
            {priceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {priceOpen && (
            <div className="mt-4 px-1">
              <Slider
                min={0}
                max={maxPrice}
                step={1}
                value={priceRange}
                onValueChange={(v) => onPriceChange(v as [number, number])}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>R$ {priceRange[0].toFixed(0)}</span>
                <span>R$ {priceRange[1].toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default ProductSidebar;
