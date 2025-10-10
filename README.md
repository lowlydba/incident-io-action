# incident.io Alert Action

[![GitHub Super-Linter](https://github.com/lowlydba/incident-io-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/lowlydba/incident-io-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/lowlydba/incident-io-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/lowlydba/incident-io-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/lowlydba/incident-io-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/lowlydba/incident-io-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

> [!NOTE] This is an unofficial, community-created GitHub Action and is not
> affiliated with, endorsed by, or supported by incident.io. incident.io and its
> associated trademarks are property of incident.io Ltd.

A GitHub Action to send alerts to incident.io using their Alert Events V2 API.
This action automatically includes GitHub workflow context in the alert
metadata, making it easy to track which workflows triggered alerts.

## Features

- 🚨 Send alerts to incident.io from your GitHub workflows
- 🔄 Automatic deduplication using GitHub run IDs
- 📊 Includes comprehensive GitHub workflow context in metadata
- 🔗 Automatic linking back to workflow runs
- ✅ Supports both "firing" and "resolved" alert statuses
- 🎨 Customizable with additional metadata

## Prerequisites

Before using this action, you need to:

1. Have an [incident.io](https://incident.io) account
2. Create an HTTP alert source in incident.io
3. Obtain your alert source config ID and token

> **Note**: The action uses a default alert source config ID
> (`01GW2G3V0S59R238FAHPDS1R66`) if you don't specify one. This is the default
> ID shown in incident.io's API documentation. You can override this by
> providing your own `alert-source-config-id` input.

## Usage

### Basic Example

```yaml
name: Alert on Workflow Failure
on:
  workflow_run:
    workflows: ['Production Deploy']
    types: [completed]

jobs:
  alert:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Send Alert to incident.io
        uses: lowlydba/incident-io-action@v1
        with:
          incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
          alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
          title: 'Production Deploy Failed'
          status: 'firing'
          description: |
            Production deployment workflow has failed.
            Please investigate immediately.
```

### Advanced Example with Custom Metadata

```yaml
- name: Send Alert with Custom Metadata
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'High Error Rate Detected'
    status: 'firing'
    description: 'Error rate exceeded threshold in production'
    metadata: |
      {
        "service": "api",
        "environment": "production",
        "error_rate": "5.2%",
        "threshold": "1.0%"
      }
```

### Resolve Alert Example

```yaml
- name: Resolve Alert
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'Issue Resolved'
    status: 'resolved'
    deduplication-key: 'same-key-as-firing-alert'
```

## Inputs

| Input                    | Description                                                                                  | Required | Default                      |
| ------------------------ | -------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| `incident-io-token`      | incident.io API token for authentication                                                     | Yes      | -                            |
| `alert-source-config-id` | The alert source config ID from incident.io                                                  | No       | `01GW2G3V0S59R238FAHPDS1R66` |
| `title`                  | Title of the alert                                                                           | Yes      | -                            |
| `status`                 | Status of the alert (`firing` or `resolved`)                                                 | Yes      | `firing`                     |
| `description`            | Description with additional details (supports markdown)                                      | No       | -                            |
| `deduplication-key`      | Unique deduplication key for this alert. Defaults to GitHub workflow run ID if not provided  | No       | Run ID                       |
| `source-url`             | Link to the alert source. Defaults to GitHub workflow run URL if not provided                | No       | Run URL                      |
| `metadata`               | Additional metadata as JSON string (e.g., `{"service": "api", "environment": "production"}`) | No       | `{}`                         |

## Outputs

| Output              | Description                              |
| ------------------- | ---------------------------------------- |
| `deduplication-key` | The deduplication key used for the alert |
| `response-status`   | The response status from incident.io API |

## GitHub Context Metadata

The action automatically includes the following GitHub workflow context in the
alert metadata under the `github` key:

- `workflow` - Name of the workflow
- `workflow_id` - Unique ID of the workflow run
- `workflow_run_number` - Run number of the workflow
- `workflow_attempt` - Attempt number if re-run
- `job` - Name of the job
- `actor` - User who triggered the workflow
- `repository` - Repository name (owner/repo)
- `ref` - Git reference (branch/tag)
- `sha` - Commit SHA
- `event_name` - Event that triggered the workflow

This context is merged with any custom metadata you provide via the `metadata`
input.

## Development

### Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`fnm`](https://github.com/Schniz/fnm), this template has a `.node-version`
> file at the root of the repository that can be used to automatically switch to
> the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node`
> actions.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   npm test
   ```

### Making Changes

1. Format, test, and build the action

   ```bash
   npm run all
   ```

   > This step is important! It will run [`rollup`](https://rollupjs.org/) to
   > build the final JavaScript action code with all dependencies included. If
   > you do not run this step, your action will not work correctly when it is
   > used in a workflow.

2. (Optional) Test your action locally

   The [`@github/local-action`](https://github.com/github/local-action) utility
   can be used to test your action locally. It is a simple command-line tool
   that "stubs" (or simulates) the GitHub Actions Toolkit. This way, you can run
   your TypeScript action locally without having to commit and push your changes
   to a repository.

   Make sure to review and update [`.env.example`](./.env.example) with the
   required inputs for this action.

### CI/CD Testing

The CI workflow includes end-to-end testing with a real incident.io instance. To
enable this in your fork, you'll need to add the following repository secrets:

- `INCIDENT_IO_TOKEN` - Your incident.io API token
- `INCIDENT_IO_ALERT_SOURCE_ID` - Your alert source config ID

The E2E tests will:

1. Send a "firing" alert to incident.io
2. Verify the alert was created successfully
3. Wait briefly
4. Send a "resolved" alert with the same deduplication key
5. Verify the resolution was successful

> **Note**: E2E tests only run on pushes to the main repository or PRs from
> branches within the same repository (not forks) to protect secrets.

## Versioning

After testing, you can create version tag(s) that developers can use to
reference different stable versions of your action. For more information, see
[Versioning](https://github.com/actions/toolkit/blob/main/docs/action-versioning.md)
in the GitHub Actions toolkit.

## Disclaimer

This is an unofficial, community-created GitHub Action and is not affiliated
with, endorsed by, or supported by incident.io Ltd. The incident.io name, logo,
and related trademarks are property of incident.io Ltd.

This action uses the publicly available incident.io API as documented at
[api-docs.incident.io](https://api-docs.incident.io). Users of this action are
responsible for complying with incident.io's Terms of Service and API usage
policies.

The maintainers of this action are not responsible for any issues, damages, or
service disruptions that may result from using this action. Use at your own
risk.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure
to:

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation as needed
4. Run `npm run all` before submitting

For more details, see the
[Copilot Instructions](.github/copilot-instructions.md).
