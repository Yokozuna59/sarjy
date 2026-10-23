export const MAX_MESSAGE_LENGTH = 1000;

export interface TurnResponse {
  userText: string;
  reply: { text: string };
}
