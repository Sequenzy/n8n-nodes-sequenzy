import type {
  IDataObject,
  IHookFunctions,
  IHttpRequestMethods,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  JsonObject,
} from "n8n-workflow";
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";

import {
  eventsEqual,
  getHeaderValue,
  getRawBodyText,
  hasActiveSigningSecret,
  normalizeSelectedEvents,
  OUTBOUND_WEBHOOK_EVENT_OPTIONS,
  SEQUENZY_TRIGGER_NAME,
  verifySequenzyWebhookSignature,
  type SequenzyTriggerStaticData,
  type SequenzyWebhookEndpoint,
  type SequenzyWebhookEnvelope,
} from "./SequenzyTrigger.helpers";
import { getSequenzyApiBaseUrl } from "../shared/SequenzyApiBaseUrl";

interface SequenzyWebhookListResponse {
  success: boolean;
  webhooks: SequenzyWebhookEndpoint[];
}

interface SequenzyWebhookResponse {
  success: boolean;
  webhook: SequenzyWebhookEndpoint;
}

function getStaticData(context: IHookFunctions): SequenzyTriggerStaticData {
  return context.getWorkflowStaticData("node") as SequenzyTriggerStaticData;
}

function getSelectedEvents(context: IHookFunctions): string[] {
  return normalizeSelectedEvents(context.getNodeParameter("events", []));
}

function getOwnedWebhookName(context: IHookFunctions): string {
  const workflowId = context.getWorkflow().id ?? "unsaved";
  return `${SEQUENZY_TRIGGER_NAME} ${workflowId}:${context.getNode().id}`.slice(
    0,
    255
  );
}

