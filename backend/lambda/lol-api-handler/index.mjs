import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";

const dynamoDb = new DynamoDBClient({});
const playersTableName = process.env.PLAYERS_TABLE_NAME || "lol-players";
const usersTableName = process.env.USERS_TABLE_NAME || "rifttrust-users";

export const handler = async (event, context) => {
  const routeKey = event.routeKey;

  try {
    if (routeKey === "GET /health") {
      return jsonResponse(200, {
        status: "ok",
        message: "lol-api is running",
      });
    }

    if (routeKey === "GET /account-links/me") {
      const userSub = getAuthenticatedUserSub(event);

      if (!userSub) {
        return jsonResponse(401, {
          code: "UNAUTHORIZED",
          message: "認証情報を確認できませんでした。もう一度ログインしてください。",
        });
      }

      const accountLink = await getAccountLink(userSub);

      if (!accountLink) {
        return jsonResponse(200, {
          status: "UNLINKED",
        });
      }

      return jsonResponse(200, accountLink);
    }

    if (routeKey === "POST /account-links/start") {
      const userSub = getAuthenticatedUserSub(event);

      if (!userSub) {
        return jsonResponse(401, {
          code: "UNAUTHORIZED",
          message: "認証情報を確認できませんでした。もう一度ログインしてください。",
        });
      }

      const body = parseJsonBody(event);
      const gameName = typeof body.gameName === "string" ? body.gameName.trim() : "";
      const tagLine = typeof body.tagLine === "string" ? body.tagLine.trim() : "";

      if (!gameName || !tagLine) {
        return jsonResponse(400, {
          code: "INVALID_RIOT_ID",
          message: "ゲーム名とタグラインを入力してください。",
        });
      }

      const apiKey = getRiotApiKey();
      const account = await fetchRiotAccount(gameName, tagLine, apiKey);
      const summoner = await fetchLolSummoner(account.puuid, apiKey);
      const challenge = await startAccountLinkChallenge({
        userSub,
        account,
        initialProfileIconId: summoner.profileIconId,
      });

      return jsonResponse(200, challenge);
    }

    if (routeKey === "POST /account-links/verify") {
      const userSub = getAuthenticatedUserSub(event);

      if (!userSub) {
        return jsonResponse(401, {
          code: "UNAUTHORIZED",
          message: "認証情報を確認できませんでした。もう一度ログインしてください。",
        });
      }

      const body = parseJsonBody(event);
      const challengeId =
        typeof body.challengeId === "string" ? body.challengeId.trim() : "";

      if (!challengeId) {
        return jsonResponse(400, {
          code: "CHALLENGE_ID_REQUIRED",
          message: "本人確認チャレンジのIDが必要です。",
        });
      }

      const result = await verifyAccountLinkChallenge({
        userSub,
        challengeId,
        apiKey: getRiotApiKey(),
      });

      return jsonResponse(result.status === "PENDING" ? 202 : 200, result);
    }

    if (routeKey === "GET /players/{gameName}/{tagLine}") {
      const { gameName, tagLine } = event.pathParameters || {};

      if (!gameName || !tagLine) {
        return jsonResponse(400, {
          code: "INVALID_PLAYER_ID",
          message: "gameName and tagLine are required",
        });
      }

      const apiKey = process.env.RIOT_API_KEY;

      if (!apiKey) {
        console.error("Riot API key is not configured", {
          routeKey,
          requestId: context.awsRequestId,
        });

        return jsonResponse(500, {
          code: "RIOT_API_KEY_NOT_CONFIGURED",
          message: "Riot APIの設定が完了していません。",
        });
      }

      const url =
        "https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" +
        `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

      const response = await fetch(url, {
        headers: {
          "X-Riot-Token": apiKey,
        },
      });

      const data = await readJson(response);

      if (!response.ok) {
        console.error("Riot API request failed", {
          routeKey,
          requestId: context.awsRequestId,
          riotStatus: response.status,
        });

        if (response.status === 401 || response.status === 403) {
          return jsonResponse(502, {
            code: "RIOT_API_KEY_INVALID",
            message: "Riot Development API Keyが無効、または有効期限切れです。",
          });
        }

        if (response.status === 404) {
          return jsonResponse(404, {
            code: "PLAYER_NOT_FOUND",
            message: "指定されたプレイヤーが見つかりません。",
          });
        }

        if (response.status === 429) {
          return jsonResponse(429, {
            code: "RIOT_RATE_LIMIT_EXCEEDED",
            message: "Riot APIの利用上限に達しました。しばらく待ってからお試しください。",
          });
        }

        return jsonResponse(502, {
          code: "RIOT_API_ERROR",
          message: "Riot APIからプレイヤー情報を取得できませんでした。",
        });
      }

      if (!isRiotAccount(data)) {
        console.error("Riot API returned an unexpected response", {
          routeKey,
          requestId: context.awsRequestId,
        });

        return jsonResponse(502, {
          code: "INVALID_RIOT_RESPONSE",
          message: "Riot APIから不正なレスポンスを受信しました。",
        });
      }

      const player = await savePlayer(data);

      return jsonResponse(200, player);
    }

    return jsonResponse(404, {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      routeKey,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.statusCode, {
        code: error.code,
        message: error.message,
      });
    }

    console.error("Unhandled Lambda error", {
      routeKey,
      requestId: context.awsRequestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonResponse(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
};

class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function startAccountLinkChallenge({
  userSub,
  account,
  initialProfileIconId,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  const challengeId = randomUUID();

  try {
    await dynamoDb.send(
      new UpdateItemCommand({
        TableName: usersTableName,
        Key: {
          pk: { S: `USER#${userSub}` },
        },
        UpdateExpression: [
          "SET entityType = :entityType",
          "userSub = :userSub",
          "pendingPuuid = :pendingPuuid",
          "gameName = :gameName",
          "tagLine = :tagLine",
          "initialProfileIconId = :initialProfileIconId",
          "riotAccountStatus = :pendingStatus",
          "challengeId = :challengeId",
          "challengeExpiresAt = :challengeExpiresAt",
          "createdAt = if_not_exists(createdAt, :createdAt)",
          "updatedAt = :updatedAt",
        ].join(", "),
        ConditionExpression:
          "attribute_not_exists(riotAccountStatus) OR riotAccountStatus <> :verifiedStatus",
        ExpressionAttributeValues: {
          ":entityType": { S: "USER" },
          ":userSub": { S: userSub },
          ":pendingPuuid": { S: account.puuid },
          ":gameName": { S: account.gameName },
          ":tagLine": { S: account.tagLine },
          ":initialProfileIconId": { N: String(initialProfileIconId) },
          ":pendingStatus": { S: "PENDING" },
          ":challengeId": { S: challengeId },
          ":challengeExpiresAt": {
            N: String(Math.floor(expiresAt.getTime() / 1000)),
          },
          ":createdAt": { S: now.toISOString() },
          ":updatedAt": { S: now.toISOString() },
          ":verifiedStatus": { S: "VERIFIED" },
        },
      }),
    );
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      throw new HttpError(
        409,
        "ACCOUNT_ALREADY_LINKED",
        "このRiftTrustアカウントには、すでにLoLアカウントが連携されています。",
      );
    }

    throw error;
  }

  return {
    status: "PENDING",
    challengeId,
    gameName: account.gameName,
    tagLine: account.tagLine,
    initialProfileIconId,
    expiresAt: expiresAt.toISOString(),
    instruction:
      "5分以内にLoLクライアントでプロフィールアイコンを別のアイコンへ変更してください。",
  };
}

