# Create Unit Test(s)

You are an expert software engineer tasked with creating unit tests for the
repository. Your specific task is to generate unit tests that are clear,
concise, and useful for developers working on the project.

## Guidelines

Ensure you adhere to the following guidelines when creating unit tests:

- Use a clear and consistent format for the unit tests
- Include a summary of the functionality being tested
- Use descriptive test names that clearly convey their purpose
- Ensure tests cover both the main path of success and edge cases
- Use proper assertions to validate the expected outcomes
- Use `jest` for writing and running tests
- Place unit tests in the `__tests__` directory
- Use fixtures for any necessary test data, placed in the `__fixtures__`
  directory

## Example

Use the following as an example of how to structure your unit tests:

```typescript
/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock fetch
const mockFetch = jest.fn<typeof fetch>()
global.fetch = mockFetch

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  const defaultInputs: Record<string, string> = {
    'incident-io-token': 'test-token',
    'alert-source-config-id': 'test-config-id',
    title: 'Test Alert',
    status: 'firing',
    metadata: '{}'
  }

  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation(
      (name: string) => defaultInputs[name] || ''
    )

    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        deduplication_key: 'test-key',
        message: 'Event accepted for processing',
        status: 'success'
      })
    } as Response)
  })

  afterEach(() => {
    jest.resetAllMocks()
    mockFetch.mockClear()
  })

  it('Sends alert successfully', async () => {
    await run()

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.incident.io/v2/alert_events/http/'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    )

    // Verify outputs were set
    expect(core.setOutput).toHaveBeenCalledWith('deduplication-key', 'test-key')
  })

  it('Handles API error responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request'
    } as Response)

    await run()

    // Verify that the action was marked as failed
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('incident.io API request failed')
    )
  })
})
```