function requireProductionWebhookUrl(context: IHookFunctions): string {
  const webhookUrl = context.getNodeWebhookUrl("default");
  if (!webhookUrl) {
    throw new NodeOperationError(
      context.getNode(),
      "Could not determine the production webhook URL"
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new NodeOperationError(
      context.getNode(),
      "The production webhook URL is invalid"
    );
  }

  if (parsed.protocol !== "https:") {
    throw new NodeOperationError(
      context.getNode(),
      "Sequenzy triggers require an HTTPS production webhook URL"
    );
  }

  return webhookUrl;
}

function clearStaticData(staticData: SequenzyTriggerStaticData): void {
  delete staticData.endpointId;
  delete staticData.signingSecret;
  delete staticData.webhookUrl;
  delete staticData.events;
}

async function requestWithAuthentication<TResponse>(
  context: IHookFunctions,
  method: IHttpRequestMethods,
  path: string,
  body?: IDataObject
): Promise<TResponse> {
  const credentials = await context.getCredentials("sequenzyApi");
  const options = {
    method,
    url: `${getSequenzyApiBaseUrl(credentials.baseUrl)}${path}`,
    json: true,
    ...(body ? { body } : {}),
  };

  return (await context.helpers.httpRequestWithAuthentication.call(
    context,
    "sequenzyApi",
    options
  )) as TResponse;
}

async function listWebhooks(
  context: IHookFunctions
): Promise<SequenzyWebhookEndpoint[]> {
  const response = await requestWithAuthentication<SequenzyWebhookListResponse>(
    context,
    "GET",
    "/webhooks"
  );

  return response.webhooks ?? [];
}

async function deleteWebhookIfPresent(
  context: IHookFunctions,
  endpointId: string
): Promise<void> {
  try {
    await requestWithAuthentication<SequenzyWebhookResponse>(
      context,
      "DELETE",
      `/webhooks/${encodeURIComponent(endpointId)}`
    );
  } catch (error) {
    const errorDetails =
      typeof error === "object" && error !== null
        ? (error as {
            httpCode?: unknown;
            statusCode?: unknown;
            response?: { status?: unknown; statusCode?: unknown } | undefined;
          })
        : undefined;
    const statusCode =
      errorDetails?.httpCode ??
      errorDetails?.statusCode ??
      errorDetails?.response?.status ??
      errorDetails?.response?.statusCode;
    if (Number(statusCode) !== 404) {
      throw new NodeApiError(context.getNode(), error as JsonObject);
    }
  }
}

async function createWebhook(
  context: IHookFunctions,
  webhookUrl: string,
  events: string[]
): Promise<SequenzyWebhookEndpoint> {
  const response = await requestWithAuthentication<SequenzyWebhookResponse>(
    context,
    "POST",
    "/webhooks",
    {
      name: getOwnedWebhookName(context),
      url: webhookUrl,
      events,
    }
  );

  return response.webhook;
}

async function updateWebhook(
  context: IHookFunctions,
  endpointId: string,
  webhookUrl: string,
  events: string[]
): Promise<SequenzyWebhookEndpoint> {
  const response = await requestWithAuthentication<SequenzyWebhookResponse>(
    context,
    "PATCH",
    `/webhooks/${encodeURIComponent(endpointId)}`,
    {
      name: getOwnedWebhookName(context),
      url: webhookUrl,
      events,
      status: "enabled",
    }
  );

  return response.webhook;
}

export class SequenzyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Sequenzy Trigger",
    name: "sequenzyTrigger",
    icon: "file:../Sequenzy/sequenzy.svg",
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["events"].join(", ")}}',
    description: "Starts a workflow when Sequenzy sends an outbound webhook",
    defaults: {
      name: "Sequenzy Trigger",
    },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "sequenzyApi",
        required: true,
      },
    ],
    webhooks: [
      {
        name: "default",
        httpMethod: "POST",
        responseMode: "onReceived",
        path: "sequenzy",
      },
    ],
    properties: [
      {
        displayName: "Events",
        name: "events",
        type: "multiOptions",
        required: true,
        default: ["subscriber.created"],
        description:
          "Sequenzy outbound events that should start this workflow. The node creates and manages one ordinary HMAC-signed Sequenzy webhook endpoint.",
        options: [...OUTBOUND_WEBHOOK_EVENT_OPTIONS],
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = requireProductionWebhookUrl(this);

        const staticData = getStaticData(this);
        const endpointId = staticData.endpointId;
        const signingSecret = staticData.signingSecret;
        if (!endpointId || !signingSecret) {
          if (endpointId) {
            await deleteWebhookIfPresent(this, endpointId);
          } else {
            const ownedName = getOwnedWebhookName(this);
            const webhooks = await listWebhooks(this);
            const orphanedEndpoints = webhooks.filter(
              (webhook) => webhook.name === ownedName
            );
            for (const endpoint of orphanedEndpoints) {
              await deleteWebhookIfPresent(this, endpoint.id);
            }
          }
          clearStaticData(staticData);
          return false;
        }

        const webhooks = await listWebhooks(this);
        const endpoint = webhooks.find((webhook) => webhook.id === endpointId);
        if (!endpoint) {
          clearStaticData(staticData);
          return false;
        }

        if (!hasActiveSigningSecret(endpoint, signingSecret)) {
          await deleteWebhookIfPresent(this, endpoint.id);
          clearStaticData(staticData);
          return false;
        }

        const events = getSelectedEvents(this);
        if (
          endpoint.name !== getOwnedWebhookName(this) ||
          endpoint.url !== webhookUrl ||
          endpoint.status !== "enabled" ||
          !eventsEqual(endpoint.events, events)
        ) {
          const updated = await updateWebhook(
            this,
            endpoint.id,
            webhookUrl,
            events
          );
          staticData.endpointId = updated.id;
          staticData.webhookUrl = updated.url;
          staticData.events = [...updated.events];
        }

        return true;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = requireProductionWebhookUrl(this);

        const staticData = getStaticData(this);
        if (staticData.endpointId && !staticData.signingSecret) {
          await deleteWebhookIfPresent(this, staticData.endpointId);
          clearStaticData(staticData);
        }

        const endpoint = await createWebhook(
          this,
          webhookUrl,
          getSelectedEvents(this)
        );
        if (!endpoint.signingSecret) {
          await deleteWebhookIfPresent(this, endpoint.id);
          throw new NodeOperationError(
            this.getNode(),
            "Sequenzy did not return a one-time webhook signing secret"
          );
        }

        staticData.endpointId = endpoint.id;
        staticData.signingSecret = endpoint.signingSecret;
        staticData.webhookUrl = endpoint.url;
        staticData.events = [...endpoint.events];

        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const staticData = getStaticData(this);
        if (staticData.endpointId) {
          await deleteWebhookIfPresent(this, staticData.endpointId);
        }
        clearStaticData(staticData);

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const staticData = this.getWorkflowStaticData(
      "node"
    ) as SequenzyTriggerStaticData;
    if (!staticData.signingSecret) {
      this.getResponseObject().status(401).json({
        ok: false,
        error:
          "Missing Sequenzy webhook signing secret; deactivate and reactivate this workflow",
      });
      return { noWebhookResponse: true };
    }

    const rawBody = getRawBodyText(this.getRequestObject());
    if (rawBody === undefined) {
      this.getResponseObject().status(400).json({
        ok: false,
        error: "Could not read the raw webhook body for signature verification",
      });
      return { noWebhookResponse: true };
    }

    const headers = this.getHeaderData();
    const validSignature = verifySequenzyWebhookSignature({
      signingSecret: staticData.signingSecret,
      timestampHeader: getHeaderValue(headers, "x-sequenzy-timestamp"),
      signatureHeader: getHeaderValue(headers, "x-sequenzy-signature"),
      rawBody,
    });
    if (!validSignature) {
      this.getResponseObject().status(401).json({
        ok: false,
        error: "Invalid Sequenzy webhook signature",
      });
      return { noWebhookResponse: true };
    }

    const body = this.getBodyData() as unknown as SequenzyWebhookEnvelope;
    const selectedEvents = normalizeSelectedEvents(
      this.getNodeParameter("events", [])
    );
    if (!selectedEvents.includes(body.type)) {
      return { webhookResponse: { ok: true, ignored: true } };
    }

    const workflowData: INodeExecutionData[][] = [
      [{ json: body as unknown as IDataObject }],
    ];

    return {
      workflowData,
      webhookResponse: { ok: true },
    };
  }
}
