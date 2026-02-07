import { z } from 'zod';

export const WeightUnitSchema = z.enum(['LB', 'KG', 'OZ']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const DimensionUnitSchema = z.enum(['IN', 'CM']);
export type DimensionUnit = z.infer<typeof DimensionUnitSchema>;

export const DimensionsSchema = z.object({
    length: z.number().positive('Length must be positive'),
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    unit: DimensionUnitSchema.default('IN'),
});

export type Dimensions = z.infer<typeof DimensionsSchema>;

export const WeightSchema = z.object({
    value: z.number().positive('Weight must be positive'),
    unit: WeightUnitSchema.default('LB'),
});

export type Weight = z.infer<typeof WeightSchema>;

export const PackageSchema = z.object({
    weight: WeightSchema,
    dimensions: DimensionsSchema.optional(),
    description: z.string().optional(),
    insuredValue: z.number().positive().optional(),
    isSignatureRequired: z.boolean().default(false),
});

export type Package = z.infer<typeof PackageSchema>;
