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
