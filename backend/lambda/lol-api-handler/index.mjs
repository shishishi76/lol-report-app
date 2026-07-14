import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({});
const playersTableName = process.env.PLAYERS_TABLE_NAME || "lol-players";

export const handler = async (event, context) => {
  const routeKey = event.routeKey;

  try {
    if (routeKey === "GET /health") {
      return jsonResponse(200, {
        status: "ok",
        message: "lol-api is running",
      });
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
