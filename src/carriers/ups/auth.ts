import axios, { AxiosError } from 'axios';
import { config } from '../../config';
import { CarrierError, CarrierErrorCode } from '../../types';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number;
}

export class UPSAuthClient {
    private cachedToken: CachedToken | null = null;
    private readonly tokenUrl: string;
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor() {
        this.tokenUrl = `${config.ups.baseUrl}/security/v1/oauth/token`;
        this.clientId = config.ups.clientId;
        this.clientSecret = config.ups.clientSecret;
    }

    async getAccessToken(): Promise<string> {
        if (this.isTokenValid()) {
            return this.cachedToken!.accessToken;
        }

        return this.fetchNewToken();
    }

    private isTokenValid(): boolean {
        if (!this.cachedToken) return false;

        const bufferMs = 60 * 1000;
        return Date.now() < this.cachedToken.expiresAt - bufferMs;
    }

    private async fetchNewToken(): Promise<string> {
        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const response = await axios.post<TokenResponse>(
                this.tokenUrl,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${credentials}`,
                    },
                    timeout: 10000,
                }
            );

            const { access_token, expires_in } = response.data;

            this.cachedToken = {
                accessToken: access_token,
                expiresAt: Date.now() + expires_in * 1000,
            };

            return access_token;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    private handleAuthError(error: unknown): CarrierError {
        const axiosError = error as { isAxiosError?: boolean; code?: string; response?: { status: number; data?: unknown }; request?: unknown };

        if (axiosError.isAxiosError) {
            if (axiosError.code === 'ECONNABORTED') {
                return new CarrierError('Authentication request timed out', CarrierErrorCode.TIMEOUT, {
                    carrier: 'UPS',
                    retryable: true,
                });
            }

            if (axiosError.response) {
                const status = axiosError.response.status;

                if (status === 401) {
                    return new CarrierError('Invalid UPS credentials', CarrierErrorCode.AUTH_FAILED, {
                        carrier: 'UPS',
                        statusCode: status,
                    });
                }

                if (status === 429) {
                    return new CarrierError('Rate limit exceeded', CarrierErrorCode.RATE_LIMIT_EXCEEDED, {
                        carrier: 'UPS',
                        statusCode: status,
                        retryable: true,
                    });
                }

                return new CarrierError(`Authentication failed: ${status}`, CarrierErrorCode.CARRIER_ERROR, {
                    carrier: 'UPS',
                    statusCode: status,
                });
            }

            return new CarrierError('Network error during authentication', CarrierErrorCode.NETWORK_ERROR, {
                carrier: 'UPS',
                retryable: true,
            });
        }

        return new CarrierError('Unknown authentication error', CarrierErrorCode.UNKNOWN_ERROR, {
            carrier: 'UPS',
        });
    }

    clearCache(): void {
        this.cachedToken = null;
    }
}
