/**
 * This module contains the elements you need to write constraints via {@link Constraint}, window expressions via {@link Windows} and {@link Spans}.
 * Resource can be accessed via {@link Real} or {@link Discrete} depending on their types.
 *
 * As activity types and resources are generated per mission model, some elements here are shown here with generic non-accessible types.
 *
 * @module Constraint eDSL
 * @packageDocumentation
 */

import * as AST from './constraints-ast.js';
import * as Gen from './mission-model-generated-code.js';
import {ActivityType, ActivityTypeParameterInstantiationMap} from './mission-model-generated-code.js';

export { Gen };

/**
 * An expression that discriminates between valid and invalid states.
 *
 * Constraints can be based off of activity parameters and placement, resource profiles, or
 * some combination of those.
 */
export class Constraint {
  /** Internal AST node */
  /** @internal **/
  public readonly __astNode: AST.Constraint;

  /** @internal **/
  private static __numGeneratedAliases: number = 0;

  /** @internal **/
  public constructor(astNode: AST.Constraint) {
    this.__astNode = astNode;
  }

  /**
   * Forbid instances of two activity types from overlapping with each other.
   * @param activityType1
   * @param activityType2
   * @constructor
   */
  public static ForbiddenActivityOverlap(activityType1: Gen.ActivityType, activityType2: Gen.ActivityType): Constraint {
    return Constraint.ForEachActivity(
        activityType1,
        activity1 => Constraint.ForEachActivity(
            activityType2,
            activity2 => Windows.And(activity1.window(), activity2.window()).not()
        )
    )
  }

  /**
   * Check a constraint for each instance of an activity type.
   *
   * @param activityType activity type to check
   * @param expression function of an activity instance that returns a Constraint
   * @constructor
   */
  public static ForEachActivity<A extends Gen.ActivityType>(
      activityType: A,
      expression: (instance: ActivityInstance<A>) => Constraint,
  ): Constraint {
    let alias = 'activity alias ' + Constraint.__numGeneratedAliases;
    Constraint.__numGeneratedAliases += 1;
    return new Constraint({
      kind: AST.NodeKind.ForEachActivityViolations,
      activityType,
      alias,
      expression: expression(new ActivityInstance(activityType, alias)).__astNode,
    });
  }

  /**
   * Detect when a spans object's cumulative duration either exceeds or falls short of a threshold within any interval of a given width.
   *
   * Violations can be reported in various ways by setting the `algorithm` argument:
   * - `ExcessSpans` detects times when the duration exceeds the threshold and highlights the individual spans that
   *    contributed to the threshold violation.
   * - `ExcessHull` detects times when the duration exceeds the threshold and highlights the whole group of spans that
   *    contributed to the threshold violation in one interval.
   * - `DeficitSpans` detects times when the duration falls short of the threshold and highlights the individual gaps between spans
   *    that contributed to the threshold violation.
   * - `DeficitHull` detects times when the duration falls short of the threshold and highlights the whole group of gaps between
   *    spans that contributed to the threshold violation in one interval.
   *
   * @param spans spans object to detect threshold events on
   * @param width width of the rolling interval
   * @param threshold maximum allowable duration within any `width` interval
   * @param algorithm algorithm for reporting violations
   * @constructor
   */
  public static RollingThreshold(
      spans: Spans,
      width: AST.Duration,
      threshold: AST.Duration,
      algorithm: RollingThresholdAlgorithm
  ): Constraint {
    return new Constraint({
      kind: AST.NodeKind.RollingThreshold,
      spans: spans.__astNode,
      width,
      threshold,
      algorithm
    });
  }
}

/** Algorithm to use when reporting violations from rolling threshold */
export enum RollingThresholdAlgorithm {
  ExcessSpans = 'ExcessSpans',
  ExcessHull = 'ExcessHull',
  DeficitSpans = 'DeficitSpans',
  DeficitHull = 'DeficitHull'
}

/** A boolean profile; a function from time to truth values. */
export class Windows {
  /** Internal AST node */
  /** @internal **/
  public readonly __astNode: AST.WindowsExpression;

  /** @internal **/
  public constructor(expression: AST.WindowsExpression) {
    this.__astNode = expression;
  }

  /**
   * Produces a single window.
   *
   * @param value value of the window segment.
   * @param interval interval of the window segment.
   */
  public static Value(value: boolean, interval?: Interval): Windows {
    let node: AST.WindowsExpression = {
      kind: AST.NodeKind.WindowsExpressionValue,
      value
    };
    if (interval !== undefined) Object.assign(node, {interval: interval.__astNode});
    return new Windows(node);
  }

  /**
   * Produces windows for each activity present in the plan and belonging to one of the activity types passed
   *
   * @param activityTypes the activity types
   */
  public static During(...activityTypes: Gen.ActivityType[]) : Windows {
    return Windows.Or(
        ...activityTypes.map<Windows>((activityType) =>
            Spans.ForEachActivity(activityType).windows())
    );
  }

