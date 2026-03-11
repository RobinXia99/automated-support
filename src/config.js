import "dotenv/config";

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
export const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const NODE_ENV = process.env.NODE_ENV || "development";

// ---------------------------------------------------------------------------
// Linear constants
// ---------------------------------------------------------------------------
export const LINEAR_TEAM_ID = "ed718270-d482-4a1d-b339-e3f1b1786606";

export const LINEAR_STATES = {
  New: "e7a9d144-5d41-4fe5-a96b-28d05810d774",
  Triaged: "c634ffc1-f9b0-4e78-8442-d5b1f589500b",
  AwaitingResponse: "b3ffca59-ad5d-4dc1-93fc-3ca0cd275cb9",
  InHandling: "a81da4f3-f259-4aea-a569-a868997485a4",
  Escalated: "eded2803-3003-42b4-a8d0-6bcfb4158c46",
  Resolved: "86d3cd3a-dcd9-487a-b568-0dd3fd00c25b",
  Closed: "ebffbfd8-9d50-4108-b805-7cac9207ebf8",
  SpamInvalid: "eeca9ad2-3f70-49d8-8c11-9b755822f760",
};

export const LINEAR_LABELS = {
  Bug: "c313936f-fa39-48b9-841c-de743646fa61",
  Feature: "95ed94b6-c01b-42d6-8f20-46076f664df4",
  Question: "0450483f-2f58-422e-b658-5f7a9656594f",
  Urgent: "15a201f0-d0c0-4797-8751-bdbd0334af6e",
};
