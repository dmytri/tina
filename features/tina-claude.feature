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

  Scenario Outline: Claude Code loads custom phrases from configured sources
    Given "<source>" configures "stay with this plan" for the Claude Code hook
    And a Claude transcript contains assistant output "stay with this plan"
    When another tool call reaches the PreToolUse hook
    Then the hook denies the tool call with the TINA rejection message

    Examples:
      | source                 |
      | TINA_PHRASES           |
      | project .tina.json     |
      | plugin-root .tina.json |

  Scenario: Claude Code reports invalid custom phrase configuration
    Given the project ".tina.json" contains invalid phrase configuration
    When the Claude Code hook loads
    Then the hook reports the invalid configuration path

  Scenario Outline: Claude Code detects disallowed phrases in structured assistant output
    Given a Claude transcript contains "try a different approach" in a "<block>" block
    When another tool call reaches the PreToolUse hook
    Then the hook denies the tool call with the TINA rejection message

    Examples:
      | block    |
      | text     |
      | thinking |

  Scenario: Claude Code warns and permits when the transcript is unavailable
    Given the Claude Code hook receives an unavailable transcript path
    When another tool call reaches the PreToolUse hook
    Then the hook warns that TINA is inactive because the transcript is unavailable
    And the hook permits the tool call

  Scenario: Claude Code warns and permits after a malformed transcript record
    Given a Claude transcript contains a malformed record
    When another tool call reaches the PreToolUse hook
    Then the hook warns that TINA is inactive because the transcript record is malformed
    And the hook permits the tool call
