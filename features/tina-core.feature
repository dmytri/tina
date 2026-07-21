Feature: Core phrase configuration
  As a developer integrating TINA
  I want to configure custom phrases at runtime
  So that the interceptor matches the project's vocabulary

  Scenario: Custom phrases can be configured at runtime
    Given the default phrase list is active
    When custom phrases are configured via setPhrases
    Then scanText matches a custom phrase but not an original default phrase
    And resetPhrases restores the default list
