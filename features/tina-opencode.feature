Feature: OpenCode adapter integration
  As an OpenCode user
  I want TINA to block tool calls when the assistant says a disallowed phrase
  So that the agent stays on the chosen direction

  @eval
  Scenario: OpenCode plugin blocks tool calls after assistant says a disallowed phrase
    Given OpenCode is running with the TINA plugin loaded
    When the assistant outputs a disallowed phrase in its response
    And the assistant then attempts a tool call
    Then the tool call is blocked with the TINA rejection message
