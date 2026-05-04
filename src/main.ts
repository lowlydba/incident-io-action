import * as core from '@actions/core'

/** Subset of @actions/core used by this action */
type CoreApi = Pick<
  typeof core,
  'debug' | 'info' | 'getInput' | 'setOutput' | 'setFailed'
>

/**
 * Interface for the incident.io alert event request body
 */
interface AlertEventRequest {
  title: string
  status: 'firing' | 'resolved'
  description?: string
  deduplication_key?: string
  source_url?: string
  metadata?: Record<string, unknown>
}

/**
 * Interface for the incident.io API response
 */
interface AlertEventResponse {
  deduplication_key: string
  message: string
  status: string
}

/**
 * Sends an alert to incident.io via their Alert Events V2 API
 *
 * @param token - The incident.io API token
 * @param alertSourceConfigId - The alert source config ID
 * @param payload - The alert event payload
 * @param coreApi - The @actions/core API (injectable for testing)
 * @returns The response from the incident.io API
 */
async function sendAlert(
  token: string,
  alertSourceConfigId: string,
  payload: AlertEventRequest,
  coreApi: CoreApi
): Promise<AlertEventResponse> {
  const url = `https://api.incident.io/v2/alert_events/http/${alertSourceConfigId}?token=${encodeURIComponent(token)}`

  coreApi.debug(`Sending alert to incident.io: ${url}`)
  coreApi.debug(`Payload: ${JSON.stringify(payload, null, 2)}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `incident.io API request failed with status ${response.status}: ${errorText}`
    )
  }

  return (await response.json()) as AlertEventResponse
}

/**
 * The main function for the action.
 *
 * @param coreApi - The @actions/core API (injectable for testing)
 * @returns Resolves when the action is complete.
 */
export async function run(coreApi: CoreApi = core): Promise<void> {
  try {
    // Get inputs
    const token = coreApi.getInput('incident-io-token', { required: true })
    const alertSourceConfigId =
      coreApi.getInput('alert-source-config-id', { required: false }) ||
      '01GW2G3V0S59R238FAHPDS1R66'
    const title = coreApi.getInput('title', { required: true })
    const status = coreApi.getInput('status', { required: true }) as
      | 'firing'
      | 'resolved'
    const description = coreApi.getInput('description')
    const deduplicationKey = coreApi.getInput('deduplication-key')
    const sourceUrl = coreApi.getInput('source-url')
    const metadataJson = coreApi.getInput('metadata')

    // Validate status
    if (status !== 'firing' && status !== 'resolved') {
      throw new Error(
        `Invalid status: ${status}. Must be either "firing" or "resolved"`
      )
    }

    // Parse metadata JSON
    let metadata: Record<string, unknown> = {}
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson) as Record<string, unknown>
      } catch (error) {
        throw new Error(
          `Failed to parse metadata JSON: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    // Add GitHub workflow context to metadata
    const githubContext = {
      workflow: process.env.GITHUB_WORKFLOW || 'unknown',
      workflow_id: process.env.GITHUB_RUN_ID || 'unknown',
      workflow_run_number: process.env.GITHUB_RUN_NUMBER || 'unknown',
      workflow_attempt: process.env.GITHUB_RUN_ATTEMPT || 'unknown',
      job: process.env.GITHUB_JOB || 'unknown',
      actor: process.env.GITHUB_ACTOR || 'unknown',
      repository: process.env.GITHUB_REPOSITORY || 'unknown',
      ref: process.env.GITHUB_REF || 'unknown',
      sha: process.env.GITHUB_SHA || 'unknown',
      event_name: process.env.GITHUB_EVENT_NAME || 'unknown'
    }

    // Merge user metadata with GitHub context
    metadata = {
      ...metadata,
      github: githubContext
    }

    // Build the alert payload
    const payload: AlertEventRequest = {
      title,
      status
    }

    // Add optional fields
    if (description) {
      payload.description = description
    }

    // Use provided deduplication key or default to GitHub run ID
    payload.deduplication_key =
      deduplicationKey || process.env.GITHUB_RUN_ID || `${Date.now()}`

    // Use provided source URL or default to GitHub workflow run URL
    payload.source_url =
      sourceUrl ||
      `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`

    payload.metadata = metadata

    coreApi.info(`Sending alert to incident.io...`)
    coreApi.info(`Title: ${title}`)
    coreApi.info(`Status: ${status}`)
    coreApi.info(`Deduplication Key: ${payload.deduplication_key}`)

    // Send the alert
    const response = await sendAlert(
      token,
      alertSourceConfigId,
      payload,
      coreApi
    )

    coreApi.info(`Alert sent successfully!`)
    coreApi.info(`Response: ${response.message}`)

    // Set outputs
    coreApi.setOutput('deduplication-key', response.deduplication_key)
    coreApi.setOutput('response-status', response.status)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) coreApi.setFailed(error.message)
  }
}
