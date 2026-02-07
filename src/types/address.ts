import { z } from 'zod';

export const AddressSchema = z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    street1: z.string().min(1, 'Street address is required'),
    street2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
    postalCode: z.string().min(5, 'Postal code is required'),
    country: z.string().length(2, 'Use 2-letter country code').default('US'),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    isResidential: z.boolean().default(false),
});

export type Address = z.infer<typeof AddressSchema>;
