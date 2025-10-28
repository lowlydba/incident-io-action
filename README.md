# incident.io Alert

[![GitHub Super-Linter](https://github.com/lowlydba/incident-io-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/lowlydba/incident-io-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/lowlydba/incident-io-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/lowlydba/incident-io-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/lowlydba/incident-io-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/lowlydba/incident-io-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

<img width="600" height="315" alt="incidnet-io-action-og" src="https://github.com/user-attachments/assets/08f97f96-9d17-4400-9feb-e00af64d4065" />

Send alerts to incident.io from your GitHub Actions workflows using the Alert
Events V2 API. This action automatically enriches alerts with GitHub workflow
context, enabling seamless integration between your CI/CD pipeline and incident
management.

> [!NOTE]
> This is an unofficial, community-created GitHub Action and is not
> affiliated with, endorsed by, or supported by incident.io. incident.io and its
> associated trademarks are property of Pineapple Technology Ltd.



## Table of Contents

- [📚 Tutorial: Getting Started](#-tutorial-getting-started)
- [🔧 How-To Guides](#-how-to-guides)
- [📖 Reference](#-reference)
- [💡 Explanation](#-explanation)

---

## 📚 Tutorial: Getting Started

Learn how to send your first alert to incident.io from a GitHub Actions
workflow.

### What You'll Need

1. An [incident.io](https://incident.io) account
1. A GitHub repository with Actions enabled
1. 10 minutes

### Step 1: Create an HTTP Alert Source

1. Log in to your incident.io dashboard
1. Navigate to Settings → Alert Sources
1. Click [Create Alert Source][create-http] and select HTTP
1. Give it a name (e.g., "GitHub Actions")
1. Save and note the Alert Source Config ID and Token

### Step 2: Add Secrets to Your Repository

1. Go to your GitHub repository
1. Navigate to Settings → Secrets and variables → Actions
1. Add two new repository secrets:
   - `INCIDENT_IO_TOKEN`: Your alert source token
   - `INCIDENT_IO_ALERT_SOURCE_ID`: Your alert source config ID

### Step 3: Create Your First Workflow

Create `.github/workflows/alert-on-failure.yml`:

```yaml
name: Alert on Failure
on:
  push:
    branches: [main]

jobs:
  example-job:
    runs-on: ubuntu-latest
    steps:
      - name: Simulate failure
        run: exit 1
        continue-on-error: true

      - name: Send alert to incident.io
        if: failure()
        uses: lowlydba/incident-io-action@v1
        with:
          incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
          alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
          title: 'Workflow Failed'
          status: 'firing'
          description: 'The main workflow has failed.'
```

### Step 4: Test It

1. Commit and push the workflow file
1. Watch the workflow run in the Actions tab
1. Check your incident.io dashboard for the alert

🎉 Congratulations! You've sent your first alert from GitHub Actions to
incident.io.

---

## 🔧 How-To Guides

Practical guides for common tasks.

### How to Alert on Deployment Failures

Monitor your deployment workflows and send alerts when they fail:

```yaml
name: Production Deploy
on:
  workflow_run:
    workflows: ['Deploy to Production']
    types: [completed]

jobs:
  alert-on-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Send deployment failure alert
        uses: lowlydba/incident-io-action@v1
        with:
          incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
          alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
          title: 'Production Deployment Failed'
          status: 'firing'
          description: |
            Deployment to production has failed.
            Workflow: ${{ github.event.workflow_run.name }}
            Commit: ${{ github.event.workflow_run.head_sha }}
```

### How to Add Custom Metadata

Enrich alerts with additional context using the `metadata` field:

```yaml
- name: Send alert with custom data
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'High Error Rate Detected'
    status: 'firing'
    description: 'Error rate exceeded threshold'
    metadata: |
      {
        "service": "api",
        "environment": "production",
        "error_rate": "5.2%",
        "threshold": "1.0%",
        "region": "us-east-1"
      }
```

### How to Resolve Alerts Automatically

Send a "resolved" alert when an issue is fixed:

```yaml
- name: Send firing alert
  id: alert
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'Service Degradation'
    status: 'firing'

- name: Wait for recovery
  run: sleep 60

- name: Resolve alert
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'Service Recovered'
    status: 'resolved'
    deduplication-key: ${{ steps.alert.outputs.deduplication-key }}
```

### How to Use Custom Deduplication Keys

Control alert grouping with custom deduplication keys:

```yaml
- name: Send alert with custom key
  uses: lowlydba/incident-io-action@v1
  with:
    incident-io-token: ${{ secrets.INCIDENT_IO_TOKEN }}
    alert-source-config-id: ${{ secrets.INCIDENT_IO_ALERT_SOURCE_ID }}
    title: 'Database Migration Failed'
    status: 'firing'
    deduplication-key: 'db-migration-${{ github.run_id }}'
```

---

## 📖 Reference

Complete technical reference for the action.

### Inputs

| Input                    | Description                                                                                 | Required | Default          |
| ------------------------ | ------------------------------------------------------------------------------------------- | -------- | ---------------- |
| `incident-io-token`      | incident.io API token for authentication                                                    | ✅       | -                |
| `alert-source-config-id` | The alert source config ID from incident.io                                                 | ✅       | -                |
| `title`                  | Title of the alert                                                                          | ✅       | -                |
| `status`                 | Status of the alert (`firing` or `resolved`)                                                | ✅       | `firing`         |
| `description`            | Description with additional details (supports Markdown)                                     | ❌       | -                |
| `deduplication-key`      | Unique deduplication key for this alert. Defaults to GitHub workflow run ID if not provided | ❌       | [Run ID][run-id] |
| `source-url`             | Link to the alert source. Defaults to GitHub workflow run URL if not provided               | ❌       | Run URL          |
| `metadata`               | Additional metadata as JSON string                                                          | ❌       | `{}`             |

### Outputs

| Output              | Description                              |
| ------------------- | ---------------------------------------- |
| `deduplication-key` | The deduplication key used for the alert |
| `response-status`   | The response status from incident.io API |

### Automatic GitHub Context

The action automatically includes GitHub workflow context in alert metadata under
the `github` key:

| Field                 | Description                        |
| --------------------- | ---------------------------------- |
| `workflow`            | Name of the workflow               |
| `workflow_id`         | Unique ID of the workflow run      |
| `workflow_run_number` | Run number of the workflow         |
| `workflow_attempt`    | Attempt number if re-run           |
| `job`                 | Name of the job                    |
| `actor`               | User who triggered the workflow    |
| `repository`          | Repository name (owner/repository) |
| `ref`                 | Git reference (branch/tag)         |
| `sha`                 | Commit SHA                         |
| `event_name`          | Event that triggered the workflow  |

This context is automatically merged with any custom `metadata` you provide.

---

## 💡 Explanation

### Why Use This Action?

Problem: When CI/CD pipelines fail, teams need immediate visibility into the
failure to respond quickly. While GitHub provides notifications, integrating
with a dedicated incident management platform like incident.io provides better
context, tracking, and collaboration.

Solution: This action bridges GitHub Actions and incident.io, automatically
creating alerts enriched with workflow context, enabling teams to:

- 🎯 Centralize incident tracking and alert notifications across multiple systems
- 📢 Leverage incident.io's escalation and on-call features
- 📋 Maintain a single source of truth for incidents
- 🔗 Correlate CI/CD failures with other system alerts

### How Alert Deduplication Works

The action uses deduplication keys to group related alerts together. By default,
each workflow run gets a unique key based on the GitHub run ID, preventing
duplicate alerts for the same run.

Default behavior: Each workflow run creates a new alert

```text
Workflow Run #123 → Alert with key "123"
Workflow Run #124 → Alert with key "124"
```

Custom keys: Use the same key to update an existing alert

```text
Firing alert → deduplication-key: "db-migration-prod"
Resolved alert → deduplication-key: "db-migration-prod" (updates same alert)
```

### Alert Status Lifecycle

Alerts in incident.io follow a lifecycle:

1. Firing: An active issue that needs attention
1. Resolved: The issue has been fixed

This action supports both statuses, allowing you to:

- 🚨 Create alerts when problems are detected (`status: firing`)
- ✅ Automatically resolve them when fixed (`status: resolved`)

### GitHub Context Enrichment

The action automatically adds GitHub-specific metadata to every alert. This
provides immediate context about:

- 📊 What happened: Workflow name and job
- 📍 Where it happened: Repository, branch, commit
- 👤 Who triggered it: Actor who initiated the workflow
- ⏰ When it happened: Run number and attempt

This enrichment happens automatically and is merged with any custom metadata you
provide, ensuring you never lose important context.

### Design Decisions

> Why require alert-source-config-id?

Each alert source in incident.io has unique routing, escalation, and grouping
rules. Requiring this ID ensures alerts reach the correct team and follow the
appropriate response procedures.

> Why default to workflow run ID for deduplication?

Most use cases involve alerting on individual workflow failures. Using the run
ID as a default prevents alert noise while still allowing customization for
advanced scenarios.

> Why automatically include GitHub context?

Manual context gathering is error-prone and tedious. Automatic enrichment
ensures consistent, comprehensive information in every alert, improving response
times and debugging.

---

## Additional Information

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure
to:

1. Follow the existing code style
1. Add tests for new functionality
1. Update documentation as needed
1. Run `npm run all` before submitting

For development setup and guidelines, see the
[Copilot Instructions](.github/copilot-instructions.md).

### Project License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

### Legal Disclaimer

This is an unofficial, community-created GitHub Action and is not affiliated
with, endorsed by, or supported by Pineapple Technology Ltd. The incident.io
name, logo, and related trademarks are property of Pineapple Technology Ltd.

This action uses the publicly available incident.io API as documented at
[api-docs.incident.io](https://api-docs.incident.io). Users of this action are
responsible for complying with incident.io's Terms of Service and API usage
policies.

The maintainers of this action are not responsible for any issues, damages, or
service disruptions that may result from using this action. Use at your own
risk.

[create-http]: https://help.incident.io/articles/2353344082-custom-http-alert-sources
[run-id]: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#github-context
