import { BadRequestException } from '@nestjs/common';
import type { Prisma, PropertyStayFeeRule, PrismaClient } from '@repo/database/client';
import type { StayFeeRuleDto, StayFeeRuleView, StayFeeRulesMode } from '@repo/shared';
import {
  StayFeeRulesValidationCodes,
  buildSimpleCatchAllRule,
  deriveSimpleFees,
  isCatchAllRule,
  validateStayFeeRules,
  type StayFeeRuleInput,
} from '@repo/shared';

type Tx = Prisma.TransactionClient | PrismaClient;

export function toStayFeeRuleView(rule: PropertyStayFeeRule): StayFeeRuleView {
  return {
    id: rule.id,
    dateFrom: rule.dateFrom ? rule.dateFrom.toISOString().slice(0, 10) : null,
    dateTo: rule.dateTo ? rule.dateTo.toISOString().slice(0, 10) : null,
    minNights: rule.minNights,
    maxNights: rule.maxNights,
    cleaningFee: rule.cleaningFee,
    depositType: rule.depositType,
    depositValue: rule.depositValue,
    sortOrder: rule.sortOrder,
  };
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toStayFeeRuleInput(rule: StayFeeRuleView | StayFeeRuleInput): StayFeeRuleInput {
  return {
    id: rule.id,
    dateFrom: rule.dateFrom ?? null,
    dateTo: rule.dateTo ?? null,
    minNights: rule.minNights,
    maxNights: rule.maxNights ?? null,
    cleaningFee: rule.cleaningFee,
    depositType: rule.depositType,
    depositValue: rule.depositValue,
    sortOrder: rule.sortOrder,
  };
}

export function normalizeStayFeeRulesFromDto(params: {
  mode?: StayFeeRulesMode;
  rules?: StayFeeRuleDto[];
  cleaningFee?: number;
  securityDeposit?: number;
  propertyMinNights?: number;
  propertyMaxNights?: number | null;
  propertyPricePerNight?: number | null;
  existingRules?: StayFeeRuleInput[];
  isCreate?: boolean;
}): { mode: StayFeeRulesMode; rules: StayFeeRuleInput[] } {
  const mode = params.mode ?? 'SIMPLE';
  const hasRulesPayload = Boolean(params.rules && params.rules.length > 0);
  const rulesExplicitlyEmpty = params.rules !== undefined && params.rules.length === 0;
  const hasSimplePayload = params.cleaningFee !== undefined || params.securityDeposit !== undefined;
  if (mode === 'RULES' && hasSimplePayload) {
    throw new BadRequestException(StayFeeRulesValidationCodes.SIMPLE_FIELDS_IN_RULES_MODE);
  }
  if (mode === 'SIMPLE' && hasRulesPayload) {
    throw new BadRequestException(StayFeeRulesValidationCodes.RULES_PAYLOAD_IN_SIMPLE_MODE);
  }
  if (rulesExplicitlyEmpty) {
    throw new BadRequestException(StayFeeRulesValidationCodes.EMPTY_STAY_FEE_RULES);
  }
  let rules: StayFeeRuleInput[];
  if (hasRulesPayload) {
    rules = params.rules!.map((rule, index) => ({
      id: rule.id,
      dateFrom: rule.dateFrom ?? null,
      dateTo: rule.dateTo ?? null,
      minNights: rule.minNights,
      maxNights: rule.maxNights ?? null,
      cleaningFee: rule.cleaningFee,
      depositType: rule.depositType,
      depositValue: rule.depositValue,
      sortOrder: rule.sortOrder ?? index,
    }));
  } else if (hasSimplePayload) {
    rules = [buildSimpleCatchAllRule(params.cleaningFee ?? 0, params.securityDeposit ?? 0)];
  } else if (params.existingRules && params.existingRules.length > 0) {
    rules = params.existingRules.map((rule) => ({ ...rule }));
  } else if (params.isCreate) {
    rules = [buildSimpleCatchAllRule(0, 0)];
  } else {
    throw new BadRequestException(StayFeeRulesValidationCodes.STAY_FEE_PAYLOAD_REQUIRED);
  }
  if (mode === 'SIMPLE') {
    const existingCatchAll =
      params.existingRules?.find(isCatchAllRule) ?? rules.find(isCatchAllRule);
    const catchAll = buildSimpleCatchAllRule(
      params.cleaningFee ?? existingCatchAll?.cleaningFee ?? 0,
      params.securityDeposit ??
        (existingCatchAll?.depositType === 'FIXED' ? (existingCatchAll.depositValue ?? 0) : 0),
    );
    rules = [catchAll];
  }
  const error = validateStayFeeRules({
    mode,
    rules,
    propertyMinNights: params.propertyMinNights,
    propertyMaxNights: params.propertyMaxNights,
    propertyPricePerNight: params.propertyPricePerNight,
  });
  if (error) throw new BadRequestException(error);
  return { mode, rules };
}

export function stayFeeCreateManyInput(
  propertyId: string,
  rules: StayFeeRuleInput[],
): Prisma.PropertyStayFeeRuleCreateManyInput[] {
  return rules.map((rule, index) => ({
    propertyId,
    dateFrom: parseDateOnly(rule.dateFrom),
    dateTo: parseDateOnly(rule.dateTo),
    minNights: rule.minNights,
    maxNights: rule.maxNights ?? null,
    cleaningFee: rule.cleaningFee,
    depositType: rule.depositType,
    depositValue: rule.depositValue,
    sortOrder: rule.sortOrder ?? index,
  }));
}

export async function persistStayFeeRules(
  tx: Tx,
  propertyId: string,
  mode: StayFeeRulesMode,
  rules: StayFeeRuleInput[],
): Promise<void> {
  if (mode === 'RULES') {
    await tx.propertyStayFeeRule.deleteMany({ where: { propertyId } });
    await tx.propertyStayFeeRule.createMany({
      data: stayFeeCreateManyInput(propertyId, rules),
    });
    return;
  }
  const catchAll = rules.find(isCatchAllRule);
  if (!catchAll) {
    throw new BadRequestException(StayFeeRulesValidationCodes.SIMPLE_REQUIRES_CATCH_ALL);
  }
  await tx.propertyStayFeeRule.deleteMany({ where: { propertyId } });
  await tx.propertyStayFeeRule.create({
    data: {
      propertyId,
      dateFrom: null,
      dateTo: null,
      minNights: 1,
      maxNights: null,
      cleaningFee: catchAll.cleaningFee,
      depositType: 'FIXED',
      depositValue: catchAll.depositType === 'FIXED' ? catchAll.depositValue : 0,
      sortOrder: 0,
    },
  });
}

export function derivedPropertyFees(
  mode: StayFeeRulesMode,
  rules: PropertyStayFeeRule[],
): { cleaningFee: number | null; securityDeposit: number | null } {
  if (mode === 'RULES') {
    return { cleaningFee: null, securityDeposit: null };
  }
  return deriveSimpleFees(rules.map(toStayFeeRuleView));
}

export { toStayFeeRuleInput };
