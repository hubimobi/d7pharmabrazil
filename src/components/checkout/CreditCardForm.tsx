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
  interestFreeLimit?: number;
  maxTotalInstallments?: number;
}

function getMonthlyRate(n: number, interestFreeLimit: number): number {
  if (n <= interestFreeLimit) return 0;
  if (n <= 6) return 0.0199; // 1.99% a.m.
  return 0.0249; // 2.49% a.m.
}

function calcTotalWithInterest(total: number, n: number, interestFreeLimit: number): number {
  const rate = getMonthlyRate(n, interestFreeLimit);
  if (rate === 0) return total;
  const pmt = total * rate / (1 - Math.pow(1 + rate, -n));
  return pmt * n;
}

export function getInstallmentOptions(total: number, interestFreeLimit = 3, maxTotal = 12): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  for (let n = 1; n <= maxTotal; n++) {
    // Tier limits
    if (n > 6 && total < 500) break;
    if (n > interestFreeLimit && total < 200) break;

    const totalWithInterest = calcTotalWithInterest(total, n, interestFreeLimit);
    const installmentValue = totalWithInterest / n;

    // Min installment R$20
    if (installmentValue < 20 && n > 1) break;

    const rate = getMonthlyRate(n, interestFreeLimit);
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
  interestFreeLimit = 3,
  maxTotalInstallments = 12,
}: CreditCardFormProps) {
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const installmentOptions = getInstallmentOptions(total, interestFreeLimit, maxTotalInstallments);
  const selectedOpt = installmentOptions.find((o) => o.n === installments);

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
          placeholder="0000 0000 0000 0000" inputMode="numeric"
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
            placeholder="MM" inputMode="numeric"
            value={card.expiryMonth}
            onChange={(e) => onChange({ ...card, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Ano *</Label>
          <Input
            required
            placeholder="AAAA" inputMode="numeric"
            value={card.expiryYear}
            onChange={(e) => onChange({ ...card, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            maxLength={4}
          />
        </div>
        <div className="space-y-2">
          <Label>CVV *</Label>
          <Input
            required
            placeholder="000" inputMode="numeric"
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
