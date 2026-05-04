/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import * as core from '../__fixtures__/core.js'

// Mock @actions/core with our fixture functions before importing the module
mock.module('@actions/core', {
  namedExports: core as unknown as Record<string, unknown>
})

// Mock fetch - double assertion through `unknown` is required because `mock.fn()`
// returns a `Mock<F>` wrapper type that is not directly assignable to `typeof fetch`
const mockFetch = mock.fn<typeof fetch>()
global.fetch = mockFetch as unknown as typeof fetch

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  const defaultInputs: Record<string, string> = {
    'incident-io-token': 'test-token',
    'alert-source-config-id': 'test-config-id',
    title: 'Test Alert',
    status: 'firing',
    description: 'Test description',
    'deduplication-key': 'test-key',
    'source-url': 'https://example.com',
    metadata: '{"service": "test-service"}'
  }

  beforeEach(() => {
    // Set default environment variables
    process.env.GITHUB_WORKFLOW = 'Test Workflow'
    process.env.GITHUB_RUN_ID = '123456'
    process.env.GITHUB_RUN_NUMBER = '1'
    process.env.GITHUB_RUN_ATTEMPT = '1'
    process.env.GITHUB_JOB = 'test-job'
    process.env.GITHUB_ACTOR = 'test-actor'
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'
    process.env.GITHUB_REF = 'refs/heads/main'
    process.env.GITHUB_SHA = 'abc123'
    process.env.GITHUB_EVENT_NAME = 'push'

    // Set the action's inputs as return values from core.getInput().
    core.getInput.mock.mockImplementation(
      (name: string) => defaultInputs[name] ?? ''
    )

    // Mock successful API response
    mockFetch.mock.mockImplementation(
      async () =>
        ({
          ok: true,
          status: 202,
          json: async () => ({
            deduplication_key: 'test-key',
            message: 'Event accepted for processing',
            status: 'success'
          })
        }) as unknown as Promise<Response>
    )
  })

  afterEach(() => {
    mock.reset()
  })

  it('Sends alert successfully with all inputs', async () => {
    await run()

    // Verify fetch was called with correct parameters
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [url, init] = mockFetch.mock.calls[0].arguments
    assert.ok(
      (url as string).includes(
        'https://api.incident.io/v2/alert_events/http/test-config-id?token=test-token'
      )
    )
    assert.strictEqual((init as RequestInit).method, 'POST')
    assert.deepStrictEqual((init as RequestInit).headers, {
      'Content-Type': 'application/json'
    })
    assert.ok(
      ((init as RequestInit).body as string).includes('"title":"Test Alert"')
    )

    // Verify outputs were set
    assert.ok(
      core.setOutput.mock.calls.some(
        (call) =>
          call.arguments[0] === 'deduplication-key' &&
          call.arguments[1] === 'test-key'
      )
    )
    assert.ok(
      core.setOutput.mock.calls.some(
        (call) =>
          call.arguments[0] === 'response-status' &&
          call.arguments[1] === 'success'
      )
    )
  })

  it('Sends alert with minimal inputs', async () => {
    // Override getInput to only return required fields
    core.getInput.mock.mockImplementation((name: string) => {
      const minimalInputs: Record<string, string> = {
        'incident-io-token': 'test-token',
        'alert-source-config-id': 'test-config-id',
        title: 'Test Alert',
        status: 'firing',
        metadata: '{}'
      }
      return minimalInputs[name] ?? ''
    })

    await run()

    // Verify fetch was called
    assert.ok(mockFetch.mock.callCount() > 0)

    // Verify outputs were set
    assert.ok(
      core.setOutput.mock.calls.some(
        (call) =>
          call.arguments[0] === 'deduplication-key' &&
          call.arguments[1] === 'test-key'
      )
    )
  })

  it('Uses default alert source config ID when not provided', async () => {
    // Override getInput to not return alert-source-config-id
    core.getInput.mock.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'incident-io-token': 'test-token',
        'alert-source-config-id': '', // Empty, should use default
        title: 'Test Alert',
        status: 'firing',
        metadata: '{}'
      }
      return inputs[name] ?? ''
    })

    await run()

    // Verify fetch was called with default config ID
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [url] = mockFetch.mock.calls[0].arguments
    assert.ok((url as string).includes('01GW2G3V0S59R238FAHPDS1R66'))
  })

  it('Includes GitHub workflow context in metadata', async () => {
    await run()

    // Get the call arguments from fetch
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [, init] = mockFetch.mock.calls[0].arguments
    const requestBody = JSON.parse((init as RequestInit).body as string) as {
      metadata: { github: Record<string, string> }
    }

    // Verify GitHub context is included in metadata
    assert.deepStrictEqual(requestBody.metadata.github, {
      workflow: 'Test Workflow',
      workflow_id: '123456',
      workflow_run_number: '1',
      workflow_attempt: '1',
      job: 'test-job',
      actor: 'test-actor',
      repository: 'test-owner/test-repo',
      ref: 'refs/heads/main',
      sha: 'abc123',
      event_name: 'push'
    })
  })

  it('Uses default deduplication key if not provided', async () => {
    core.getInput.mock.mockImplementation((name: string) => {
      const inputs: Record<string, string> = { ...defaultInputs }
      inputs['deduplication-key'] = ''
      return inputs[name] ?? ''
    })

    await run()

    // Get the call arguments from fetch
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [, init] = mockFetch.mock.calls[0].arguments
    const requestBody = JSON.parse((init as RequestInit).body as string) as {
      deduplication_key: string
    }

    // Verify default deduplication key is used
    assert.strictEqual(requestBody.deduplication_key, '123456')
  })

  it('Uses default source URL if not provided', async () => {
    core.getInput.mock.mockImplementation((name: string) => {
      const inputs: Record<string, string> = { ...defaultInputs }
      inputs['source-url'] = ''
      return inputs[name] ?? ''
    })

    await run()

    // Get the call arguments from fetch
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [, init] = mockFetch.mock.calls[0].arguments
    const requestBody = JSON.parse((init as RequestInit).body as string) as {
      source_url: string
    }

    // Verify default source URL is used
    assert.strictEqual(
      requestBody.source_url,
      'https://github.com/test-owner/test-repo/actions/runs/123456'
    )
  })

  it('Handles invalid status', async () => {
    core.getInput.mock.mockImplementation((name: string) => {
      if (name === 'status') return 'invalid-status'
      return defaultInputs[name] ?? ''
    })

    await run()

    // Verify that the action was marked as failed
    assert.ok(
      core.setFailed.mock.calls.some((call) =>
        (call.arguments[0] as string).includes('Invalid status')
      )
    )
  })

  it('Handles invalid metadata JSON', async () => {
    core.getInput.mock.mockImplementation((name: string) => {
      if (name === 'metadata') return 'invalid-json'
      return defaultInputs[name] ?? ''
    })

    await run()

    // Verify that the action was marked as failed
    assert.ok(
      core.setFailed.mock.calls.some((call) =>
        (call.arguments[0] as string).includes('Failed to parse metadata JSON')
      )
    )
  })

  it('Handles API error responses', async () => {
    mockFetch.mock.mockImplementation(
      async () =>
        ({
          ok: false,
          status: 400,
          text: async () => 'Bad Request'
        }) as unknown as Promise<Response>
    )

    await run()

    // Verify that the action was marked as failed
    assert.ok(
      core.setFailed.mock.calls.some((call) =>
        (call.arguments[0] as string).includes(
          'incident.io API request failed with status 400'
        )
      )
    )
  })

  it('Handles resolved status', async () => {
    core.getInput.mock.mockImplementation((name: string) => {
      if (name === 'status') return 'resolved'
      return defaultInputs[name] ?? ''
    })

    await run()

    // Get the call arguments from fetch
    assert.strictEqual(mockFetch.mock.callCount(), 1)
    const [, init] = mockFetch.mock.calls[0].arguments
    const requestBody = JSON.parse((init as RequestInit).body as string) as {
      status: string
    }

    // Verify status is set to resolved
    assert.strictEqual(requestBody.status, 'resolved')
  })
})