  /**
   * Performs the boolean And operation on any number of Windows.
   *
   * @param windows any number of windows expressions
   */
  public static And(...windows: Windows[]): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionAnd,
      expressions: [...windows.map(other => other.__astNode)],
    });
  }

  /**
   * Selects the ith true window and falsifies the other true segments.
   * @param i the index of the true segment in the sequence of windows. index(0) will point to the first element, index(-1) to the last element.
   */
  public keepTrueSegment(i: number): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionKeepTrueSegment,
      expression: this.__astNode,
      index: i
    })
  }

  /**
   * Performs the boolean Or operation on any number of Windows.
   *
   * @param windows any number of windows expressions
   */
  public static Or(...windows: Windows[]): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionOr,
      expressions: [...windows.map(other => other.__astNode)],
    });
  }

  /**
   * Only check this expression when the condition argument is true;
   * otherwise the result is vacuously true.
   *
   * @param condition
   */
  public if(condition: Windows): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionOr,
      expressions: [
        {
          kind: AST.NodeKind.WindowsExpressionNot,
          expression: condition.__astNode,
        },
        this.__astNode,
      ],
    });
  }

  /**
   * Performs the boolean And operation on this and any number of additional Windows.
   */
  public and(...windows: Windows[]): Windows {
    return Windows.And(this, ...windows);
  }

  /**
   * Performs the boolean Or operation on this and any number of additional Windows.
   */
  public or(...windows: Windows[]): Windows {
    return Windows.Or(this, ...windows);
  }

  /**
   * Performs the boolean Not operation on this windows object.
   */
  public not(): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionNot,
      expression: this.__astNode,
    });
  }

  /**
   * Produces a constraint violation whenever this is false.
   *
   * Essentially, express the condition you want to be satisfied, then use
   * this method to produce a violation whenever it is NOT satisfied.
   */
  public violations(): Constraint {
    return new Constraint({
      kind: AST.NodeKind.ViolationsOf,
      expression: this.__astNode,
    });
  }

  /**
   * Returns a new windows object, with all true segments shorter than or equal to the given
   * duration set to false.
   *
   * @param duration the duration
   */
  public longerThan(duration: AST.Duration) : Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionLongerThan,
      windowExpression: this.__astNode,
      duration
    })
  }

  /**
   * Returns a new windows object, with all true segments longer than or equal to the given
   * duration set to false.
   *
   * @param duration the duration
   */
  public shorterThan(duration: AST.Duration) : Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionShorterThan,
      windowExpression: this.__astNode,
      duration
    })
  }

  /**
   * Shifts the start and end of all true segments by a duration.
   *
   * The second argument is optional: if omitted, `shiftBy(dur)` shifts all segments uniformly by `dur`, which
   * is equivalent to `shiftBy(dur, dur)`.
   *
   * Shifts the start and end of all false segment by the reversed directions (i.e. the start of each false segment
   * is shifted by `fromEnd`).
   *
   * @param fromStart duration to add from the start of each true segment
   * @param fromEnd duration to add from the end of each true segment. Default is equal to `fromStart` if omitted.
   */
  public shiftBy(fromStart: AST.Duration, fromEnd?: AST.Duration | undefined) : Windows {
    if (fromEnd === undefined) {
      return new Windows({
        kind: AST.NodeKind.ProfileExpressionShiftBy,
        expression: this.__astNode,
        duration: fromStart
      });
    } else {
      return new Windows({
        kind: AST.NodeKind.IntervalsExpressionShiftEdges,
        expression: this.__astNode,
        fromStart,
        fromEnd
      })
    }
  }

  /**
   * Splits each true segment into equal sized sub-intervals. Returns a Spans object.
   *
   * For `.split(N)`, N sub-windows will be created by removing N-1 points in the middle.
   *
   * @throws UnsplittableSpanException during backend evaluation if the duration of a window is fewer microseconds than N.
   * @throws UnsplittableSpanException if any window is unbounded (i.e. contains MIN_VALUE or MAX_VALUE)
   * @throws InvalidGapsException if this contains any gaps.
   *
   * @param numberOfSubSpans how many sub-windows to split each window into
   * @param internalStartInclusivity Inclusivity for any newly generated span start points (default Inclusive).
   * @param internalEndInclusivity Inclusivity for any newly generated span end points (default Exclusive).
   */
  public split(
      numberOfSubSpans: number,
      internalStartInclusivity: Inclusivity = Inclusivity.Inclusive,
      internalEndInclusivity: Inclusivity = Inclusivity.Exclusive
  ): Spans {
    if (numberOfSubSpans < 1) {
      throw RangeError(".split numberOfSubSpans cannot be less than 1, but was: " + numberOfSubSpans);
    }
    return new Spans({
      kind: AST.NodeKind.SpansExpressionSplit,
      intervals: this.__astNode,
      numberOfSubIntervals: numberOfSubSpans,
      internalStartInclusivity,
      internalEndInclusivity
    })
  }

  /**
   * Replaces each true segment with its start point.
   *
   * Since gaps represent "unknown", true segments that come after a gap don't have a known start point.
   * So instead their first known point is unset and the rest is set to false.
   *
   * True segments that explicitly come directly after false and include their start point have all except their
   * start point set to false. If they don't include the start point, then the whole interval is set to false and the
   * start point is set true.
   */
  public starts(): Windows {
    return new Windows({
      kind: AST.NodeKind.IntervalsExpressionStarts,
      expression: this.__astNode
    })
  }

  /**
   * Replaces each true segment with its end point.
   *
   * Since gaps represent "unknown", true segments that come before a gap don't have a known end point.
   * So instead their last known point is unset and the rest is set to false.
   *
   * True segments that explicitly come directly before false and include their end point have all except their
   * end point set to false. If they don't include the end point, then the whole interval is set to false and the
   * end point is set true.
   */
  public ends(): Windows {
    return new Windows({
      kind: AST.NodeKind.IntervalsExpressionEnds,
      expression: this.__astNode
    })
  }

  /**
   * Convert this into a set of Spans.
   *
   * @throws InvalidGapsException if this contains any gaps.
   */
  public spans(): Spans {
    return new Spans({
      kind: AST.NodeKind.SpansExpressionFromWindows,
      windowsExpression: this.__astNode
    })
  }

  /**
   * Replaces all gaps in this profile with default segments taken from the argument
   *
   * @param defaultProfile boolean or windows to take default values from.
   */
  public assignGaps(defaultProfile: Windows | boolean): Windows {
    if (!(defaultProfile instanceof Windows)) {
      defaultProfile = Windows.Value(defaultProfile);
    }
    return new Windows({
      kind: AST.NodeKind.AssignGapsExpression,
      originalProfile: this.__astNode,
      defaultProfile: defaultProfile.__astNode
    });
  }

  /**
   * Counts the cumulative amount of time spent in an active Window, as a multiple of some unit of time.
   *
   * The output profile always starts at 0 at the simulation start time. Initial conditions from before the simulation
   * start time are not considered, even in the case of temporal-subset plan branches with later start times.
   *
   * @param unit unit of time to count. Does not need to be a round unit (i.e. can be 1.5 minutes, if you want).
   */
  public accumulatedDuration(unit: AST.Duration): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileAccumulatedDuration,
      intervalsExpression: this.__astNode,
      unit
    });
  }
}

/**
 * A set of intervals that can overlap without being coaleseced together.
 */
export class Spans {
  /** @internal **/
  public readonly __astNode: AST.SpansExpression;
  /** @internal **/
  private static __numGeneratedAliases: number = 0;

  /** @internal **/
  public constructor(expression: AST.SpansExpression) {
    this.__astNode = expression;
  }

  /**
   * Create a Spans object with a single span defined by an interval.
   * @param interval interval for the span
   * @constructor
   */
  public static FromInterval(interval: Interval): Spans {
    return new Spans({
      kind: AST.NodeKind.SpansExpressionInterval,
      interval: interval.__astNode
    });
  }

