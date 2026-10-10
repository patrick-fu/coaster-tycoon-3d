import type { ProductId } from './consumables.js';
export declare const CONTENT_VERSION: 6;
export type ContentIdentity = {
    familyId: string;
    variantId: string;
    modeId: string;
};
type ServiceKind = 'food' | 'drink' | 'restroom';
type Construction = {
    kind: 'tracked';
    profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1';
} | {
    kind: 'channel';
    profileId: 'independent.log-flume-v1';
} | {
    kind: 'fixed';
    profileId: 'independent.carousel-v1';
} | {
    kind: 'facility';
    service: ServiceKind;
    profileId: 'independent-services-v1';
} | {
    kind: 'facility';
    service: 'food' | 'drink';
    profileId: 'independent.consumables-v1' | 'independent.detailed-stalls-v1';
    productId: ProductId;
} | {
    kind: 'unimplemented';
    referenceShape: string;
};
type Operation = {
    kind: 'circuit';
    profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1';
} | {
    kind: 'channel-circuit';
    profileId: 'independent.log-flume-v1';
} | {
    kind: 'rotation';
    profileId: 'independent.carousel-v1';
} | {
    kind: 'service';
    service: ServiceKind;
    profileId: 'independent-services-v1';
} | {
    kind: 'service';
    service: 'food' | 'drink';
    profileId: 'independent.consumables-v1';
    productId: ProductId;
} | {
    kind: 'unimplemented';
};
export type Presentation = {
    kind: 'procedural-coaster';
    profileId: 'classic-candidate-v1';
} | {
    kind: 'detailed-wooden-coaster';
    profileId: 'detailed-wooden-candidate-v1';
} | {
    kind: 'detailed-carousel';
    profileId: 'detailed-carousel-candidate-v1';
} | {
    kind: 'detailed-log-flume';
    profileId: 'detailed-log-flume-candidate-v1';
} | {
    kind: 'detailed-facility';
    service: 'food' | 'drink';
    profileId: 'detailed-consumable-stalls-v1';
} | {
    kind: 'procedural-facility';
    service: ServiceKind;
    profileId: 'classic-candidate-v1';
} | {
    kind: 'unimplemented';
};
type Capabilities = {
    construction: Construction;
    operation: Operation;
    presentation: Presentation;
};
type Family = {
    id: string;
    label: string;
    category: string;
    reference: {
        originalSlot: number;
        sourceUrl: string;
    } | null;
};
type Mode = {
    id: string;
    label: string;
    evidence: 'project-candidate' | 'reconstructed-reference';
};
export type ResolvedContent = {
    content: ContentIdentity;
    capabilities: Capabilities;
    evidence: 'project-candidate' | 'reconstructed-reference';
};
export declare function legacyRideContent(): ContentIdentity;
export declare function woodenRideContent(): ContentIdentity;
export declare function carouselRideContent(): ContentIdentity;
export declare function flumeRideContent(): ContentIdentity;
export declare function consumableFacilityContent(product: ProductId): ContentIdentity;
export declare function detailedFacilityContent(product: ProductId): ContentIdentity;
export declare function legacyFacilityContent(service: ServiceKind): ContentIdentity;
export declare function resolveContent(value: unknown): ResolvedContent;
export declare function executableContent(value: unknown, kind: 'ride' | ServiceKind): ContentIdentity;
export declare function catalogue(availableProfiles?: ReadonlySet<string>): {
    contentVersion: 6;
    families: Family[];
    variants: {
        id: string;
        label: string;
        reference: {
            id: string;
            sourceUrl: string;
        } | null;
        choices: {
            familyId: string;
            modeIds: string[];
            capabilities: Capabilities;
            runtimeAvailable: boolean;
        }[];
    }[];
    modes: Mode[];
};
export {};
