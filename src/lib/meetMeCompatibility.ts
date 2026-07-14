import type { Gender, LookingFor, Orientation } from "@/types";

export interface CompatibilityProfile {
  gender: Gender;
  lookingFor: LookingFor;
  orientation?: Orientation | null;
}

/**
 * The set of genders a person is open to under Love intent, given their own gender +
 * orientation. Orientation labels (straight/gay/bisexual) don't have one universally
 * agreed mapping for non-binary people — this is a deliberate, documented
 * simplification: "straight" defaults a non-binary person to the two binary genders,
 * "gay" defaults to other non-binary people. Bisexual is always open to everyone.
 */
function orientationTargets(gender: Gender, orientation: Orientation): Gender[] {
  if (orientation === "bisexual") return ["man", "woman", "non-binary"];
  if (orientation === "straight") {
    if (gender === "man") return ["woman"];
    if (gender === "woman") return ["man"];
    return ["man", "woman"];
  }
  // gay
  if (gender === "man") return ["man"];
  if (gender === "woman") return ["woman"];
  return ["non-binary"];
}

/**
 * Two people are compatible in Love mode only if both are in Love mode and each
 * one's gender falls within the other's orientation-based target set — compatibility
 * must be mutual, not one-sided (a gay man shouldn't see straight men and vice versa).
 */
export function isLoveCompatible(a: CompatibilityProfile, b: CompatibilityProfile): boolean {
  if (a.lookingFor !== "love" || b.lookingFor !== "love") return false;
  if (!a.orientation || !b.orientation || !a.gender || !b.gender) return false;
  return (
    orientationTargets(a.gender, a.orientation).includes(b.gender) &&
    orientationTargets(b.gender, b.orientation).includes(a.gender)
  );
}

/**
 * Whether `viewer` should see `candidate` in the Meet Me discovery list / be allowed
 * to express interest in them. Friends mode is open to everyone (no gender/orientation
 * filtering); Love mode is filtered to mutually compatible people who are also
 * currently in Love mode.
 */
export function canConnect(viewer: CompatibilityProfile, candidate: CompatibilityProfile): boolean {
  if (!viewer?.lookingFor || !candidate?.lookingFor) return false;
  if (viewer.lookingFor === "friends") return true;
  return isLoveCompatible(viewer, candidate);
}
