import { z } from 'zod';
import { AddressSchema } from './address';
import { PackageSchema } from './package';

export const ServiceLevelSchema = z.enum([
    'GROUND',
    'EXPRESS',
    'PRIORITY',
    'OVERNIGHT',
    'TWO_DAY',
    'THREE_DAY',
]);

export type ServiceLevel = z.infer<typeof ServiceLevelSchema>;

export const RateRequestSchema = z.object({
    origin: AddressSchema,
    destination: AddressSchema,
    packages: z.array(PackageSchema).min(1, 'At least one package is required'),
    serviceLevel: ServiceLevelSchema.optional(),
    shipDate: z.string().optional(), // ISO date string
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

export const RateQuoteSchema = z.object({
    carrier: z.string(),
    service: z.string(),
    serviceLevel: ServiceLevelSchema,
    totalPrice: z.number(),
    currency: z.string().default('USD'),
    estimatedDeliveryDate: z.string().optional(),
    transitDays: z.number().optional(),
    guaranteedDelivery: z.boolean().default(false),
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;

export const RateResponseSchema = z.object({
    success: z.boolean(),
    quotes: z.array(RateQuoteSchema),
    requestId: z.string().optional(),
});

export type RateResponse = z.infer<typeof RateResponseSchema>;