async function verifyAccountLinkChallenge({ userSub, challengeId, apiKey }) {
  const userItem = await getUserItem(userSub);

  if (
    !userItem ||
    userItem.riotAccountStatus?.S !== "PENDING" ||
    userItem.challengeId?.S !== challengeId
  ) {
    throw new HttpError(
      404,
      "CHALLENGE_NOT_FOUND",
      "有効な本人確認チャレンジが見つかりません。最初からやり直してください。",
    );
  }

  const now = new Date();
  const nowEpochSeconds = Math.floor(now.getTime() / 1000);
  const expiresAt = Number(userItem.challengeExpiresAt?.N);

  if (!Number.isFinite(expiresAt) || expiresAt < nowEpochSeconds) {
    throw new HttpError(
      410,
      "CHALLENGE_EXPIRED",
      "本人確認の有効期限が切れました。最初からやり直してください。",
    );
  }

  const puuid = userItem.pendingPuuid?.S;
  const gameName = userItem.gameName?.S;
  const tagLine = userItem.tagLine?.S;
  const initialProfileIconId = Number(userItem.initialProfileIconId?.N);

  if (!puuid || !gameName || !tagLine || !Number.isInteger(initialProfileIconId)) {
    throw new HttpError(
      500,
      "INVALID_CHALLENGE_DATA",
      "本人確認データが不完全です。最初からやり直してください。",
    );
  }

  const summoner = await fetchLolSummoner(puuid, apiKey);

  if (summoner.profileIconId === initialProfileIconId) {
    return {
      status: "PENDING",
      retryAfterSeconds: 10,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      message:
        "変更の反映には最大2分ほどかかる場合があります。少々お待ちください。",
    };
  }

  const verifiedAt = now.toISOString();

  try {
    await dynamoDb.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          {
            Update: {
              TableName: usersTableName,
              Key: {
                pk: { S: `USER#${userSub}` },
              },
              UpdateExpression:
                "SET puuid = :puuid, riotAccountStatus = :verifiedStatus, " +
                "verificationType = :verificationType, verifiedAt = :verifiedAt, " +
                "updatedAt = :updatedAt " +
                "REMOVE pendingPuuid, initialProfileIconId, challengeId, challengeExpiresAt",
              ConditionExpression:
                "riotAccountStatus = :pendingStatus AND challengeId = :challengeId AND challengeExpiresAt >= :now",
              ExpressionAttributeValues: {
                ":puuid": { S: puuid },
                ":verifiedStatus": { S: "VERIFIED" },
                ":verificationType": { S: "PROFILE_ICON" },
                ":verifiedAt": { S: verifiedAt },
                ":updatedAt": { S: verifiedAt },
                ":pendingStatus": { S: "PENDING" },
                ":challengeId": { S: challengeId },
                ":now": { N: String(nowEpochSeconds) },
              },
            },
          },
          {
            Put: {
              TableName: usersTableName,
              Item: {
                pk: { S: `RIOT#${puuid}` },
                entityType: { S: "RIOT_LINK" },
                userSub: { S: userSub },
                puuid: { S: puuid },
                gameName: { S: gameName },
                tagLine: { S: tagLine },
                verificationType: { S: "PROFILE_ICON" },
                verifiedAt: { S: verifiedAt },
                createdAt: { S: verifiedAt },
              },
              ConditionExpression:
                "attribute_not_exists(pk) OR userSub = :userSub",
              ExpressionAttributeValues: {
                ":userSub": { S: userSub },
              },
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (error?.name === "TransactionCanceledException") {
      throw new HttpError(
        409,
        "RIOT_ACCOUNT_ALREADY_LINKED",
        "このLoLアカウントは、すでに別のRiftTrustアカウントへ連携されています。",
      );
    }

    throw error;
  }

  return {
    status: "VERIFIED",
    gameName,
    tagLine,
    verifiedAt,
  };
}

async function fetchRiotAccount(gameName, tagLine, apiKey) {
  const url =
    "https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/" +
    `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const data = await fetchRiotJson(url, apiKey);

  if (!isRiotAccount(data)) {
    throw new HttpError(
      502,
      "INVALID_RIOT_RESPONSE",
      "Riot APIから不正なレスポンスを受信しました。",
    );
  }

  return data;
}

async function fetchLolSummoner(puuid, apiKey) {
  const url =
    "https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/" +
    encodeURIComponent(puuid);
  const data = await fetchRiotJson(url, apiKey);

  if (!data || typeof data !== "object" || !Number.isInteger(data.profileIconId)) {
    throw new HttpError(
      502,
      "INVALID_RIOT_RESPONSE",
      "Riot APIからプロフィール情報を取得できませんでした。",
    );
  }

  return data;
}

async function fetchRiotJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": apiKey,
    },
  });
  const data = await readJson(response);

  if (response.ok) {
    return data;
  }

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(
      502,
      "RIOT_API_KEY_INVALID",
      "Riot Development API Keyが無効、または有効期限切れです。",
    );
  }

  if (response.status === 404) {
    throw new HttpError(
      404,
      "PLAYER_NOT_FOUND",
      "指定されたプレイヤーが見つかりません。",
    );
  }

  if (response.status === 429) {
    throw new HttpError(
      429,
      "RIOT_RATE_LIMIT_EXCEEDED",
      "Riot APIの利用上限に達しました。しばらく待ってからお試しください。",
    );
  }

  throw new HttpError(
    502,
    "RIOT_API_ERROR",
    "Riot APIからプレイヤー情報を取得できませんでした。",
  );
}

function getRiotApiKey() {
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    throw new HttpError(
      500,
      "RIOT_API_KEY_NOT_CONFIGURED",
      "Riot APIの設定が完了していません。",
    );
  }

  return apiKey;
}

function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    return JSON.parse(body);
  } catch {
    throw new HttpError(
      400,
      "INVALID_JSON",
      "リクエスト本文のJSON形式が正しくありません。",
    );
  }
}

async function getAccountLink(userSub) {
  const item = await getUserItem(userSub);

  if (!item) {
    return null;
  }

  return {
    status: item.riotAccountStatus?.S || "UNLINKED",
    challengeId: item.challengeId?.S,
    gameName: item.gameName?.S,
    tagLine: item.tagLine?.S,
    expiresAt: item.challengeExpiresAt?.N
      ? new Date(Number(item.challengeExpiresAt.N) * 1000).toISOString()
      : undefined,
    verifiedAt: item.verifiedAt?.S,
  };
}

async function getUserItem(userSub) {
  const result = await dynamoDb.send(
    new GetItemCommand({
      TableName: usersTableName,
      Key: {
        pk: { S: `USER#${userSub}` },
      },
      ConsistentRead: true,
    }),
  );

  return result.Item || null;
}

