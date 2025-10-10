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

  it('Sends alert successfully with all inputs', async () => {
    await run()

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://api.incident.io/v2/alert_events/http/test-config-id?token=test-token'
      ),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"title":"Test Alert"')
      })
    )

    // Verify outputs were set
    expect(core.setOutput).toHaveBeenCalledWith('deduplication-key', 'test-key')
    expect(core.setOutput).toHaveBeenCalledWith('response-status', 'success')
  })

  it('Sends alert with minimal inputs', async () => {
    // Override getInput to only return required fields
    core.getInput.mockImplementation((name: string) => {
      const minimalInputs = {
        'incident-io-token': 'test-token',
        'alert-source-config-id': 'test-config-id',
        title: 'Test Alert',
        status: 'firing',
        metadata: '{}'
      }
      return minimalInputs[name] || ''
    })

    await run()

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalled()

    // Verify outputs were set
    expect(core.setOutput).toHaveBeenCalledWith('deduplication-key', 'test-key')
  })

  it('Uses default alert source config ID when not provided', async () => {
    // Override getInput to not return alert-source-config-id
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'incident-io-token': 'test-token',
        'alert-source-config-id': '', // Empty, should use default
        title: 'Test Alert',
        status: 'firing',
        metadata: '{}'
      }
      return inputs[name] || ''
    })

    await run()

    // Verify fetch was called with default config ID
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('01GW2G3V0S59R238FAHPDS1R66'),
      expect.anything()
    )
  })

  it('Includes GitHub workflow context in metadata', async () => {
    await run()

    // Get the call arguments from fetch
    const fetchCall = mockFetch.mock.calls[0]
    const requestInit = fetchCall[1] as RequestInit
    const requestBody = JSON.parse(requestInit.body as string)

    // Verify GitHub context is included in metadata
    expect(requestBody.metadata.github).toEqual({
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
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = { ...defaultInputs }
      inputs['deduplication-key'] = ''
      return inputs[name] || ''
    })

    await run()

    // Get the call arguments from fetch
    const fetchCall = mockFetch.mock.calls[0]
    const requestInit = fetchCall[1] as RequestInit
    const requestBody = JSON.parse(requestInit.body as string)

    // Verify default deduplication key is used
    expect(requestBody.deduplication_key).toBe('123456')
  })

  it('Uses default source URL if not provided', async () => {
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = { ...defaultInputs }
      inputs['source-url'] = ''
      return inputs[name] || ''
    })

    await run()

    // Get the call arguments from fetch
    const fetchCall = mockFetch.mock.calls[0]
    const requestInit = fetchCall[1] as RequestInit
    const requestBody = JSON.parse(requestInit.body as string)

    // Verify default source URL is used
    expect(requestBody.source_url).toBe(
      'https://github.com/test-owner/test-repo/actions/runs/123456'
    )
  })

  it('Handles invalid status', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'status') return 'invalid-status'
      return defaultInputs[name] || ''
    })

    await run()

    // Verify that the action was marked as failed
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid status')
    )
  })

  it('Handles invalid metadata JSON', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'metadata') return 'invalid-json'
      return defaultInputs[name] || ''
    })

    await run()

    // Verify that the action was marked as failed
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse metadata JSON')
    )
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
      expect.stringContaining('incident.io API request failed with status 400')
    )
  })

  it('Handles resolved status', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'status') return 'resolved'
      return defaultInputs[name] || ''
    })

    await run()

    // Get the call arguments from fetch
    const fetchCall = mockFetch.mock.calls[0]
    const requestInit = fetchCall[1] as RequestInit
    const requestBody = JSON.parse(requestInit.body as string)

    // Verify status is set to resolved
    expect(requestBody.status).toBe('resolved')
  })
})
