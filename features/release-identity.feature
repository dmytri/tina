Feature: Release artifact identity
  As a TINA installer
  I want each artifact to identify its current implementation
  So that package and plugin updates install the intended fixes

  @contract
  Scenario Outline: Adapter metadata identifies the current release
    Given the release metadata for "<artifact>"
    When the artifact version is inspected
    Then the version is "<version>"

    Examples:
      | artifact              | version |
      | Core npm package      | 0.3.2   |
      | OpenCode npm package  | 0.3.3   |
      | Pi npm package        | 0.3.4   |
      | agent-tina plugin     | 0.3.5   |

  @contract
  Scenario: Open Plugin version remains independent during metadata sync
    Given copied release metadata with Open Plugin version "0.3.5"
    And the copied core package version is "0.3.2"
    When Open Plugin release metadata is synchronized
    Then both copied plugin manifests identify version "0.3.5"
    And the copied marketplace entry identifies version "0.3.5"
    And the copied core package version remains "0.3.2"

  @contract
  Scenario Outline: Published adapters use a bounded compatible core range
    Given the package manifest for "<adapter>"
    When the core dependency range is inspected
    Then the range accepts "0.3.1"
    And the range excludes "1.0.0"

    Examples:
      | adapter   |
      | OpenCode  |
      | Pi        |
