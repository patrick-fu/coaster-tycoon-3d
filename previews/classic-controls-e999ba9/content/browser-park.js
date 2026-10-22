import { Engine } from '../simulation/engine.js';
import { Fault } from '../simulation/validation.js';
import { initialWorld } from './steel-coaster.js';
import { mixedRules } from './mixed-park.js';
import { withFlumeProfile } from './log-flume.js';
import { withConsumablesProfile } from './consumables.js';
import { withDetailedStallsProfile, withInformationProfile } from './facility-profiles.js';
import { withGradualRestroomProfile } from './gradual-restroom.js';
import { withAtmProfile } from './atm.js';
import { withBalloonProfile } from './balloons.js';
export const legacyBrowserRules = withAtmProfile(withGradualRestroomProfile(withInformationProfile(withDetailedStallsProfile(withConsumablesProfile(withFlumeProfile(mixedRules))))));
export const browserRules = withBalloonProfile(legacyBrowserRules);
export function restoreBrowserPark(input) {
    let failure;
    // Try complete trusted receivers; incoming numerical Rules never create authority.
    for (const rules of [browserRules, legacyBrowserRules]) {
        const staged = new Engine(initialWorld, rules), received = staged.restoreSave(input);
        if (received.ok)
            return staged;
        if (!failure || failure.error.code === 'WRONG_RULES')
            failure = received;
    }
    throw new Fault(failure.error.code, failure.error.message);
}
