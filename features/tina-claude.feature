Feature: Claude Code adapter integration
  As a Claude Code user
  I want TINA to distinguish human prompts from tool results
  So that a denied tool call cannot clear the session latch

  Scenario: A tool result does not reset the Claude Code latch
    Given a Claude transcript contains a human prompt and disallowed assistant output
    And the transcript ends with a denied tool result
    When another tool call reaches the PreToolUse hook
    Then the hook denies the tool call with the TINA rejection message

  Scenario: A new human prompt resets the Claude Code latch
    Given a Claude transcript contains disallowed assistant output
    And the transcript ends with a new human prompt
    When another tool call reaches the PreToolUse hook
    Then the hook permits the tool call
