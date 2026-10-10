import type { ContentIdentity } from '../content/registry.js';
import type { ChannelRideProfile, Rules } from './types.js';
export declare function flumeProfile(content: ContentIdentity, rules: Rules): ChannelRideProfile | null;
export declare function validateChannelProfiles(input: Rules['channelProfiles'], rules: Rules): Record<string, ChannelRideProfile>;
