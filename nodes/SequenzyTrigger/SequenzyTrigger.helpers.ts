import { createHmac, timingSafeEqual } from "node:crypto";

export const SEQUENZY_TRIGGER_NAME = "Sequenzy n8n trigger";
export const DEFAULT_TRIGGER_EVENTS = ["subscriber.created"] as const;
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export const OUTBOUND_WEBHOOK_EVENT_OPTIONS = [
  { name: "Email Sent", value: "email.sent" },
  { name: "Email Delivered", value: "email.delivered" },
  { name: "Email Delivery Delayed", value: "email.delivery_delayed" },
  { name: "Email Bounced", value: "email.bounced" },
  { name: "Email Failed", value: "email.failed" },
  { name: "Email Complained", value: "email.complained" },
  { name: "Email Opened", value: "email.opened" },
  { name: "Email Clicked", value: "email.clicked" },
  { name: "Email Replied", value: "email.replied" },
  { name: "Email Unsubscribed", value: "email.unsubscribed" },
  { name: "SMS Sent", value: "sms.sent" },
  { name: "SMS Delivered", value: "sms.delivered" },
  { name: "SMS Failed", value: "sms.failed" },
  { name: "SMS Opted Out", value: "sms.opted_out" },
  { name: "Campaign Sent", value: "campaign.sent" },
  { name: "Invalid Subscriber", value: "subscriber.invalid" },
  { name: "New Subscriber", value: "subscriber.created" },
  { name: "Subscriber Updated", value: "subscriber.updated" },
  { name: "Subscriber Unsubscribed", value: "subscriber.unsubscribed" },
  { name: "Subscriber Added to List", value: "subscriber.list_subscribed" },
  {
    name: "Subscriber Removed From List",
    value: "subscriber.list_unsubscribed",
  },
  {
    name: "Subscriber Import Completed",
    value: "subscriber_import.completed",
  },
  { name: "Sequence Finished", value: "sequence.finished" },
  { name: "Sequence Failed", value: "sequence.failed" },
  { name: "Poll Answered", value: "poll.answered" },
] as const;

export type SequenzyOutboundWebhookEvent =
  (typeof OUTBOUND_WEBHOOK_EVENT_OPTIONS)[number]["value"];

export interface SequenzyTriggerStaticData {
  endpointId?: string | undefined;
  signingSecret?: string | undefined;
  webhookUrl?: string | undefined;
  events?: string[] | undefined;
}

export interface SequenzyWebhookEndpoint {
  id: string;
  name: string;
  url: string;
  status: "enabled" | "disabled";
  events: string[];
  signingSecret?: string | undefined;
  signingSecrets?:
    | Array<{
        id: string;
        prefix: string;
        createdAt: string;
      }>
    | undefined;
}

export interface SequenzyWebhookEnvelope {
  id: string;
  type: SequenzyOutboundWebhookEvent;
  object: "event";
  metric: string;
  created_at: string;
  data: Record<string, unknown>;
}

export function normalizeSelectedEvents(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_TRIGGER_EVENTS];
  }

  const supported = new Set<string>(
    OUTBOUND_WEBHOOK_EVENT_OPTIONS.map((option) => option.value)
  );
  const selected: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !supported.has(item)) {
      continue;
    }
    if (!selected.includes(item)) {
      selected.push(item);
    }
  }

  return selected.length > 0 ? selected : [...DEFAULT_TRIGGER_EVENTS];
}

export function eventsEqual(
  first: readonly string[],
  second: readonly string[]
) {
  if (first.length !== second.length) {
    return false;
  }

  const firstSorted = [...first].sort();
  const secondSorted = [...second].sort();
  return firstSorted.every((event, index) => event === secondSorted[index]);
}

export function hasActiveSigningSecret(
  endpoint: SequenzyWebhookEndpoint,
  signingSecret: string
): boolean {
  return (
    endpoint.signingSecrets?.some(({ prefix }) =>
      signingSecret.startsWith(prefix)
    ) ?? false
  );
}

export function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== normalizedName) {
      continue;
    }
    if (Array.isArray(value)) {
      return value.join(",");
    }
    return value;
  }

  return undefined;
}

export function getRawBodyText(request: unknown): string | undefined {
  if (typeof request !== "object" || request === null) {
    return undefined;
  }

  const rawBody = (request as { rawBody?: unknown }).rawBody;
  if (typeof rawBody === "string") {
    return rawBody;
  }
  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString("utf8");
  }

  const body = (request as { body?: unknown }).body;
  if (typeof body === "string") {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  return undefined;
}

export function verifySequenzyWebhookSignature(input: {
  signingSecret: string;
  timestampHeader?: string | undefined;
  signatureHeader?: string | undefined;
  rawBody: string;
  now?: Date | undefined;
}): boolean {
  const timestampHeader = input.timestampHeader ?? "";
  if (!/^\d+$/.test(timestampHeader)) {
    return false;
  }
  const timestamp = Number.parseInt(timestampHeader, 10);

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signatures =
    input.signatureHeader
      ?.split(",")
      .map((signature) => signature.trim())
      .filter((signature) => signature.startsWith("v1="))
      .map((signature) => signature.slice(3)) ?? [];
  if (signatures.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", input.signingSecret)
    .update(`v1:${timestamp}:${input.rawBody}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");
    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  });
}
