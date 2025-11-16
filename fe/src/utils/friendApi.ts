import { apiRequest, apiClient } from "./apiClient";

export interface FriendRecord {
  _id: string;
  name: string;
  email: string;
  rank: string;
  level: number;
  rating: number;
  win?: number;
  loss?: number;
  exp?: number;
}

export interface FriendRequestRecord {
  _id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  createdAt: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  receiver: {
    _id: string;
    name: string;
    email: string;
  };
}

export const fetchFriends = async (token: string | null) => {
  const response = await apiClient.get<{ friends: FriendRecord[] }>("/friends", token);
  return response.friends;
};

export const fetchFriendRequests = async (
  token: string | null,
  box: "inbox" | "outbox" = "inbox"
) => {
  const response = await apiClient.get<{ requests: FriendRequestRecord[] }>(
    `/friends/requests?box=${box}`,
    token
  );
  return response.requests;
};

export const sendFriendRequest = async (
  token: string | null,
  payload: { receiverId?: string; receiverEmail?: string; message?: string }
) => {
  return apiClient.post("/friends/requests", payload, token);
};

export const respondFriendRequest = async (
  token: string | null,
  requestId: string,
  action: "accept" | "decline"
) => {
  return apiRequest(`/friends/requests/${requestId}`, "PATCH", { action }, { token });
};
