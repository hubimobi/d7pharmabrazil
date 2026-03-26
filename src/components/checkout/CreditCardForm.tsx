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

export interface InstallmentOption {
  n: number;
  label: string;
  installmentValue: number;
  totalWithInterest: number;
}

interface CreditCardFormProps {
  card: CreditCardData;
  onChange: (card: CreditCardData) => void;
  installments: number;
  onInstallmentsChange: (n: number) => void;
  total: number;
}

function getInstallmentOptions(total: number) {
  // Rules:
  // 1-3x sem juros always available
  // 4-6x available if total >= 200
  // 7-12x available if total >= 500
  // Min installment value: R$20
  const options: { n: number; label: string; value: number }[] = [];

  for (let n = 1; n <= 12; n++) {
    const installmentValue = total / n;

    // Min installment R$20
    if (installmentValue < 20 && n > 1) break;

    // Tier limits
    if (n > 6 && total < 500) break;
    if (n > 3 && total < 200) break;

    const noInterest = n <= 3;
    const label = `${n}x de R$ ${installmentValue.toFixed(2).replace(".", ",")}${noInterest ? " sem juros" : ""}`;

    options.push({ n, label, value: installmentValue });
  }

  return options;
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

  const installmentOptions = getInstallmentOptions(total);

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
            {installmentOptions.map((opt) => (
              <SelectItem key={opt.n} value={String(opt.n)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
