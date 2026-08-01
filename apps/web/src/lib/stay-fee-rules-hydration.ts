import { deriveSimpleFees, type StayFeeRuleInput } from '@repo/shared';

export function hydrateSimpleFeeAmounts(params: {
  cleaningFee: number | null | undefined;
  securityDeposit: number | null | undefined;
  stayFeeRules: StayFeeRuleInput[];
}): { cleaningFee: number; securityDeposit: number } {
  const derived = deriveSimpleFees(params.stayFeeRules);
  return {
    cleaningFee: params.cleaningFee ?? derived.cleaningFee,
    securityDeposit: params.securityDeposit ?? derived.securityDeposit,
  };
}
