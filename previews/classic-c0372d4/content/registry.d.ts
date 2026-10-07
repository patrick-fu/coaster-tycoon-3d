export declare const CONTENT_VERSION: 1;
export type ContentIdentity = {
    familyId: string;
    variantId: string;
    modeId: string;
};
type ServiceKind = 'food' | 'drink' | 'restroom';
type Construction = {
    kind: 'tracked';
    profileId: 'independent-circuit-v1';
} | {
    kind: 'facility';
    service: ServiceKind;
    profileId: 'independent-services-v1';
} | {
    kind: 'unimplemented';
    referenceShape: string;
};
type Operation = {
    kind: 'circuit';
    profileId: 'independent-circuit-v1';
} | {
    kind: 'service';
    service: ServiceKind;
    profileId: 'independent-services-v1';
} | {
    kind: 'unimplemented';
};
export type Presentation = {
    kind: 'procedural-coaster';
    profileId: 'classic-candidate-v1';
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
type Choice = {
    familyId: string;
    modeIds: string[];
    capabilities: Capabilities;
};
type Variant = {
    id: string;
    label: string;
    choices: Choice[];
    reference: {
        id: string;
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
export declare function legacyFacilityContent(service: ServiceKind): ContentIdentity;
export declare function resolveContent(value: unknown): ResolvedContent;
export declare function executableContent(value: unknown, kind: 'ride' | ServiceKind): ContentIdentity;
export declare function catalogue(): {
    contentVersion: 1;
    families: Family[];
    variants: Variant[];
    modes: Mode[];
};
export {};
