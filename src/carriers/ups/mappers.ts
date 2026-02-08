import { Address, Package, RateRequest, RateQuote, ServiceLevel } from '../../types';
import { UPSRatedShipment } from './schemas';
import { UPSAddress, UPSPackage, UPSRateRequest, UPSService } from './types';

const SERVICE_LEVEL_TO_UPS: Record<ServiceLevel, string> = {
    GROUND: '03',
    EXPRESS: '02',
    PRIORITY: '01',
    OVERNIGHT: '01',
    TWO_DAY: '02',
    THREE_DAY: '12',
};

const UPS_SERVICE_TO_LEVEL: Record<string, ServiceLevel> = {
    '01': 'OVERNIGHT',
    '02': 'TWO_DAY',
    '03': 'GROUND',
    '12': 'THREE_DAY',
    '13': 'EXPRESS',
    '14': 'OVERNIGHT',
};

const UPS_SERVICE_NAMES: Record<string, string> = {
    '01': 'UPS Next Day Air',
    '02': 'UPS 2nd Day Air',
    '03': 'UPS Ground',
    '12': 'UPS 3 Day Select',
    '13': 'UPS Next Day Air Saver',
    '14': 'UPS Next Day Air Early',
};

export function mapAddressToUPS(address: Address): UPSAddress {
    const lines = [address.street1];
    if (address.street2) lines.push(address.street2);

    return {
        AddressLine: lines,
        City: address.city,
        StateProvinceCode: address.state,
        PostalCode: address.postalCode,
        CountryCode: address.country,
        ...(address.isResidential && { ResidentialAddressIndicator: 'Y' }),
    };
}

export function mapPackageToUPS(pkg: Package): UPSPackage {
    const result: UPSPackage = {
        PackagingType: {
            Code: '02',
            Description: 'Customer Supplied Package',
        },
        PackageWeight: {
            UnitOfMeasurement: {
                Code: pkg.weight.unit === 'KG' ? 'KGS' : 'LBS',
            },
            Weight: pkg.weight.value.toString(),
        },
    };

    if (pkg.dimensions) {
        result.Dimensions = {
            UnitOfMeasurement: {
                Code: pkg.dimensions.unit,
            },
            Length: pkg.dimensions.length.toString(),
            Width: pkg.dimensions.width.toString(),
            Height: pkg.dimensions.height.toString(),
        };
    }

    return result;
}

export function mapServiceToUPS(serviceLevel: ServiceLevel): UPSService {
    return {
        Code: SERVICE_LEVEL_TO_UPS[serviceLevel],
    };
}

export function buildUPSRateRequest(request: RateRequest): UPSRateRequest {
    const shipperAddress = mapAddressToUPS(request.origin);
    const shipToAddress = mapAddressToUPS(request.destination);

    const rateRequest: UPSRateRequest = {
        RateRequest: {
            Request: {
                RequestOption: request.serviceLevel ? 'Rate' : 'Shop',
            },
            Shipment: {
                Shipper: {
                    Name: request.origin.name || request.origin.company || 'Shipper',
                    Address: shipperAddress,
                },
                ShipTo: {
                    Name: request.destination.name || request.destination.company || 'Recipient',
                    Address: shipToAddress,
                },
                ShipFrom: {
                    Name: request.origin.name || request.origin.company || 'Shipper',
                    Address: shipperAddress,
                },
                Package: request.packages.map(mapPackageToUPS),
            },
        },
    };

    if (request.serviceLevel) {
        rateRequest.RateRequest.Shipment.Service = mapServiceToUPS(request.serviceLevel);
    }

    return rateRequest;
}

export function mapUPSRatedShipmentToQuote(rated: UPSRatedShipment): RateQuote {
    const serviceCode = rated.Service.Code;
    const transitDays = rated.GuaranteedDelivery?.BusinessDaysInTransit
        ? parseInt(rated.GuaranteedDelivery.BusinessDaysInTransit, 10)
        : undefined;

    return {
        carrier: 'UPS',
        service: UPS_SERVICE_NAMES[serviceCode] || `UPS Service ${serviceCode}`,
        serviceLevel: UPS_SERVICE_TO_LEVEL[serviceCode] || 'GROUND',
        totalPrice: parseFloat(rated.TotalCharges.MonetaryValue),
        currency: rated.TotalCharges.CurrencyCode,
        transitDays,
        guaranteedDelivery: !!rated.GuaranteedDelivery,
    };
}