  /**
   * Splits each span into equal sized sub-spans.
   *
   * For `.split(N)`, N sub-spans will be created by removing N-1 points in the middle.
   *
   * @throws UnsplittableIntervalException during backend evaluation if the duration of a span is fewer microseconds than N.
   * @param numberOfSubSpans how many sub-spans to split each span into
   * @param internalStartInclusivity Inclusivity for any newly generated span start points (default Inclusive).
   * @param internalEndInclusivity Inclusivity for any newly generated span end points (default Exclusive).
   */
  public split(
      numberOfSubSpans: number,
      internalStartInclusivity: Inclusivity = Inclusivity.Inclusive,
      internalEndInclusivity: Inclusivity = Inclusivity.Exclusive
  ): Spans {

    if (numberOfSubSpans < 1) {
      throw RangeError(".split numberOfSubSpans cannot be less than 1, but was: " + numberOfSubSpans);
    }
    return new Spans({
      kind: AST.NodeKind.SpansExpressionSplit,
      intervals: this.__astNode,
      numberOfSubIntervals: numberOfSubSpans,
      internalStartInclusivity,
      internalEndInclusivity
    })
  }

  /**
   * Connects the end of each of these spans to the start of the nearest span in the argument.
   *
   * This operation creates a new spans object. For each span `s` in `this`, it produces a span from
   * the end of `s` to the start of the first span in `other` that occurs after the end of `s`.
   *
   * If `s` and the nearest subsequent span in `other` meet exactly, with no intersection and no
   * space between them, a singleton span (containing exactly one time) is still created at the meeting point.
   *
   * If there are no spans in `other` that occur after `s`, a span is still created from the end of `s` until the
   * end of the plan.
   *
   * @param other
   */
  public connectTo(other: Spans): Spans {
    return new Spans({
      kind: AST.NodeKind.SpansExpressionConnectTo,
      from: this.__astNode,
      to: other.__astNode
    })
  }

  /**
   * Replaces each Span with its start point.
   */
  public starts(): Spans {
    return new Spans({
      kind: AST.NodeKind.IntervalsExpressionStarts,
      expression: this.__astNode
    })
  }

  /**
   * Replaces each Span with its end point.
   */
  public ends(): Spans {
    return new Spans({
      kind: AST.NodeKind.IntervalsExpressionEnds,
      expression: this.__astNode
    })
  }

  /**
   * Shifts the start and end of each Span by a duration.
   *
   * @param fromStart duration to shift start by
   * @param fromEnd duration to shift end by (defaults is `fromStart` if omitted)
   */
  public shiftBy(fromStart: AST.Duration, fromEnd?: AST.Duration | undefined): Spans {
    return new Spans({
      kind: AST.NodeKind.IntervalsExpressionShiftEdges,
      expression: this.__astNode,
      fromStart,
      fromEnd: fromEnd !== undefined ? fromEnd : fromStart
    })
  }

  /**
   * Convert this into a set of Windows. Each span is a true segment, and everything else is false.
   *
   * This is a lossy operation.
   * If any spans overlap or touch, they will be coalesced into a single window.
   */
  public windows(): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionFromSpans,
      spansExpression: this.__astNode
    })
  }

  /**
   * Counts the cumulative amount of time spent in an active Span, as a multiple of some unit of time.
   * Overlapping spans are double-counted.
   *
   * The output profile always starts at 0 at the simulation start time. Initial conditions from before the simulation
   * start time are not considered, even in the case of temporal-subset plan branches with later start times.
   *
   * @param unit unit of time to count. Does not need to be a round unit (i.e. can be 1.5 minutes, if you want).
   */
  public accumulatedDuration(unit: AST.Duration): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileAccumulatedDuration,
      intervalsExpression: this.__astNode,
      unit
    });
  }


  /**
   * Check a constraint for each instance of an activity type.
   *
   * @param activityType activity type to check
   * @param expression function of an activity instance that returns a Constraint; default returns the instance's span.
   * @constructor
   */
  public static ForEachActivity<A extends Gen.ActivityType>(
      activityType: A,
      expression?: (instance: ActivityInstance<A>) => Spans,
  ): Spans {
    if (expression === undefined) expression = instance => instance.span();
    let alias = 'span activity alias ' + Spans.__numGeneratedAliases;
    Spans.__numGeneratedAliases += 1;
    return new Spans({
      kind: AST.NodeKind.ForEachActivitySpans,
      activityType: activityType,
      alias: alias,
      expression: expression(new ActivityInstance(activityType, alias)).__astNode,
    });
  }

  /**
   * Selects only spans that occur during a true segment, removing those that don't.
   *
   * Spans that only partially overlap with a true segment will be truncated, and spans
   * that overlap with multiple true segments will be split.
   *
   * @param windows
   */
  public selectWhenTrue(windows: Windows): Spans {
    return new Spans({
      kind: AST.NodeKind.SpansSelectWhenTrue,
      spansExpression: this.__astNode,
      windowsExpression: windows.__astNode
    });
  }

  /**
   * Creates a windows object that is false when one of these Spans does not contain a child span, and true otherwise.
   * The parents are the callee and the children are the argument, i.e. `parents.contains(children)`.
   * The default requirement of one child per parent can be modified.
   *
   * More concretely, for the expression `A.contains(B)`, the result is:
   * - `true` inside any A spans if (by default) they contain at least one B span
   *   - for counting spans, "contain" means that the entire B span is inside the A span.
   * - `true` (vacuously) outside the union of all A spans
   * - `false` inside any A spans that do not contain a B span
   *
   * The requirement for one child span can be optionally changed by providing the second argument:
   * - `{count: n}` requires *exactly* `n` children per parent.
   * - `{count: {min: n}}` requires at least `n` children per parent.
   * - `{count: {max: n}}` requires at most `n` children per parent
   * - `{duration: {min: d}}` requires a total duration of children of at least `d`
   * - `{duration: {max: d}}` requires a total duration of children of at most `d`
   *
   * Both `count` and `duration` can be provided at the same time
   * (e.g. `{count: 2, duration: {min: Temporal.Duration.from({hours: 1})}}`).
   * Both `min` and `max` can be provided at the same time (e.g. `{count: {min: 1, max: 3}}`.
   *
   * There is no option to require an exact duration, because the implementation uses floating point comparison.
   * If you need an exact duration, you can approximate it by using a small range around the desired value.
   *
   * @param children child spans to check the existence of.
   * @param requirement what to check for in each parent span.
   */
  public contains(children: Spans, requirement?: SpansContainsRequirement): Windows {
    if (requirement === undefined) requirement = {count: {min: 1}};
    if (requirement.count === undefined) requirement.count = {};
    else if (typeof requirement.count === 'number') requirement.count = {
      min: requirement.count,
      max: requirement.count
    };
    if (requirement.duration === undefined) requirement.duration = {};
    return new Windows({
      kind: AST.NodeKind.SpansExpressionContains,
      parents: this.__astNode,
      children: children.__astNode,
      requirement: requirement as {count: {min?: number, max?: number}, duration: {min?: AST.Duration, max?: AST.Duration}}
    });
  }
}

