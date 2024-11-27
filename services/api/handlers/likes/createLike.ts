import { apiResponse } from "../../utils/response";
import { logger } from "../../utils/logger";
import { Like } from "../../../../schemas/like";
import { docClient } from "../../../../config/db";

import type { Handler } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const table: string = process.env.AWS_DYNAMODB_TABLE!;

export const handler: Handler = async (event, _context) => {
  const body = JSON.parse(event.body || {});

  const newItem = {
    PK: `LIKE#${body.recipeId}`,
    SK: `LIKE#${body.userName}`,
    ...body,
  };

  const params = {
    TransactItems: [
      {
        Update: {
          TableName: table,
          Key: { recipeId: body.recipeId },
          UpdateExpression: "SET likeCount = likeCount + :increment",
          ExpressionAttributeValues: { ":increment": 1 },
        },
      },
      {
        Put: {
          TableName: table,
          Item: newItem,
        },
      },
    ],
  };

  try {
    Like.parse(newItem);
    const command = new TransactWriteCommand(params);
    const data = await docClient.send(command);

    return apiResponse(201, "Success: Like created", data);
  } catch (error) {
    logger.error(error);
    return apiResponse(500, "Error: Cannot create like", error);
  }
};