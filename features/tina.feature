Feature: TINA — There Is No Alternative
  As a decision-maker using an agent harness
  I want the assistant blocked when it proposes alternative approaches
  So that the chosen direction is followed without deviation

  Background:
    Given TINA is installed as a pre-execution interceptor
    And the phrase list contains "try a different approach", "try an alternative approach", and "try an alternate approach"

  Rule: Phrase detection

  Scenario: Exact phrase match triggers a latch
    Given assistant text contains the phrase "try an alternative approach"
    When TINA scans the text
    Then TINA reports a match

  Scenario: Inflected variant triggers a latch
    Given assistant text contains the phrase "try an alternate approach"
    When TINA scans the text
    Then TINA reports a match

  Scenario: Another inflected variant triggers a latch
    Given assistant text contains the phrase "try a different approach"
    When TINA scans the text
    Then TINA reports a match

  Scenario: A close phrase outside the list does not trigger
    Given assistant text contains the phrase "another approach"
    When TINA scans the text
    Then TINA reports no match

  Scenario: A generic word does not trigger
    Given assistant text contains the phrase "option"
    When TINA scans the text
    Then TINA reports no match

  Scenario: Empty text does not trigger
    Given assistant text is empty
    When TINA scans the text
    Then TINA reports no match

  Rule: Session latching

  Scenario: On match, the session latches and blocks all tool calls
    Given the session is unlatched
    When TINA detects a match
    Then the session latches
    And every subsequent tool call is rejected with the message
      """
      TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.
      """

  Scenario: While latched, a non-matching text does not unlatch
    Given the session is latched
    When TINA scans text that does not match
    Then the session remains latched
    And tool calls continue to be rejected

  Rule: Reset

  Scenario: A new user message resets the latch
    Given the session is latched
    When a new user message arrives
    Then the session unlatches
    And tool calls are permitted again

  Scenario: The "/tina reset" command resets the latch
    Given the session is latched
    When the user sends "/tina reset"
    Then the session unlatches
    And tool calls are permitted again
