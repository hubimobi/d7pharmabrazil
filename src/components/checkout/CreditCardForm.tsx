import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

interface CreditCardFormProps {
  card: CreditCardData;
  onChange: (card: CreditCardData) => void;
  installments: number;
  onInstallmentsChange: (n: number) => void;
  total: number;
}

export default function CreditCardForm({
  card,
  onChange,
  installments,
  onInstallmentsChange,
  total,
}: CreditCardFormProps) {
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const maxInstallments = 3;
  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => i + 1);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label>Nome no Cartão *</Label>
        <Input
          required
          placeholder="Nome como está no cartão"
          value={card.holderName}
          onChange={(e) => onChange({ ...card, holderName: e.target.value.toUpperCase() })}
        />
      </div>

      <div className="space-y-2">
        <Label>Número do Cartão *</Label>
        <Input
          required
          placeholder="0000 0000 0000 0000"
          value={formatCardNumber(card.number)}
          onChange={(e) => onChange({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16) })}
          maxLength={19}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Mês *</Label>
          <Input
            required
            placeholder="MM"
            value={card.expiryMonth}
            onChange={(e) => onChange({ ...card, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Ano *</Label>
          <Input
            required
            placeholder="AAAA"
            value={card.expiryYear}
            onChange={(e) => onChange({ ...card, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            maxLength={4}
          />
        </div>
        <div className="space-y-2">
          <Label>CVV *</Label>
          <Input
            required
            placeholder="000"
            value={card.ccv}
            onChange={(e) => onChange({ ...card, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            maxLength={4}
            type="password"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parcelas</Label>
        <Select value={String(installments)} onValueChange={(v) => onInstallmentsChange(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {installmentOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}x de R$ {(total / n).toFixed(2).replace(".", ",")} {n <= 3 ? "sem juros" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