export type SpansContainsRequirement = {
  count?: number | {
    min?: number,
    max?: number
  },
  duration?: AST.Duration | {
    min?: AST.Duration,
    max?: AST.Duration
  }
}

/**
 * A real number profile; a function from time to real numbers.
 *
 * Most real profiles are piecewise-linear, but some can be piecewise-constant if the
 * underlying datatype is an integer. More general function types are currently unsupported.
 */
export class Real {
  /** @internal **/
  public readonly __astNode: AST.RealProfileExpression;

  /** @internal **/
  public constructor(profile: AST.RealProfileExpression) {
    this.__astNode = profile;
  }

  /**
   * Reference the real profile associated with a resource.
   * @param name
   * @constructor
   */
  public static Resource(name: Gen.RealResourceName): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileResource,
      name,
    });
  }

  /**
   * Create a constant real profile.
   * @param value
   * @param rate
   * @param interval
   * @constructor
   */
  public static Value(value: number, rate?: number, interval?: Interval): Real {
    let node: AST.RealProfileExpression = {
      kind: AST.NodeKind.RealProfileValue,
      value,
      rate: rate ?? 0.0
    };
    if (interval !== undefined) Object.assign(node, { interval: interval.__astNode });
    return new Real(node);
  }

  /**
   * Create a real profile from this profile's derivative.
   */
  public rate(): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileRate,
      profile: this.__astNode,
    });
  }

  /**
   * Create a real profile by multiplying this profile by a constant
   * @param multiplier
   */
  public times(multiplier: number): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileTimes,
      multiplier,
      profile: this.__astNode,
    });
  }

  /**
   * Create a real profile by adding this and another real profile together.
   * @param other
   */
  public plus(other: Real | number): Real {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Real({
      kind: AST.NodeKind.RealProfilePlus,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Create a real profile by subtracting another real profile from this.
   * @param other
   */
  public minus(other: Real | number): Real {
    if (!(other instanceof Real)) {
      other = Real.Value(-other);
    } else {
      other = other.negate();
    }
    return new Real({
      kind: AST.NodeKind.RealProfilePlus,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Create a real profile where all segments are negated.
   */
  public negate(): Real {
    return new Real({
      kind: AST.NodeKind.RealProfileTimes,
      profile: this.__astNode,
      multiplier: -1
    });
  }

  /**
   * Produce a window whenever this profile is less than another real profile.
   * @param other
   */
  public lessThan(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.RealProfileLessThan,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is less than or equal to another real profile.
   * @param other
   */
  public lessThanOrEqual(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.RealProfileLessThanOrEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is greater than to another real profile.
   * @param other
   */
  public greaterThan(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.RealProfileGreaterThan,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is greater than or equal to another real profile.
   * @param other
   */
  public greaterThanOrEqual(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.RealProfileGreaterThanOrEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is equal to another real profile.
   * @param other
   */
  public equal(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.ExpressionEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is not equal to another real profile.
   * @param other
   */
  public notEqual(other: Real | number): Windows {
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.ExpressionNotEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is equal to another real profile plus or minus the tolerance
   */
  public isWithin(other: Real | number, tolerance: Real | number): Windows{
    if (!(other instanceof Real)) {
      other = Real.Value(other);
    }
    if (!(tolerance instanceof Real)) {
      tolerance = Real.Value(tolerance);
    }

    return Windows.And(this.lessThanOrEqual(other.plus(tolerance)), this.greaterThanOrEqual(other.minus(tolerance)));
  }

  /**
   * Produce an instantaneous window whenever this profile changes.
   */
  public changes(): Windows {
    return new Windows({
      kind: AST.NodeKind.ProfileChanges,
      expression: this.__astNode,
    });
  }

  /**
   * Replaces all gaps in this profile with default segments taken from the argument
   *
   * @param defaultProfile number or real profile to take default values from.
   */
  public assignGaps(defaultProfile: Real | number): Real {
    if (!(defaultProfile instanceof Real)) {
      defaultProfile = Real.Value(defaultProfile);
    }
    return new Real({
      kind: AST.NodeKind.AssignGapsExpression,
      originalProfile: this.__astNode,
      defaultProfile: defaultProfile.__astNode
    });
  }

  /**
   * Will use the start of the first span in the spans
   * @param timepoint
   */
  public valueAt(timepoint: Spans) : Discrete<number> {
    return new Discrete<number>({
      kind: AST.NodeKind.ValueAtExpression,
      profile: this.__astNode,
      timepoint : timepoint.__astNode
    });
  }

  /**
   * Shifts the profile forward or backward in time.
   *
   * @param duration duration shift each segment (can be negative)
   */
  public shiftBy(duration: Temporal.Duration): Real {
    return new Real({
      kind: AST.NodeKind.ProfileExpressionShiftBy,
      expression: this.__astNode,
      duration
    })
  }
}

/**
 * A profile of any type; a function from time to any value representable by JSON.
 *
 * All profiles can be represented as Discrete, even Real profiles. Keep in mind that treating real profiles as
 * discrete will lose access to the ordering operators (>, <, >=, <=). In most cases it is better not to do this.
 */
export class Discrete<Schema> {
  /** @internal **/
  public readonly __astNode: AST.DiscreteProfileExpression;

  /**
   * @internal
   *
   * Field of the schema type, used to ensure that `Discrete<A>` cannot be assigned to `Discrete<B>` if `A` cannot be assigned to `B`.
   * The `!` indicates "I swear to initialize this outside the constructor". We don't, but it doesn't actually matter that the
   * schema "instance" is never actually instantiated. What matters is that Typescript *thinks* it will be instantiated, because the TS
   * workflow is all about tricking the compiler into doing the primary thing it was designed to do out of the box:
   * check types in Javascript.
   */
  public readonly __schemaInstance!: Schema;

  /** @internal **/
  public constructor(profile: AST.DiscreteProfileExpression) {
    this.__astNode = profile;
  }

  /**
   * @internal
   * Returns a discrete profile producing an object.
   * Used internally. Do not use to build constraints or goals.
   */
  public static Map<Schema>(expressions: {[key:string] : any}): Discrete<Schema>{
    return new Discrete({
      kind: AST.NodeKind.StructProfileExpression,
      expressions,
    });
  }

  /**
   * @internal
   * Returns a discrete profile producing a list.
   * Used internally. Do not use to build constraints or goals.
   */
  public static List<Schema>(expressions: any[]): Discrete<Schema>{
    return new Discrete({
      kind: AST.NodeKind.ListProfileExpression,
      expressions,
    });
  }

  /**
   * Will use the start of the first span in the spans
   * @param timepoint
   */
  public valueAt(timepoint: Spans) : Discrete<Schema> {
    return new Discrete<Schema>({
      kind: AST.NodeKind.ValueAtExpression,
      profile: this.__astNode,
      timepoint : timepoint.__astNode
    });
  }

  /**
   * Reference the discrete profile associated with a resource.
   * @param name
   * @constructor
   */
  public static Resource<R extends Gen.ResourceName>(name: R): Discrete<Gen.Resource[R]> {
    return new Discrete({
      kind: AST.NodeKind.DiscreteProfileResource,
      name,
    });
  }

  /**
   * Create a constant discrete profile for all time.
   * @param value
   * @param interval
   * @constructor
   */
  public static Value<Schema>(value: Schema, interval?: Interval): Discrete<Schema> {
    let node: AST.DiscreteProfileExpression = {
      kind: AST.NodeKind.DiscreteProfileValue,
      value
    };
    if (interval !== undefined) Object.assign(node, { interval: interval.__astNode });
    return new Discrete(node);
  }

  /**
   * Produce an instantaneous window whenever this profile makes a specific transition.
   *
   * @param from initial value
   * @param to final value
   */
  public transition(from: Schema, to: Schema): Windows {
    return new Windows({
      kind: AST.NodeKind.DiscreteProfileTransition,
      profile: this.__astNode,
      from,
      to,
    });
  }

  /**
   * Produce a window whenever this profile is equal to another discrete profile.
   * @param other
   */
  public equal(other: Schema | Discrete<Schema>): Windows {
    if (!(other instanceof Discrete)) {
      other = Discrete.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.ExpressionEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce a window whenever this profile is not equal to another discrete profile.
   * @param other
   */
  public notEqual(other: Schema | Discrete<Schema>): Windows {
    if (!(other instanceof Discrete)) {
      other = Discrete.Value(other);
    }
    return new Windows({
      kind: AST.NodeKind.ExpressionNotEqual,
      left: this.__astNode,
      right: other.__astNode,
    });
  }

  /**
   * Produce an instantaneous window whenever this profile changes.
   */
  public changes(): Windows {
    return new Windows({
      kind: AST.NodeKind.ProfileChanges,
      expression: this.__astNode,
    });
  }

  /**
   * Replaces all gaps in this profile with default segments taken from the argument
   *
   * @param defaultProfile value or discrete profile to take default values from.
   */
  public assignGaps(defaultProfile: Schema | Discrete<Schema>): Discrete<Schema> {
    if (!(defaultProfile instanceof Discrete)) {
      defaultProfile = Discrete.Value(defaultProfile);
    }
    return new Discrete({
      kind: AST.NodeKind.AssignGapsExpression,
      originalProfile: this.__astNode,
      defaultProfile: defaultProfile.__astNode
    });
  }

  /**
   * Shifts the profile forward or backward in time.
   *
   * @param duration duration shift each segment (can be negative)
   */
  public shiftBy(duration: Temporal.Duration): Discrete<Schema> {
    return new Discrete<Schema>({
      kind: AST.NodeKind.ProfileExpressionShiftBy,
      expression: this.__astNode,
      duration
    })
  }
}

/** Represents an instance of an activity in the plan. */
export class ActivityInstance<A extends ActivityType> {

  private readonly __activityType: A;
  private readonly __alias: string;
  public readonly parameters: ReturnType<typeof ActivityTypeParameterInstantiationMap[A]>;

  public constructor(activityType: A, alias: string) {
    this.__activityType = activityType;
    this.__alias = alias;
    this.parameters = ActivityTypeParameterInstantiationMap[activityType](alias) as ReturnType<typeof ActivityTypeParameterInstantiationMap[A]>;
  }

  /**
   * Produces a span for the duration of the activity.
   */
  public span(): Spans {
    return new Spans({
      kind: AST.NodeKind.SpansExpressionActivitySpan,
      alias: this.__alias
    });
  }

  /**
   * Produces a window for the duration of the activity.
   */
  public window(): Windows {
    return new Windows({
      kind: AST.NodeKind.WindowsExpressionActivityWindow,
      alias: this.__alias
    });
  }

  /**
   * Produces an instantaneous window at the start of the activity.
   */
  public start(): Spans {
    return this.span().starts();
  }

  /**
   * Produces an instantaneous window at the end of the activity.
   */
  public end(): Spans {
    return this.span().ends();
  }
}

/** An enum for whether an interval includes its bounds. */
export enum Inclusivity {
  Inclusive = "Inclusive",
  Exclusive = "Exclusive"
}

/** Represents an absolute time range. */
export class Interval {
  /** @internal */
  public readonly __astNode: AST.IntervalExpression;

  /** @suppress */
  public constructor(node: AST.IntervalExpression) {
    this.__astNode = node;
  }

  /** Creates an instantaneous interval at a single time. */
  public static At(time: Temporal.Instant): Interval {
    return new Interval({
      kind: AST.NodeKind.AbsoluteInterval,
      start: time,
      end: time
    });
  }

  /** Creates an interval between two times, with optional bounds inclusivity (default inclusive). */
  public static Between(start: Temporal.Instant, end: Temporal.Instant, startInclusivity?: Inclusivity, endInclusivity?: Inclusivity): Interval {
    let node: AST.AbsoluteInterval = {
      kind: AST.NodeKind.AbsoluteInterval,
      start,
      end,
    };

    if (startInclusivity !== undefined) Object.assign(node, {startInclusivity});
    if (endInclusivity !== undefined) Object.assign(node, {endInclusivity});
    return new Interval(node);
  }

  /** Creates an interval for the whole planning horizon. */
  public static Horizon(): Interval {
    return new Interval({
      kind: AST.NodeKind.AbsoluteInterval
    });
  }

  public duration(): AST.Duration {
    return {
      kind: AST.NodeKind.IntervalDuration,
      interval: this.__astNode
    }
  }
}

declare global {
  /**
   * An expression that discriminates between valid and invalid states.
   *
   * Constraints can be based off of activity parameters and placement, resource profiles, or
   * some combination of those.
   */
  export class Constraint {
    /** Internal AST Node */
    public readonly __astNode: AST.Constraint;

    /**
     * Forbid instances of two activity types from overlapping with each other.
     * @param activityType1
     * @param activityType2
     * @constructor
     */
    public static ForbiddenActivityOverlap(
        activityType1: Gen.ActivityType,
        activityType2: Gen.ActivityType,
    ): Constraint;

    /**
     * Applies an expression producing spans for each instance of an activity type and returns the aggregated set of spans.
     *
     * @param activityType activity type to check
     * @param expression function of an activity instance that returns a Spans
     * @constructor
     */
    public static ForEachActivity<A extends Gen.ActivityType>(
        activityType: A,
        expression: (instance: ActivityInstance<A>) => Constraint,
    ): Constraint;

    /**
     * Detect when a spans object's cumulative duration either exceeds or falls short of a threshold within any interval of a given width.
     *
     * Violations can be reported in various ways by setting the `algorithm` argument:
     * - `ExcessSpans` detects times when the duration exceeds the threshold and highlights the individual spans that
     *    contributed to the threshold violation.
     * - `ExcessHull` detects times when the duration exceeds the threshold and highlights the whole group of spans that
     *    contributed to the threshold violation in one interval.
     * - `DeficitSpans` detects times when the duration falls short of the threshold and highlights the individual gaps between spans
     *    that contributed to the threshold violation.
     * - `DeficitHull` detects times when the duration falls short of the threshold and highlights the whole group of gaps between
     *    spans that contributed to the threshold violation in one interval.
     *
     * @param spans spans object to detect threshold events on
     * @param width width of the rolling interval
     * @param threshold maximum allowable duration within any `width` interval
     * @param algorithm algorithm for reporting violations
     * @constructor
     */
    public static RollingThreshold(
        spans: Spans,
        width: AST.Duration,
        threshold: AST.Duration,
        algorithm: RollingThresholdAlgorithm
    ): Constraint;
  }

  /** Algorithm to use when reporting violations from rolling threshold */
  export enum RollingThresholdAlgorithm {
    ExcessSpans = 'ExcessSpans',
    ExcessHull = 'ExcessHull',
    DeficitSpans = 'DeficitSpans',
    DeficitHull = 'DeficitHull'
  }

  /** A boolean profile; a function from time to truth values. */
  export class Windows {
    /** Internal AST Node */
    public readonly __astNode: AST.WindowsExpression;

    /**
     * Selects the ith true window and falsifies the other true segments.
     * @param i the index of the true segment in the sequence of windows. index(0) will point to the first element, index(-1) to the last element.
     */
    public keepTrueSegment(i: number): Windows;

      /**
     * Creates a single window.
     *
     * @param value value for the window segment.
     * @param interval interval for the window segment.
     *
     */
    public static Value(value: boolean, interval?: Interval): Windows;

    /**
     * Performs the boolean And operation on any number of Windows.
     *
     * @param windows any number of windows expressions
     */
    public static And(...windows: Windows[]): Windows;

    /**
     * Performs the boolean Or operation on any number of windows.
     *
     * @param windows any number of windows expressions
     */
    public static Or(...windows: Windows[]): Windows;

    /**
     * Only check this expression when the condition argument is true;
     * otherwise the result is vacuously true.
     *
     * @param condition
     */
    public if(condition: Windows): Windows;

    /**
     * Performs the boolean And operation on this and any number of additional windows.
     */
    public and(...windows: Windows[]): Windows;

    /**
     * Performs the boolean Or operation on this and any number of additional windows.
     */
    public or(...windows: Windows[]): Windows;

    /** Perform the boolean Not operation on this windows object. */
    public not(): Windows;

    /**
     * Produces a constraint violation whenever this is false.
     *
     * Essentially, express the condition you want to be satisfied, then use
     * this method to produce a violation whenever it is NOT satisfied.
     */
    public violations(): Constraint;

    /**
     * Shifts the start and end of all true segments by a duration.
     *
     * The second argument is optional: if omitted, `shiftBy(dur)` shifts all segments uniformly by `dur`, which
     * is equivalent to `shiftBy(dur, dur)`.
     *
     * Shifts the start and end of all false segment by the reversed directions (i.e. the start of each false segment
     * is shifted by `fromEnd`).
     *
     * @param fromStart duration to add from the start of each true segment
     * @param fromEnd duration to add from the end of each true segment. Default is equal to `fromStart` if omitted.
     */
    public shiftBy(fromStart: AST.Duration, fromEnd?: AST.Duration | undefined): Windows;

    /**
     * Returns a new windows object, with all true segments shorter than or equal to the given
     * duration set to false.
     *
     * @param duration the duration
     */
    public longerThan(duration: AST.Duration): Windows;

    /**
     * Returns a new windows object, with all true segments longer than or equal to the given
     * duration set to false.
     *
     * @param duration the duration
     */
    public shorterThan(duration: AST.Duration): Windows;

    /**
     * Splits each window into equal sized sub-intervals. Returns a Spans object.
     *
     * For `.split(N)`, N sub-windows will be created by removing N-1 points in the middle.
     *
     * @throws UnsplittableSpanException during backend evaluation if the duration of a window is fewer microseconds than N.
     * @throws UnsplittableSpanException if any window is unbounded (i.e. contains MIN_VALUE or MAX_VALUE)
     * @throws InvalidGapsException if this contains any gaps.
     *
     * @param numberOfSubSpans how many sub-windows to split each window into
     * @param internalStartInclusivity Inclusivity for any newly generated span start points (default Inclusive).
     * @param internalEndInclusivity Inclusivity for any newly generated span end points (default Exclusive).
     */
    public split(numberOfSubSpans: number, internalStartInclusivity?: Inclusivity, internalEndInclusivity?: Inclusivity): Spans;

    /**
     * Replaces each true segment with its start point.
     *
     * Since gaps represent "unknown", true segments that come after a gap don't have a known start point.
     * So instead their first known point is unset and the rest is set to false.
     *
     * True segments that explicitly come directly after false and include their start point have all except their
     * start point set to false. If they don't include the start point, then the whole interval is set to false and the
     * start point is set true.
     */
    public starts(): Windows;

    /**
     * Replaces each true segment with its end point.
     *
     * Since gaps represent "unknown", true segments that come before a gap don't have a known end point.
     * So instead their last known point is unset and the rest is set to false.
     *
     * True segments that explicitly come directly before false and include their end point have all except their
     * end point set to false. If they don't include the end point, then the whole interval is set to false and the
     * end point is set true.
     */
    public ends(): Windows;

    /**
     * Convert this into a set of Spans.
     *
     * @throws InvalidGapsException if this contains any gaps.
     */
    public spans(): Spans;

    /**
     * Produces windows for each activity present in the plan and belonging to one of the activity types passed
     *
     * @param activityTypes the activity types
     */
    public static During<A extends Gen.ActivityType>(...activityTypes: Gen.ActivityType[]): Windows;

    /**
     * Replaces all gaps in this profile with default segments taken from the argument.
     *
     * @param defaultProfile boolean or windows to take default values from
     */
    public assignGaps(defaultProfile: Windows | boolean): Windows;

    /**
     * Counts the cumulative amount of time spent in an active Window, as a multiple of some unit of time.
     *
     * The output profile always starts at 0 at the simulation start time. Initial conditions from before the simulation
     * start time are not considered, even in the case of temporal-subset plan branches with later start times.
     *
     * @param unit unit of time to count. Does not need to be a round unit (i.e. can be 1.5 minutes, if you want).
     */
    public accumulatedDuration(unit: AST.Duration): Real;
  }

  /**
   * A set of intervals that can overlap without being coalesced together.
   */
  export class Spans {
    public readonly __astNode: AST.SpansExpression;

    /**
     * Create a Spans object with a single span defined by an interval.
     * @param interval interval for the span
     * @constructor
     */
    public static FromInterval(interval: Interval): Spans;

    /**
     * Connects the end of each of these spans to the start of the nearest span in the argument.
     *
     * This operation creates a new spans object. For each span `s` in `this`, it produces a span from
     * the end of `s` to the start of the first span in `other` that occurs after the end of `s`.
     *
     * If `s` and the nearest subsequent span in `other` meet exactly, with no intersection and no
     * space between them, a singleton span (containing exactly one time) is still created at the meeting point.
     *
     * If there are no spans in `other` that occur after `s`, a span is still created from the end of `s` until the
     * end of the plan.
     *
     * @param other
     */
    public connectTo(other: Spans): Spans;

    /**
     * Returns the instantaneous start points of the these spans.
     */
    public starts(): Spans;

    /**
     * Returns the instantaneous end points of the these spans.
     */
    public ends(): Spans;

    /**
     * Shifts the start and end of each Span by a duration.
     *
     * @param fromStart duration to shift start by
     * @param fromEnd duration to shift end by (defaults is `fromStart` if omitted)
     */
    public shiftBy(fromStart: AST.Duration, fromEnd?: AST.Duration | undefined): Spans;

    /**
     * Splits each span into equal sized sub-spans.
     *
     * For `.split(N)`, N sub-spans will be created by removing N-1 points in the middle.
     *
     * @throws UnsplittableIntervalException during backend evaluation if the duration of a span is fewer microseconds than N.
     * @param numberOfSubSpans how many sub-spans to split each span into
     * @param internalStartInclusivity Inclusivity for any newly generated span start points (default Inclusive).
     * @param internalEndInclusivity Inclusivity for any newly generated span end points (default Exclusive).
     */
    public split(numberOfSubSpans: number, internalStartInclusivity?: Inclusivity, internalEndInclusivity?: Inclusivity): Spans;

    /**
     * Convert this into a set of Windows.
     *
     * This is a lossy operation.
     * If any spans overlap or touch, they will be coalesced into a single window.
     */
    public windows(): Windows;

    /**
     * Applies an expression producing spans for each instance of an activity type and returns the aggregated set of spans.
     *
     * @param activityType activity type to check
     * @param expression function of an activity instance that returns a Spans; default returns the instance's span.
     * @constructor
     */
    public static ForEachActivity<A extends Gen.ActivityType>(
        activityType: A,
        expression?: (instance: ActivityInstance<A>) => Spans,
    ): Spans;

    /**
     * Counts the cumulative amount of time spent in an active Span, as a multiple of some unit of time.
     * Overlapping spans are double-counted.
     *
     * The output profile always starts at 0 at the simulation start time. Initial conditions from before the simulation
     * start time are not considered, even in the case of temporal-subset plan branches with later start times.
     *
     * @param unit unit of time to count. Does not need to be a round unit (i.e. can be 1.5 minutes, if you want).
     */
    public accumulatedDuration(unit: AST.Duration): Real;

    /**
     * Selects only spans that occur during a true segment, removing those that don't.
     *
     * Spans that only partially overlap with a true segment will be truncated, and spans
     * that overlap with multiple true segments will be split.
     *
     * @param windows
     */
    public selectWhenTrue(windows: Windows): Spans;

    /**
     * Creates a windows object that is false when one of these Spans does not contain a child span, and true otherwise.
     * The parents are the callee and the children are the argument, i.e. `parents.contains(children)`.
     * The default requirement of one child per parent can be modified.
     *
     * More concretely, for the expression `A.contains(B)`, the result is:
     * - `true` inside any A spans if (by default) they contain at least one B span
     *   - for counting spans, "contain" means that the entire B span is inside the A span.
     * - `true` (vacuously) outside the union of all A spans
     * - `false` inside any A spans that do not contain a B span
     *
     * The requirement for one child span can be optionally changed by providing the second argument:
     * - `{count: n}` requires *exactly* `n` children per parent.
     * - `{count: {min: n}}` requires at least `n` children per parent.
     * - `{count: {max: n}}` requires at most `n` children per parent
     * - `{duration: {min: d}}` requires a total duration of children of at least `d`
     * - `{duration: {max: d}}` requires a total duration of children of at most `d`
     *
     * Both `count` and `duration` can be provided at the same time
     * (e.g. `{count: 2, duration: {min: Temporal.Duration.from({hours: 1})}}`).
     * Both `min` and `max` can be provided at the same time (e.g. `{count: {min: 1, max: 3}}`.
     *
     * There is no option to require an exact duration, because the implementation uses floating point comparison.
     * If you need an exact duration, you can approximate it by using a small range around the desired value.
     *
     * @param children child spans to check the existence of.
     * @param requirement what to check for in each parent span.
     */
    public contains(children: Spans, requirement?: SpansContainsRequirement): Windows;
  }

  export type SpansContainsRequirement = {
    count?: number | {
      min?: number,
      max?: number
    },
    duration?: {
      min?: AST.Duration,
      max?: AST.Duration
    }
  }

  /**
   * A real number profile; a function from time to real numbers.
   *
   * Most real profiles are piecewise-linear, but some can be piecewise-constant if the
   * underlying datatype is an integer. More general function types are currently unsupported.
   */
  export class Real {
    /** Internal AST Node */
    public readonly __astNode: AST.RealProfileExpression;

    /**
     * Reference the real profile associated with a resource.
     * @param name
     * @constructor
     */
    public static Resource(name: Gen.RealResourceName): Real;

    /**
     * Create a constant real profile for all time.
     * @param value value of the segment
     * @param rate rate of change of the segment
     * @param interval interval of the segment (default: plan horizon)
     * @constructor
     */
    public static Value(value: number, rate?: number, interval?: Interval): Real;

    /**
     * Create a real profile from this profile's derivative.
     */
    public rate(): Real;

    /**
     * Create a real profile by multiplying this profile by a constant
     * @param multiplier
     */
    public times(multiplier: number): Real;

    /**
     * Create a real profile by adding this and another real profile together.
     * @param other
     */
    public plus(other: Real | number): Real;

    /**
     * Create a real profile by subtracting another profile from this.
     * @param other
     */
    public minus(other: Real | number): Real;

    /**
     * Create a real profile where all segments are negated.
     */
    public negate(): Real;

    /**
     * Produce a window whenever this profile is less than another real profile.
     * @param other
     */
    public lessThan(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is less than or equal to another real profile.
     * @param other
     */
    public lessThanOrEqual(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is greater than to another real profile.
     * @param other
     */
    public greaterThan(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is greater than or equal to another real profile.
     * @param other
     */
    public greaterThanOrEqual(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is equal to another real profile.
     * @param other
     */
    public equal(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is not equal to another real profile.
     * @param other
     */
    public notEqual(other: Real | number): Windows;

    /**
     * Produce a window whenever this profile is equal to another real profile plus or minus the tolerance
     * @param other
     * @param tolerance
     */
    public isWithin(other: Real | number, tolerance: Real | number): Windows;

    /**
     * Produce an instantaneous window whenever this profile changes.
     */
    public changes(): Windows;

    /**
     * Replaces all gaps in this profile with default segments taken from the argument.
     *
     * @param defaultProfile number or real profile to take default values from
     */
    public assignGaps(defaultProfile: Real | number): Real;

    /**
     * Returns the value of this profile at a specific timepoint.
     * @param timepoint the timepoint, represented by a Spans (must be reduced to a single point)
     */
    public valueAt(timepoint: Spans): Discrete<number>;

    /**
     * Shifts the profile forward or backward in time.
     *
     * @param duration duration shift each segment (can be negative)
     */
    public shiftBy(duration: Temporal.Duration): Real;
  }

  /**
   * A profile of any type; a function from time to any value representable by JSON.
   *
   * All profiles can be represented as Discrete, even Real profiles. Keep in mind that treating real profiles as
   * discrete will lose access to the ordering operators (>, <, >=, <=). In most cases it is better not to do this.
   */
  export class Discrete<Schema> {
    /** Internal AST Node */
    public readonly __astNode: AST.DiscreteProfileExpression;

    /**
     * @internal
     *
     * Internal instance of the Schema type, for type checking.
     *
     * It is never assigned or accessed, and is discarded by the end.
     * This field should remain `undefined` for the full runtime.
     *
     * Don't remove it though, it'll break the tests.
     */
    public readonly __schemaInstance: Schema;

    /**
     * Returns a discrete profile producing an object.
     * Used internally. Do not use to build constraints or goals.
     */
    public static Map<Schema>(expressions: { [key: string]: any }): Discrete<Schema>;

    /**
     * Returns a discrete profile producing a list.
     * Used internally. Do not use to build constraints or goals.
     */
    public static List<Schema>(expressions: any[]): Discrete<Schema>;

    /**
     * Reference the discrete profile associated with a resource.
     * @param name
     * @constructor
     */
    public static Resource<R extends Gen.ResourceName>(name: R): Discrete<Gen.Resource[R]>;

    /**
     * Create a constant discrete profile for all time.
     * @param value value of the segment
     * @param interval interval of the segment (default: plan horizon)
     * @constructor
     */
    public static Value<Schema>(value: Schema, interval?: Interval): Discrete<Schema>;

    /**
     * Produce an instantaneous window whenever this profile makes a specific transition.
     *
     * @param from initial value
     * @param to final value
     */
    public transition(from: Schema, to: Schema): Windows;

    /**
     * Produce a window whenever this profile is equal to another discrete profile.
     * @param other
     */
    public equal(other: Schema | Discrete<Schema>): Windows;

    /**
     * Produce a window whenever this profile is not equal to another discrete profile.
     * @param other
     */
    public notEqual(other: Schema | Discrete<Schema>): Windows;

    /**
     * Produce an instantaneous window whenever this profile changes.
     */
    public changes(): Windows;

    /**
     * Replaces all gaps in this profile with default segments taken from the argument.
     *
     * @param defaultProfile value or discrete profile to take default values from
     */
    public assignGaps(defaultProfile: Discrete<Schema> | Schema): Discrete<Schema>;

    /**
     * Returns the value of this profile at a specific timepoint.
     * @param timepoint the timepoint, represented by a Spans (must be reduced to a single point)
     */
    public valueAt(timepoint: Spans): Discrete<Schema>;

    /**
     * Shifts the profile forward or backward in time.
     *
     * @param duration duration shift each segment (can be negative)
     */
    public shiftBy(duration: Temporal.Duration): Discrete<Schema>;
  }

  /** An enum for whether an interval includes its bounds. */
  enum Inclusivity {
    Inclusive = "Inclusive",
    Exclusive = "Exclusive"
  }

  /** Represents an absolute time range, using Temporal.Instant. */
  export class Interval {
    public readonly __astNode: AST.IntervalExpression;

    /** Creates an instantaneous interval at a single time. */
    public static At(time: Temporal.Instant): Interval;

    /** Creates an interval between two times, with optional bounds inclusivity (default inclusive). */
    public static Between(start: Temporal.Instant, end: Temporal.Instant, startInclusivity?: Inclusivity | undefined, endInclusivity?: Inclusivity | undefined): Interval;

    /** Creates an interval for the whole planning horizon. */
    public static Horizon(): Interval;

    public duration(): AST.Duration;
  }
}

// Make Constraint available on the global object
Object.assign(globalThis, { Constraint, Windows, Spans, Real, Discrete, Inclusivity, Interval, RollingThresholdAlgorithm });
