import { z } from 'zod';

export const UPSTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
});

export type UPSTokenResponse = z.infer<typeof UPSTokenResponseSchema>;

const UPSServiceSchema = z.object({
    Code: z.string(),
    Description: z.string().optional(),
});
const UPSMonetaryValueSchema = z.object({
    CurrencyCode: z.string(),
    MonetaryValue: z.string(),
});

const UPSRatedShipmentSchema = z.object({
    Service: UPSServiceSchema,
    TotalCharges: UPSMonetaryValueSchema,
    GuaranteedDelivery: z.object({
        BusinessDaysInTransit: z.string().optional(),
        DeliveryByTime: z.string().optional(),
    }).optional(),
    RatedPackage: z.array(z.object({
        TotalCharges: UPSMonetaryValueSchema,
    })).optional(),
});

export type UPSRatedShipment = z.infer<typeof UPSRatedShipmentSchema>;

export const UPSRateResponseSchema = z.object({
    RateResponse: z.object({
        Response: z.object({
            ResponseStatus: z.object({
                Code: z.string(),
                Description: z.string(),
            }),
            Alert: z.array(z.object({
                Code: z.string(),
                Description: z.string(),
            })).optional(),
            TransactionReference: z.object({
                CustomerContext: z.string().optional(),
            }).optional(),
        }),
        RatedShipment: z.union([
            UPSRatedShipmentSchema,
            z.array(UPSRatedShipmentSchema),
        ]),
    }),
});

export type UPSRateResponse = z.infer<typeof UPSRateResponseSchema>;
