/**
 * @fileoverview Vendor-related TypeScript type definitions and interfaces for Arena MVP
 * @version 1.0.0
 */

import type { ApiResponse, PaginatedResponse } from './common';

/**
 * Strongly typed vendor ID for type safety
 */
export type VendorId = string & { readonly _brand: unique symbol };

/**
 * ISO8601 DateTime type for consistent date handling
 */
export type ISO8601DateTime = string & { readonly _brand: unique symbol };

/**
 * Enumerated vendor status values with comprehensive states
 */
export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  SUSPENDED = 'SUSPENDED'
}

/**
 * Support tier definition with service level details
 */
export interface SupportTier {
  readonly name: string;
  readonly description: string;
  readonly responseTimeHours: number;
  readonly availabilityHours: string;
  readonly channels: readonly string[];
  readonly includedServices: readonly string[];
}

/**
 * Customization options available from vendor
 */
export interface CustomizationOption {
  readonly name: string;
  readonly description: string;
  readonly implementationTimeWeeks: number;
  readonly additionalCostPercentage: number;
}

/**
 * Enhanced vendor capabilities interface with comprehensive tracking
 */
export interface VendorCapabilities {
  readonly features: readonly string[];
  readonly integrations: readonly string[];
  readonly supportedRegions: readonly string[];
  readonly complianceCertifications: readonly string[];
  readonly supportTiers: readonly SupportTier[];
  readonly customizationOptions: readonly CustomizationOption[];
}

/**
 * Pricing model enumeration
 */
export enum PricingModel {
  FLAT_RATE = 'FLAT_RATE',
  PER_USER = 'PER_USER',
  USAGE_BASED = 'USAGE_BASED',
  TIERED = 'TIERED'
}

/**
 * Billing frequency options
 */
export enum BillingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL'
}

/**
 * Discount structure definition
 */
export interface Discount {
  readonly name: string;
  readonly description: string;
  readonly percentageOff: number;
  readonly minimumCommitmentMonths: number;
  readonly validUntil: ISO8601DateTime;
}

/**
 * Enhanced vendor pricing interface with comprehensive pricing models
 */
export interface VendorPricing {
  readonly model: PricingModel;
  readonly basePrice: number;
  readonly billingFrequency: BillingFrequency;
  readonly additionalCosts: Readonly<Record<string, number>>;
  readonly discounts: readonly Discount[];
  readonly customQuotingAvailable: boolean;
}

/**
 * Security profile for vendor data classification
 */
export interface SecurityProfile {
  readonly dataCenter: {
    readonly locations: readonly string[];
    readonly certifications: readonly string[];
  };
  readonly encryption: {
    readonly atRest: boolean;
    readonly inTransit: boolean;
    readonly standards: readonly string[];
  };
  readonly compliance: {
    readonly standards: readonly string[];
    readonly lastAuditDate: ISO8601DateTime;
  };
  readonly securityFeatures: readonly string[];
}

/**
 * Main vendor interface with enhanced security and type safety
 */
export interface Vendor {
  readonly id: VendorId;
  readonly name: string;
  readonly status: VendorStatus;
  readonly capabilities: Readonly<VendorCapabilities>;
  readonly pricing: Readonly<VendorPricing>;
  readonly securityProfile: Readonly<SecurityProfile>;
  readonly createdAt: ISO8601DateTime;
  readonly updatedAt: ISO8601DateTime;
}

/**
 * Type for paginated vendor list responses
 */
export type VendorListResponse = PaginatedResponse<Vendor>;

/**
 * Type for single vendor responses
 */
export type VendorResponse = ApiResponse<Vendor>;