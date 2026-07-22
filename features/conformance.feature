Feature: Shipshape conformance checks
  Project methodology rules, derived during harbour and made executable on promotion.
  These scenarios attest the project's own method, not the product behaviour.

  @conformance
  Scenario: No perturbation token stands in implementation
    Given the implementation directory contains no "PERTURBATION" token
    When a quiescence scan runs over the implementation paths
    Then the scan reports no matching tokens

  @conformance
  Scenario: Every @planks annotation matches a step-definition pattern
    Given the project has step definitions with known patterns
    And production seams carry @planks annotations
    When a plank-form check joins plank-inventory against step-usage output
    Then every @planks string matches a currently defined step-definition pattern

  @conformance
  Scenario: Every behaviour-bearing step pattern has a matching @planks annotation
    Given the project has step definitions with known patterns
    And production seams carry @planks annotations
    When a plank-coverage check joins step-usage output against plank-inventory
    Then every behaviour-bearing step-definition pattern has a matching @planks annotation

  @conformance
  Scenario: Every supported adapter has production-backed verification
    Given Pi, OpenCode, and Claude Code are supported adapters
    When binding adapter scenarios are inspected
    Then each supported adapter executes its production seam

  @conformance
  Scenario: Every supported adapter seam participates in plank checks
    Given Pi, OpenCode, and Claude Code are supported adapters
    When implementation paths and plank inventory are inspected
    Then every supported adapter seam is included

  @conformance
  Scenario: TypeScript source passes static verification
    Given the repository TypeScript source
    When the configured typecheck and lint commands run
    Then both commands exit successfully
