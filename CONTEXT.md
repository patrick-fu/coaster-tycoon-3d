# Park management

This context describes the player-facing concepts of a 3D park-management game
whose gameplay reference is RollerCoaster Tycoon 2.

## Language

**Money-enabled sandbox**:
A park-management mode without a scenario completion objective, in which cash,
income, expenses and borrowing still constrain the park.
_Avoid_: Unlimited-money sandbox, free-build mode

**Gameplay fidelity**:
Agreement between observable simulation rules and verified original RCT2
behavior, including rules that affect player decisions and park outcomes.
_Avoid_: Visual similarity, OpenRCT2 compatibility

**Content variety**:
The breadth of available ride types, track pieces, amenities, staff roles and
scenery. A smaller selection does not imply simpler simulation rules.
_Avoid_: Simulation depth

**Park scale**:
The extent of a park's usable land and the population of operating ride and
facility instances, guests and staff within it.
_Avoid_: Content variety, ride-type count

**Ride family**:
A construction and operating capability class with its own geometry, motion,
legal track or footprint and rating rules. Modern reference-family splits must
be crosswalked to the original selectable type when measuring original variety.
_Avoid_: Vehicle style, player-created ride

**Object variant**:
A selected content object within a family, defining vehicle composition/seats
or facility appearance/products. Multiple variants can share a family without
having identical parameters or silhouettes.
_Avoid_: Operating mode, track-layout preset

**Operating mode**:
The selected dispatch/session/motion policy supported by a ride's family and
variant, such as continuous circuit, shuttle, race or timed rotation.
_Avoid_: Cosmetic animation, ride family

**Scenario recipe**:
A versioned authored park starting state, selected content/research, climate,
restrictions, finances and objective/deadline. It is distinct from a saved
ongoing park and from a reusable coaster track-design preset.
_Avoid_: Theme pack, mandatory story campaign
