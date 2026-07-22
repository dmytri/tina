Feature: OpenCode adapter integration
  As an OpenCode user
  I want TINA to block tool calls when the assistant says a disallowed phrase
  So that the agent stays on the chosen direction

  Scenario: OpenCode plugin blocks tool calls after assistant says a disallowed phrase
    Given OpenCode is running with the TINA plugin loaded
    When the assistant outputs a disallowed phrase in its response
    And the assistant then attempts a tool call
    Then the tool call is blocked with the TINA rejection message

  Scenario: User text does not trigger the OpenCode latch
    Given OpenCode is running with the TINA plugin loaded
    When the user sends "try an alternative approach"
    Then the assistant can execute a tool call

  Scenario: OpenCode sessions have independent latches
    Given OpenCode sessions "alpha" and "beta" use the TINA plugin
    When the assistant in session "alpha" outputs "try an alternative approach"
    Then session "alpha" rejects a tool call
    And session "beta" permits a tool call

  Scenario: User activity in another OpenCode session does not reset a latch
    Given OpenCode session "alpha" is latched
    And OpenCode session "beta" is unlatched
    When the user sends a message in session "beta"
    Then session "alpha" remains latched

  Scenario: OpenCode loads custom phrases from its environment
    Given "TINA_PHRASES" configures "stay with this plan"
    When the OpenCode assistant outputs "stay with this plan"
    Then the tool call is blocked with the TINA rejection message

  Scenario: OpenCode reports invalid custom phrase configuration
    Given "TINA_PHRASES" contains invalid JSON
    When the OpenCode plugin loads
    Then OpenCode reports that "TINA_PHRASES" is invalid

  Scenario: OpenCode detects a disallowed phrase in reasoning output
    Given OpenCode is running with the TINA plugin loaded
    When reasoning output contains "try an alternative approach"
    Then the tool call is blocked with the TINA rejection message
