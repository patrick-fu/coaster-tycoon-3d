# Park management

This context describes the player-facing concepts of a 3D park-management game
whose gameplay reference is RollerCoaster Tycoon 2.

For current progress, verification evidence, ownership and the next action,
read [PROGRESS.md](PROGRESS.md). Domain decisions are under [docs/adr](docs/adr/).

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

**Constructed instance**:
A ride or facility built in a saved park, with its selected family, object
variant and operating mode. Its lifecycle identity survives saving and differs
from the finite slot that can be reused after demolition.
_Avoid_: Ride family, object variant, permanent slot ID

**Scenario recipe**:
A versioned authored park starting state, selected content/research, climate,
restrictions, finances and objective/deadline. It is distinct from a saved
ongoing park and from a reusable coaster track-design preset.
_Avoid_: Theme pack, mandatory story campaign

**Ride session**:
One attraction's participant group from admission and loading through its operating
cycle and return to unloading. Its ordered occupants belong to the attraction
throughout the cycle, even when operation pauses or its exit becomes unavailable.
_Avoid_: Cosmetic animation loop, coaster train

**Channel ride**:
An attraction whose vehicle follows a constructed watercourse, with station,
flow, lift and drop sections. The watercourse belongs to the attraction and
does not make all park water navigable.
_Avoid_: Coaster with decorative water, free-water boating

**Boat**:
A channel ride's moving vehicle, carrying its ordered boarding guests through
the operating circuit and back to unloading. Its occupied seats remain owned
by those guests when the attraction closes or pauses.
_Avoid_: Coaster train, cosmetic vehicle, ride session

**Product**:
The food, drink or other item sold by a facility to a guest. A product differs
from the building that sells it and from the guest's purchased item.
_Avoid_: Shop variant, facility, sale

**Owned consumable**:
A guest's purchased food or drink that has not yet been fully used. Its ownership
continues when the selling facility closes or is demolished.
_Avoid_: Wrapper, vendor inventory, instant need relief

**Discard container**:
Empty packaging retained by a guest after using a consumable, until disposal.
It differs from waste already left on the ground.
_Avoid_: Ground litter, unfinished consumable

**Ground litter**:
Discarded waste left on a park path and available for cleanup.
_Avoid_: Carried container, guest inventory
