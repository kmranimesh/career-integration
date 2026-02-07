export interface UPSAddress {
    AddressLine: string[];
    City: string;
    StateProvinceCode: string;
    PostalCode: string;
    CountryCode: string;
    ResidentialAddressIndicator?: string;
}

export interface UPSShipper {
    Name: string;
    Address: UPSAddress;
}

export interface UPSShipTo {
    Name: string;
    Address: UPSAddress;
}

export interface UPSShipFrom {
    Name: string;
    Address: UPSAddress;
}

export interface UPSPackageWeight {
    UnitOfMeasurement: {
        Code: string;
        Description?: string;
    };
    Weight: string;
}

export interface UPSDimensions {
    UnitOfMeasurement: {
        Code: string;
        Description?: string;
    };
    Length: string;
    Width: string;
    Height: string;
}

export interface UPSPackage {
    PackagingType: {
        Code: string;
        Description?: string;
    };
    Dimensions?: UPSDimensions;
    PackageWeight: UPSPackageWeight;
}

export interface UPSService {
    Code: string;
    Description?: string;
}

export interface UPSRateRequest {
    RateRequest: {
        Request: {
            RequestOption: string;
            TransactionReference?: {
                CustomerContext?: string;
            };
        };
        Shipment: {
            Shipper: UPSShipper;
            ShipTo: UPSShipTo;
            ShipFrom: UPSShipFrom;
            Service?: UPSService;
            Package: UPSPackage[];
        };
    };
}

export interface UPSMonetaryValue {
    CurrencyCode: string;
    MonetaryValue: string;
}

export interface UPSRatedShipment {
    Service: UPSService;
    TotalCharges: UPSMonetaryValue;
    GuaranteedDelivery?: {
        BusinessDaysInTransit?: string;
        DeliveryByTime?: string;
    };
    RatedPackage?: Array<{
        TotalCharges: UPSMonetaryValue;
    }>;
}

export interface UPSRateResponse {
    RateResponse: {
        Response: {
            ResponseStatus: {
                Code: string;
                Description: string;
            };
            Alert?: Array<{
                Code: string;
                Description: string;
            }>;
            TransactionReference?: {
                CustomerContext?: string;
            };
        };
        RatedShipment: UPSRatedShipment | UPSRatedShipment[];
    };
}

export interface UPSErrorResponse {
    response: {
        errors: Array<{
            code: string;
            message: string;
        }>;
    };
}