function getAuthenticatedUserSub(event) {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}

async function savePlayer(account) {
  const now = new Date().toISOString();

  const result = await dynamoDb.send(
    new UpdateItemCommand({
      TableName: playersTableName,
      Key: {
        puuid: { S: account.puuid },
      },
      UpdateExpression: [
        "SET gameName = :gameName",
        "tagLine = :tagLine",
        "trustScore = if_not_exists(trustScore, :initialTrustScore)",
        "createdAt = if_not_exists(createdAt, :createdAt)",
        "updatedAt = :updatedAt",
      ].join(", "),
      ExpressionAttributeValues: {
        ":gameName": { S: account.gameName },
        ":tagLine": { S: account.tagLine },
        ":initialTrustScore": { N: "100" },
        ":createdAt": { S: now },
        ":updatedAt": { S: now },
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return {
    puuid: result.Attributes.puuid.S,
    gameName: result.Attributes.gameName.S,
    tagLine: result.Attributes.tagLine.S,
    trustScore: Number(result.Attributes.trustScore.N),
    createdAt: result.Attributes.createdAt.S,
    updatedAt: result.Attributes.updatedAt.S,
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRiotAccount(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.puuid === "string" &&
      typeof value.gameName === "string" &&
      typeof value.tagLine === "string",
  );
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
