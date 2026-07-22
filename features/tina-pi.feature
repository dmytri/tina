Feature: Pi adapter integration
  As a Pi user
  I want each session to maintain its own TINA latch
  So that one session cannot block or reset another session

  Scenario: Pi rejects repeated tool calls while a session is latched
    Given a Pi session is running with TINA loaded
    When the assistant outputs "try an alternative approach"
    Then the first tool call is rejected with the TINA message
    And the next tool call is rejected with the TINA message

  Scenario: Pi sessions have independent latches
    Given Pi sessions "alpha" and "beta" use TINA
    When the assistant in session "alpha" outputs "try an alternative approach"
    Then session "alpha" rejects a tool call
    And session "beta" permits a tool call

  Scenario Outline: Pi loads custom phrases from its settings files
    Given Pi settings at "<location>" configure "stay with this plan"
    When the Pi assistant outputs "stay with this plan"
    Then Pi rejects the next tool call with the TINA message

    Examples:
      | location              |
      | .pi/settings.json     |
      | ~/.pi/agent/settings.json |

  Scenario: Pi reports invalid custom phrase settings
    Given ".pi/settings.json" contains invalid TINA phrase settings
    When the Pi extension loads
    Then Pi reports the invalid settings file path

  Scenario: New Pi input resets the session latch
    Given a Pi session is latched
    When new input reaches the Pi session
    Then the Pi session permits the next tool call

  Scenario: The Pi tina command resets the session latch
    Given a Pi session is latched
    When the user runs the Pi "tina" command
    Then the Pi session permits the next tool call

  Scenario Outline: Pi detects disallowed phrases in structured assistant output
    Given a Pi session is running with TINA loaded
    When the assistant outputs "try an alternative approach" in a "<block>" block
    Then the first tool call is rejected with the TINA message

    Examples:
      | block    |
      | text     |
      | thinking |
