# n8n-nodes-sequenzy

This is an n8n community node for [Sequenzy](https://sequenzy.com) — an email platform for SaaS companies to send lifecycle emails, email campaigns, and transactional emails.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### npm Installation

```bash
npm install n8n-nodes-sequenzy
```

### Manual Installation

To install this node manually in a self-hosted n8n instance:

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-sequenzy` and confirm

## Nodes and Operations

This package includes a Sequenzy action node and a Sequenzy Trigger node. Most action-node operations can identify a
subscriber by email or by your own external ID.

### Trigger

| Trigger              | Description                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sequenzy Trigger** | Starts a workflow when selected Sequenzy outbound webhook events arrive. Defaults to **New Subscriber** (`subscriber.created`) and can also listen for events such as `campaign.sent`, `email.replied`, or `subscriber.unsubscribed`. |

### Subscriber

| Operation            | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| **Create or Update** | Creates a new subscriber or updates an existing one by email or external ID |
| **Get**              | Finds a subscriber by email or external ID                                  |
| **Delete**           | Deletes a subscriber by email or external ID                                |

### Tag

| Operation  | Description                                                                       |
| ---------- | --------------------------------------------------------------------------------- |
| **Add**    | Adds a tag to a subscriber by email or external ID (creates subscriber if needed) |
| **Remove** | Removes a tag from a subscriber by email or external ID                           |

### Event

| Operation   | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| **Trigger** | Triggers a custom event for a subscriber by email or external ID |

## Credentials

To use this node, you need a Sequenzy API key:

1. Log in to your [Sequenzy account](https://sequenzy.com)
2. Go to **Settings > API Keys**
3. Create a workspace API key (new keys start with `seq_live_`; legacy `ek_`
   keys remain supported)
4. In n8n, create a new credential of type **Sequenzy API**
5. Paste your API key

For **Sequenzy Trigger**, the API key must include account read plus webhook
read, write, and delete permissions (`account:read`, `webhooks:read`,
`webhooks:write`, and `webhooks:delete`). Account read lets n8n validate the
shared credential; the webhook permissions let the node create, reconcile, and
remove its managed Sequenzy outbound webhook endpoint.

## Usage Examples

### Create a Subscriber with Tags

1. Add a **Sequenzy** node
2. Select **Subscriber** as the resource
3. Select **Create or Update** as the operation
4. Enter the email address
5. In Additional Fields, add tags (comma-separated)

### Trigger an Event

1. Add a **Sequenzy** node
2. Select **Event** as the resource
3. Select **Trigger** as the operation
4. Enter the email and event name (e.g., `purchase`)
5. Add event properties in Additional Fields (e.g., `amount: 99.99`)

### Add Tag When Form Submitted

Connect a webhook or form trigger to the Sequenzy node:

```
[Webhook] → [Sequenzy: Add Tag]
```

### Receive Sequenzy Outbound Events in n8n

Use **Sequenzy Trigger** when Sequenzy should start an n8n workflow.

1. Add a **Sequenzy Trigger** node
2. Select your **Sequenzy API** credential
3. Choose one or more events; the default is **New Subscriber**
4. Activate the workflow

The trigger creates a normal Sequenzy outbound webhook endpoint using n8n's
production webhook URL, stores the one-time HMAC signing secret in workflow
static data, verifies `X-Sequenzy-Signature`, and outputs the full Sequenzy
event envelope (`id`, `type`, `created_at`, `metric`, and `data`).

Delivery is HMAC-signed and uses Sequenzy's durable 16-attempt, seven-day retry
pipeline. Per-message events such as `email.sent`, `email.opened`, and
`email.clicked` may create one n8n execution per campaign recipient.

### Manual Fallback: n8n Webhook Node

If you prefer n8n's generic Webhook node:

1. Create an n8n **Webhook** node
2. Copy the production webhook URL
3. Create a Sequenzy outbound webhook endpoint pointing to that URL
4. Subscribe to events like `email.replied`, `subscriber.unsubscribed`, or
   `campaign.sent`

See the Sequenzy outbound webhook docs for payloads, signatures, retries, and
delivery behavior.

## Limitations

- Sequenzy Trigger manages one outbound webhook endpoint per active workflow.
  Deactivating the workflow deletes that managed endpoint.
- Authentication uses a Sequenzy API key. OAuth is not supported.
- The node runs once per incoming n8n item. For high-volume imports, use
  Sequenzy bulk API endpoints or batch your workflow carefully.
- Custom attributes and event properties are entered as key-value pairs in the
  node UI. Use a Set or Code node before Sequenzy if you need to normalize
  complex source data.

## Compatibility

- n8n version: 1.0.0+
- Node.js version: 18.0.0+

## Resources

- [Sequenzy Documentation](https://docs.sequenzy.com)
- [Sequenzy n8n Integration Guide](https://docs.sequenzy.com/integrations/n8n)
- [Sequenzy API Reference](https://docs.sequenzy.com/api-reference)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/sequenzy/n8n-nodes-sequenzy.git
cd n8n-nodes-sequenzy

# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev
```

### Testing Locally

The node uses `https://api.sequenzy.com/api/v1` by default. To run it against
the local Sequenzy API instead, start n8n with `npm run dev`, open the
**Sequenzy API** credential and set **API Base URL** to
`http://127.0.0.1:4000/api/v1`. A blank value uses the production API.
Credentials created before version 1.1.2 have no API Base URL and use
production.

The trigger also needs a public HTTPS callback URL. For local testing, install
ngrok, add the authtoken from your ngrok account, and expose n8n's port:

```bash
brew install ngrok
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 5678
```

Keep ngrok running, copy its HTTPS forwarding URL, then restart n8n with its
public webhook URL:

```bash
N8N_WEBHOOK_URL=https://YOUR-NGROK-DOMAIN.ngrok.app/ \
N8N_PROXY_HOPS=1 \
npm run dev
```

To test through a separately installed n8n instance:

1. Build the node: `npm run build`
2. Link to your n8n installation:

   ```bash
   # In this directory
   npm link

   # In your n8n directory
   npm link n8n-nodes-sequenzy
   ```

3. Restart n8n

### Publishing

```bash
# Bump version
npm version patch

# Publish to npm
npm publish
```

## License

MIT
