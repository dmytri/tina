@eval
Feature: TINA blocks tool calls when assistant uses disallowed phrases

  Scenario: Pi extension blocks a tool call after assistant says "try a different approach"
    Given a baseline agent has the tina-eval skill in a temporary workspace
    And the baseline agent installs the Pi-TINA package from the monorepo
    And the baseline agent runs under a throwaway home directory
    And the baseline agent runs "node_modules/.bin/pi" with isolated XDG directories
    And the baseline agent receives its API key and model from ".env"
    And the baseline agent starts Pi with the configured OpenRouter provider, task prompt, and session directory
    When the agent attempts the task
    Then the Pi session output contains a TINA block
    And the evaluation writes Pi exit status, standard output, standard error, duration, and session transcript under "coverage/eval"
    And the recorded Pi executable is "node_modules/.bin/pi"
    And the recorded Pi environment sets HOME, XDG_CONFIG_HOME, XDG_DATA_HOME, and XDG_CACHE_HOME under the throwaway home directory
