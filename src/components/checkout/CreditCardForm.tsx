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

function getMonthlyRate(n: number): number {
  if (n <= 3) return 0;
  if (n <= 6) return 0.0199; // 1.99% a.m.
  return 0.0249; // 2.49% a.m.
}

function calcTotalWithInterest(total: number, n: number): number {
  const rate = getMonthlyRate(n);
  if (rate === 0) return total;
  // Price table: PMT = PV * r / (1 - (1+r)^-n)
  const pmt = total * rate / (1 - Math.pow(1 + rate, -n));
  return pmt * n;
}

export function getInstallmentOptions(total: number): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  for (let n = 1; n <= 12; n++) {
    // Tier limits
    if (n > 6 && total < 500) break;
    if (n > 3 && total < 200) break;

    const totalWithInterest = calcTotalWithInterest(total, n);
    const installmentValue = totalWithInterest / n;

    // Min installment R$20
    if (installmentValue < 20 && n > 1) break;

    const rate = getMonthlyRate(n);
    let label: string;
    if (rate === 0) {
      label = `${n}x de R$ ${installmentValue.toFixed(2).replace(".", ",")} sem juros`;
    } else {
      label = `${n}x de R$ ${installmentValue.toFixed(2).replace(".", ",")} (${(rate * 100).toFixed(2).replace(".", ",")}% a.m.)`;
    }

    options.push({ n, label, installmentValue, totalWithInterest });
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
        {selectedOpt && selectedOpt.n > 3 && (
          <p className="text-xs text-muted-foreground">
            Total com juros: <span className="font-semibold text-foreground">R$ {selectedOpt.totalWithInterest.toFixed(2).replace(".", ",")}</span>
          </p>
        )}
      </div>
    </div>
  );
}
