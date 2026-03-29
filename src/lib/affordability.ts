export function estimateMonthlyPayment(
  price: number,
  downPaymentPercent = 20,
  annualRatePercent = 7.5,
  years = 20
) {
  if (!Number.isFinite(price) || price <= 0) return 0;

  const principal = price * Math.max(0, 1 - downPaymentPercent / 100);
  const monthlyRate = annualRatePercent / 100 / 12;
  const months = Math.max(1, years * 12);

  if (monthlyRate <= 0) return principal / months;

  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function formatVndAmount(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}
