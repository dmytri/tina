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
      | OpenCode npm package  | 0.3.2   |
      | Pi npm package        | 0.3.3   |
      | agent-tina plugin     | 0.3.4   |

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
