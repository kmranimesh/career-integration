import axios from 'axios';
import { config } from '../../config';
import {
    RateRequest,
    RateResponse,
    RateRequestSchema,
    CarrierError,
    CarrierErrorCode,
} from '../../types';
import { CarrierClient } from '../carrier.interface';
import { UPSAuthClient } from './auth';
import { UPSRateResponseSchema, UPSRatedShipment } from './schemas';
import { buildUPSRateRequest, mapUPSRatedShipmentToQuote } from './mappers';

export class UPSClient implements CarrierClient {
    readonly name = 'UPS';
    private readonly authClient: UPSAuthClient;
    private readonly rateUrl: string;

    constructor(authClient?: UPSAuthClient) {
        this.authClient = authClient || new UPSAuthClient();
        this.rateUrl = `${config.ups.baseUrl}/api/rating/v1/Rate`;
    }

    async getRates(request: RateRequest): Promise<RateResponse> {
        const validation = RateRequestSchema.safeParse(request);
        if (!validation.success) {
            throw new CarrierError(
                `Invalid rate request: ${validation.error.errors.map(e => e.message).join(', ')}`,
                CarrierErrorCode.VALIDATION_ERROR,
                {
                    carrier: this.name,
                    details: { errors: validation.error.errors },
                }
            );
        }

        const upsRequest = buildUPSRateRequest(validation.data);

        try {
            const token = await this.authClient.getAccessToken();

            const response = await axios.post(
                this.rateUrl,
                upsRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'transId': `rate-${Date.now()}`,
                        'transactionSrc': 'cybership',
                    },
                    timeout: 30000,
                }
            );

            return this.parseRateResponse(response.data);
        } catch (error) {
            if (error instanceof CarrierError) {
                throw error;
            }
            throw this.handleRateError(error);
        }
    }

    private parseRateResponse(data: unknown): RateResponse {
        const parsed = UPSRateResponseSchema.safeParse(data);
        if (!parsed.success) {
            throw new CarrierError(
                `Invalid response from UPS API: ${parsed.error.message}`,
                CarrierErrorCode.INVALID_RESPONSE,
                {
                    carrier: this.name,
                    details: { errors: parsed.error.errors },
                }
            );
        }

        const ratedShipments = parsed.data.RateResponse.RatedShipment;
        const shipmentArray: UPSRatedShipment[] = Array.isArray(ratedShipments)
            ? ratedShipments
            : [ratedShipments];

        const quotes = shipmentArray.map(mapUPSRatedShipmentToQuote);

        return {
            success: true,
            quotes,
        };
    }

    private handleRateError(error: unknown): CarrierError {
        const axiosError = error as { isAxiosError?: boolean; code?: string; response?: { status: number; data?: unknown }; request?: unknown };

        if (axiosError.isAxiosError) {
            if (axiosError.code === 'ECONNABORTED') {
                return new CarrierError('Rate request timed out', CarrierErrorCode.TIMEOUT, {
                    carrier: this.name,
                    retryable: true,
                });
            }

            if (axiosError.response) {
                const status = axiosError.response.status;

                if (status === 401) {
                    return new CarrierError('Authentication failed', CarrierErrorCode.AUTH_FAILED, {
                        carrier: this.name,
                        statusCode: status,
                    });
                }

                if (status === 429) {
                    return new CarrierError('Rate limit exceeded', CarrierErrorCode.RATE_LIMIT_EXCEEDED, {
                        carrier: this.name,
                        statusCode: status,
                        retryable: true,
                    });
                }

                if (status >= 500) {
                    return new CarrierError('UPS service unavailable', CarrierErrorCode.SERVICE_UNAVAILABLE, {
                        carrier: this.name,
                        statusCode: status,
                        retryable: true,
                    });
                }

                const errorData = axiosError.response.data;
                return new CarrierError(
                    `UPS API error: ${JSON.stringify(errorData)}`,
                    CarrierErrorCode.CARRIER_ERROR,
                    {
                        carrier: this.name,
                        statusCode: status,
                        details: errorData as Record<string, unknown>,
                    }
                );
            }

            return new CarrierError('Network error during rate request', CarrierErrorCode.NETWORK_ERROR, {
                carrier: this.name,
                retryable: true,
            });
        }

        return new CarrierError('Unknown error during rate request', CarrierErrorCode.UNKNOWN_ERROR, {
            carrier: this.name,
        });
    }
}
