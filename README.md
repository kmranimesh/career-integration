# Cybership Carrier Integration Service

A TypeScript service for integrating with shipping carriers (UPS, with extensible architecture for FedEx, USPS, DHL).

## Features

- **Rate Shopping**: Get shipping rates from UPS
- **OAuth 2.0 Authentication**: Token caching and automatic refresh
- **Extensible Architecture**: Easy to add new carriers
- **Strong Typing**: Full TypeScript with Zod validation
- **Runtime Validation**: Validates both inputs AND API responses (no blind type assertions)
- **Error Handling**: Structured errors with retry hints

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run tests
npm test

# Build
npm run build
```

## Usage

```typescript
import { UPSClient } from './carriers/ups';

const client = new UPSClient();

const rates = await client.getRates({
  origin: {
    street1: '123 Sender St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    isResidential: false,
  },
  destination: {
    street1: '456 Receiver Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'US',
    isResidential: true,
  },
  packages: [
    {
      weight: { value: 5, unit: 'LB' },
      dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
      isSignatureRequired: false,
    },
  ],
});

console.log(rates.quotes);
// [{ carrier: 'UPS', service: 'UPS Ground', totalPrice: 15.50, ... }]
```

## Architecture

```
src/
├── config/           # Environment configuration
├── types/            # Domain types (carrier-agnostic)
│   ├── address.ts    # Address validation
│   ├── package.ts    # Package dimensions/weight
│   ├── rate.ts       # Rate request/response
│   └── errors.ts     # Structured error handling
└── carriers/
    ├── carrier.interface.ts  # Base interface for all carriers
    └── ups/
        ├── auth.ts       # OAuth token management
        ├── types.ts      # UPS-specific API types
        ├── mappers.ts    # Domain ↔ UPS type conversion
        ├── client.ts     # Main UPS client
        └── *.test.ts     # Integration tests
```

## Design Decisions

### 1. Carrier-Agnostic Domain Types
The caller never sees UPS-specific types. All requests/responses use our domain models (`RateRequest`, `RateResponse`). This means adding FedEx won't change any caller code.

### 2. Interface-Based Extensibility
All carriers implement `CarrierClient` interface:
```typescript
interface CarrierClient {
  readonly name: string;
  getRates(request: RateRequest): Promise<RateResponse>;
}
```

Adding a new carrier = create new folder + implement interface.

### 3. Token Lifecycle Management
- Tokens cached with 60-second buffer before expiry
- Automatic refresh on expired tokens
- Transparent to caller

### 4. Structured Error Handling
Every error includes:
- `code`: Machine-readable error type
- `carrier`: Which carrier failed
- `retryable`: Whether caller should retry
- `statusCode`: HTTP status if applicable

### 5. Input Validation
Zod validates all inputs before API calls. Invalid data never hits the network.

## Error Handling

```typescript
try {
  const rates = await client.getRates(request);
} catch (error) {
  if (error instanceof CarrierError) {
    console.log(error.code);      // 'TIMEOUT', 'AUTH_FAILED', etc.
    console.log(error.retryable); // true/false
    console.log(error.carrier);   // 'UPS'
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests use stubbed HTTP responses - no live API calls needed.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UPS_CLIENT_ID` | UPS OAuth client ID | Yes |
| `UPS_CLIENT_SECRET` | UPS OAuth client secret | Yes |
| `UPS_BASE_URL` | UPS API base URL | No (defaults to production) |

## Future Improvements

Given more time, I would add:

1. **Retry Logic**: Automatic retry with exponential backoff for retryable errors
2. **Rate Limiting**: Client-side rate limiting to avoid 429s
3. **Logging**: Structured logging with request/response tracing
4. **More Operations**: Label purchase, tracking, address validation
5. **More Carriers**: FedEx, USPS, DHL implementations
6. **Caching**: Cache rate quotes for identical requests
7. **Circuit Breaker**: Fail fast when carrier is down
