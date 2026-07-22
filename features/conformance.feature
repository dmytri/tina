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

  @conformance
  Scenario: Product-facing text resolves from a content catalog
    Given the TINA content catalog at "assets/tina-content.json"
    And the TINA production modules emit user-facing text
    When production string sources are inspected
    Then every product-facing string resolves from a content catalog

  @conformance
  Scenario: Binding latch scenarios execute production seams
    Given the binding TINA latch scenarios
    When their step definitions are inspected
    Then each latch action and assertion executes a production seam

  @eval @conformance
  Scenario: Evaluation resources are reclaimed after each run
    Given the evaluation creates temporary workspaces and home directories
    When the evaluation run finishes
    Then every temporary resource created by the run is reclaimed

  @conformance
  Scenario: Independent logic scenarios run concurrently
    Given the logic scenarios use isolated state
    When the configured logic tier runs
    Then independent scenarios execute concurrently

  @conformance
  Scenario: Plank form is checked from parsed declarations
    Given TypeScript and JavaScript production seams carry plank annotations
    When the TypeScript compiler API checks plank declarations
    Then every plank is a docblock tag on a declaration
    And every provisional plank names a scenario that carries "@captain"

  @conformance
  Scenario: Static verification covers every implementation path
    Given RIGGING.md lists each production implementation path
    When the configured lint command runs
    Then every implementation path passes lint

  @conformance
  Scenario: Adapters depend inward on core
    Given the adapter and core module import graph
    And the boundary policy in "scantlings/dependency-cruiser.json"
    When dependency-cruiser checks the implementation paths
    Then adapters may import core
    And core does not import an adapter

  @conformance
  Scenario: Phrase detection has one production implementation
    Given each supported adapter detects configured phrases
    When registered phrase-detection implementations are inspected
    Then one production seam implements phrase detection
