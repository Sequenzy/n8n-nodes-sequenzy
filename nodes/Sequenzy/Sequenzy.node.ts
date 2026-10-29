import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  JsonObject,
} from "n8n-workflow";
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";

import { getSequenzyApiBaseUrl } from "../shared/SequenzyApiBaseUrl";

export class Sequenzy implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Sequenzy",
    name: "sequenzy",
    icon: "file:sequenzy.svg",
    group: ["transform"],
    usableAsTool: true,
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "Sequenzy is an email platform for SaaS companies to send lifecycle emails, email campaigns, and transactional emails",
    defaults: {
      name: "Sequenzy",
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "sequenzyApi",
        required: true,
      },
    ],
    properties: [
      // Resource
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Subscriber",
            value: "subscriber",
          },
          {
            name: "Tag",
            value: "tag",
          },
          {
            name: "Event",
            value: "event",
          },
        ],
        default: "subscriber",
      },

      // Operations for Subscriber
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["subscriber"],
          },
        },
        options: [
          {
            name: "Create or Update",
            value: "upsert",
            description:
              "Create a new record, or update the current one if it already exists (upsert)",
            action: "Create or update a subscriber",
          },
          {
            name: "Delete",
            value: "delete",
            description: "Delete a subscriber by email",
            action: "Delete a subscriber",
          },
          {
            name: "Get",
            value: "get",
            description: "Get a subscriber by email",
            action: "Get a subscriber",
          },
        ],
        default: "upsert",
      },

      // Operations for Tag
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["tag"],
          },
        },
        options: [
          {
            name: "Add",
            value: "add",
            description: "Add a tag to a subscriber",
            action: "Add a tag to a subscriber",
          },
          {
            name: "Remove",
            value: "remove",
            description: "Remove a tag from a subscriber",
            action: "Remove a tag from a subscriber",
          },
        ],
        default: "add",
      },

      // Operations for Event
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["event"],
          },
        },
        options: [
          {
            name: "Trigger",
            value: "trigger",
            description: "Trigger an event for a subscriber",
            action: "Trigger an event for a subscriber",
          },
        ],
        default: "trigger",
      },

      // Fields for Subscriber: Create or Update
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["upsert"],
          },
        },
        default: "",
        description:
          "The subscriber email address. Required when creating a new subscriber.",
      },
      {
        displayName: "Additional Fields",
        name: "additionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["upsert"],
          },
        },
        options: [
          {
            displayName: "Custom Attributes",
            name: "customAttributes",
            type: "fixedCollection",
            typeOptions: {
              multipleValues: true,
            },
            default: {},
            options: [
              {
                displayName: "Attribute",
                name: "attribute",
                values: [
                  {
                    displayName: "Key",
                    name: "key",
                    type: "string",
                    default: "",
                  },
                  {
                    displayName: "Value",
                    name: "value",
                    type: "string",
                    default: "",
                  },
                ],
              },
            ],
          },
          {
            displayName: "Enroll in Sequences",
            name: "enrollInSequences",
            type: "boolean",
            default: true,
            description:
              "Whether to enroll the subscriber in matching sequences",
          },
          {
            displayName: "External ID",
            name: "externalId",
            type: "string",
            default: "",
            description: "Your app/customer/user ID for this subscriber",
          },
          {
            displayName: "First Name",
            name: "firstName",
            type: "string",
            default: "",
          },
          {
            displayName: "Last Name",
            name: "lastName",
            type: "string",
            default: "",
          },
          {
            displayName: "Tags",
            name: "tags",
            type: "string",
            default: "",
            description: "Comma-separated list of tags to assign",
          },
        ],
      },

      // Fields for Subscriber: Get
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["get"],
          },
        },
        default: "",
        description:
          "The email address to search for. Provide email or external ID.",
      },
      {
        displayName: "External ID",
        name: "externalId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["get"],
          },
        },
        default: "",
        description: "Your app/customer/user ID for this subscriber",
      },

      // Fields for Subscriber: Delete
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["delete"],
          },
        },
        default: "",
        description:
          "The email address of the subscriber to delete. Provide email or external ID.",
      },
      {
        displayName: "External ID",
        name: "externalId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["subscriber"],
            operation: ["delete"],
          },
        },
        default: "",
        description: "Your app/customer/user ID for this subscriber",
      },

      // Fields for Tag: Add
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["add"],
          },
        },
        default: "",
        description:
          "The subscriber email address. Required when creating a new subscriber.",
      },
      {
        displayName: "External ID",
        name: "externalId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["add"],
          },
        },
        default: "",
        description: "Your app/customer/user ID for this subscriber",
      },
      {
        displayName: "Tag",
        name: "tag",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["add"],
          },
        },
        default: "",
        description: "The tag to add",
      },
      {
        displayName: "Additional Fields",
        name: "additionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["add"],
          },
        },
        options: [
          {
            displayName: "First Name",
            name: "firstName",
            type: "string",
            default: "",
            description: "First name (used if creating new subscriber)",
          },
          {
            displayName: "Last Name",
            name: "lastName",
            type: "string",
            default: "",
            description: "Last name (used if creating new subscriber)",
          },
        ],
      },

      // Fields for Tag: Remove
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["remove"],
          },
        },
        default: "",
        description:
          "The subscriber email address. Provide email or external ID.",
      },
      {
        displayName: "External ID",
        name: "externalId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["remove"],
          },
        },
        default: "",
        description: "Your app/customer/user ID for this subscriber",
      },
      {
        displayName: "Tag",
        name: "tag",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["tag"],
            operation: ["remove"],
          },
        },
        default: "",
        description: "The tag to remove",
      },

      // Fields for Event: Trigger
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@email.com",
        displayOptions: {
          show: {
            resource: ["event"],
            operation: ["trigger"],
          },
        },
        default: "",
        description:
          "The subscriber email address. Required when creating a new subscriber.",
      },
      {
        displayName: "External ID",
        name: "externalId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["event"],
            operation: ["trigger"],
          },
        },
        default: "",
        description: "Your app/customer/user ID for this subscriber",
      },
      {
        displayName: "Event Name",
        name: "eventName",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["event"],
            operation: ["trigger"],
          },
        },
        default: "",
        placeholder: "purchase",
        description: 'The event name (e.g., "purchase", "signup.completed")',
      },
      {
        displayName: "Additional Fields",
        name: "additionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["event"],
            operation: ["trigger"],
          },
        },
        options: [
          {
            displayName: "Event Properties",
            name: "properties",
            type: "fixedCollection",
            typeOptions: {
              multipleValues: true,
            },
            default: {},
            description: "Custom properties for this event",
            options: [
              {
                displayName: "Property",
                name: "property",
                values: [
                  {
                    displayName: "Key",
                    name: "key",
                    type: "string",
                    default: "",
                  },
                  {
                    displayName: "Value",
                    name: "value",
                    type: "string",
                    default: "",
                  },
                ],
              },
            ],
          },
          {
            displayName: "First Name",
            name: "firstName",
            type: "string",
            default: "",
          },
          {
            displayName: "Last Name",
            name: "lastName",
            type: "string",
            default: "",
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials("sequenzyApi");
    const apiBaseUrl = getSequenzyApiBaseUrl(credentials.baseUrl);
    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        if (resource === "subscriber") {
          if (operation === "upsert") {
            const email = this.getNodeParameter("email", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as {
              firstName?: string;
              lastName?: string;
              externalId?: string;
              tags?: string;
              customAttributes?: {
                attribute?: Array<{ key: string; value: string }>;
              };
              enrollInSequences?: boolean;
            };

            const body: Record<string, unknown> = {
              duplicateStrategy: "overwrite",
            };
            if (email) {
              body.email = email;
            }
            if (additionalFields.externalId) {
              body.externalId = additionalFields.externalId;
            }
            if (!body.email && !body.externalId) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            if (additionalFields.firstName) {
              body.firstName = additionalFields.firstName;
            }
            if (additionalFields.lastName) {
              body.lastName = additionalFields.lastName;
            }
            if (additionalFields.tags) {
              body.tags = additionalFields.tags.split(",").map((t) => t.trim());
            }
            if (additionalFields.customAttributes?.attribute) {
              const attrs: Record<string, string> = {};
              for (const attr of additionalFields.customAttributes.attribute) {
                attrs[attr.key] = attr.value;
              }
              body.customAttributes = attrs;
            }
            if (additionalFields.enrollInSequences !== undefined) {
              body.enrollInSequences = additionalFields.enrollInSequences;
            }

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                "sequenzyApi",
                {
                  method: "POST" as IHttpRequestMethods,
                  url: `${apiBaseUrl}/subscribers`,
                  body,
                  json: true,
                }
              );

            responseData = responseData.subscriber;
          } else if (operation === "get") {
            const email = this.getNodeParameter("email", i) as string;
            const externalId = this.getNodeParameter("externalId", i) as string;
            const path = email
              ? `/subscribers/${encodeURIComponent(email)}`
              : externalId
                ? `/subscribers/external?externalId=${encodeURIComponent(externalId)}`
                : null;

            if (!path) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            try {
              responseData =
                await this.helpers.httpRequestWithAuthentication.call(
                  this,
                  "sequenzyApi",
                  {
                    method: "GET" as IHttpRequestMethods,
                    url: `${apiBaseUrl}${path}`,
                    json: true,
                  }
                );
              responseData = responseData.subscriber;
            } catch (error) {
              if ((error as { httpCode?: number }).httpCode === 404) {
                responseData = null;
              } else {
                throw new NodeApiError(this.getNode(), error as JsonObject, {
                  itemIndex: i,
                });
              }
            }
          } else if (operation === "delete") {
            const email = this.getNodeParameter("email", i) as string;
            const externalId = this.getNodeParameter("externalId", i) as string;
            const path = email
              ? `/subscribers/${encodeURIComponent(email)}`
              : externalId
                ? `/subscribers/external?externalId=${encodeURIComponent(externalId)}`
                : null;

            if (!path) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            await this.helpers.httpRequestWithAuthentication.call(
              this,
              "sequenzyApi",
              {
                method: "DELETE" as IHttpRequestMethods,
                url: `${apiBaseUrl}${path}`,
                json: true,
              }
            );

            responseData = { deleted: true, email, externalId };
          }
        } else if (resource === "tag") {
          if (operation === "add") {
            const email = this.getNodeParameter("email", i) as string;
            const externalId = this.getNodeParameter("externalId", i) as string;
            const tag = this.getNodeParameter("tag", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as {
              firstName?: string;
              lastName?: string;
            };

            const body: Record<string, unknown> = { tag };
            if (email) {
              body.email = email;
            }
            if (externalId) {
              body.externalId = externalId;
            }
            if (!body.email && !body.externalId) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            if (additionalFields.firstName) {
              body.firstName = additionalFields.firstName;
            }
            if (additionalFields.lastName) {
              body.lastName = additionalFields.lastName;
            }

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                "sequenzyApi",
                {
                  method: "POST" as IHttpRequestMethods,
                  url: `${apiBaseUrl}/subscribers/tags`,
                  body,
                  json: true,
                }
              );
          } else if (operation === "remove") {
            const email = this.getNodeParameter("email", i) as string;
            const externalId = this.getNodeParameter("externalId", i) as string;
            const tag = this.getNodeParameter("tag", i) as string;
            const body: Record<string, unknown> = { tag };
            if (email) {
              body.email = email;
            }
            if (externalId) {
              body.externalId = externalId;
            }
            if (!body.email && !body.externalId) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                "sequenzyApi",
                {
                  method: "POST" as IHttpRequestMethods,
                  url: `${apiBaseUrl}/subscribers/tags/remove`,
                  body,
                  json: true,
                }
              );
          }
        } else if (resource === "event") {
          if (operation === "trigger") {
            const email = this.getNodeParameter("email", i) as string;
            const externalId = this.getNodeParameter("externalId", i) as string;
            const eventName = this.getNodeParameter("eventName", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as {
              properties?: { property?: Array<{ key: string; value: string }> };
              firstName?: string;
              lastName?: string;
            };

            const body: Record<string, unknown> = { event: eventName };
            if (email) {
              body.email = email;
            }
            if (externalId) {
              body.externalId = externalId;
            }
            if (!body.email && !body.externalId) {
              throw new NodeOperationError(
                this.getNode(),
                "Provide either Email or External ID",
                { itemIndex: i }
              );
            }

            if (additionalFields.properties?.property) {
              const props: Record<string, string> = {};
              for (const prop of additionalFields.properties.property) {
                props[prop.key] = prop.value;
              }
              body.properties = props;
            }
            if (additionalFields.firstName) {
              body.firstName = additionalFields.firstName;
            }
            if (additionalFields.lastName) {
              body.lastName = additionalFields.lastName;
            }

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                "sequenzyApi",
                {
                  method: "POST" as IHttpRequestMethods,
                  url: `${apiBaseUrl}/subscribers/events`,
                  body,
                  json: true,
                }
              );
          }
        }

        if (responseData !== undefined && responseData !== null) {
          returnData.push({ json: responseData, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), error as Record<string, string>);
      }
    }

    return [returnData];
  }
}
