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

## Operations

This node supports the following operations:

### Subscriber

| Operation            | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| **Create or Update** | Creates a new subscriber or updates an existing one by email |
| **Get**              | Finds a subscriber by email address                          |
| **Delete**           | Deletes a subscriber by email                                |

### Tag

| Operation  | Description                                               |
| ---------- | --------------------------------------------------------- |
| **Add**    | Adds a tag to a subscriber (creates subscriber if needed) |
| **Remove** | Removes a tag from a subscriber                           |

### Event

| Operation   | Description                              |
| ----------- | ---------------------------------------- |
| **Trigger** | Triggers a custom event for a subscriber |

## Credentials

To use this node, you need a Sequenzy API key:

1. Log in to your [Sequenzy account](https://app.sequenzy.com)
2. Go to **Settings > API Keys**
3. Create a new API key (it starts with `ek_`)
4. In n8n, create a new credential of type **Sequenzy API**
5. Paste your API key

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

## Compatibility

- n8n version: 1.0.0+
- Node.js version: 18.0.0+

## Resources

- [Sequenzy Documentation](https://docs.sequenzy.com)
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
