import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  ApiKeySourceType,
  RestApi,
  LambdaIntegration,
} from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";

import type { envType } from "../../schemas/env";

interface AppStackProps extends StackProps {
  config: Readonly<envType>;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Env Config Props
    const { config } = props;

    // -------------------------------------- //
    // --- --- --- DynamoDB Table --- --- --- //
    // -------------------------------------- //

    // Single Table for App
    const appTable = new TableV2(this, "MyRecipesTable", {
      tableName: config.AWS_DYNAMODB_TABLE,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "GSI1_SK",
          partitionKey: { name: "SK", type: AttributeType.STRING },
        },
        {
          indexName: "GSI2_TYPE",
          partitionKey: { name: "recordType", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
      ],
    });

    // -------------------------------- //
    // --- --- --- Rest API --- --- --- //
    // -------------------------------- //

    // Node.js Handler Functions Config
    const nodeFunctionConfig = {
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      environment: {
        AWS_DYNAMODB_TABLE: appTable.tableName,
        REGION: this.region,
      },
      memorySize: 1024,
    };

    // Create Recipe Handler
    const createRecipe = new NodejsFunction(this, "MyRecipeAppCreateRecipe", {
      functionName: "MyRecipeAppCreateRecipe",
      entry: "services/api/handlers/recipes/createRecipe.ts",
      description: "Create Recipe Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Delete Recipe Handler
    const deleteRecipe = new NodejsFunction(this, "MyRecipeAppDeleteRecipe", {
      functionName: "MyRecipeAppDeleteRecipe",
      entry: "services/api/handlers/recipes/deleteRecipe.ts",
      description: "Delete Recipe Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Get Recipe Handler
    const getRecipe = new NodejsFunction(this, "MyRecipeAppGetRecipe", {
      functionName: "MyRecipeAppGetRecipe",
      entry: "services/api/handlers/recipes/getRecipe.ts",
      description: "Get Recipe Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Update Recipe Handler
    const updateRecipe = new NodejsFunction(this, "MyRecipeAppUpdateRecipe", {
      functionName: "MyRecipeAppUpdateRecipe",
      entry: "services/api/handlers/recipes/updateRecipe.ts",
      description: "Update Recipe Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Update Recipe Handler
    const getAllRecipes = new NodejsFunction(this, "MyRecipeAppGetAllRecipes", {
      functionName: "MyRecipeAppGetAllRecipes",
      entry: "services/api/handlers/recipes/getAllRecipes.ts",
      description: "Get All Recipes Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Get User Handler
    const getUser = new NodejsFunction(this, "MyRecipeAppGetUser", {
      functionName: "MyRecipeAppGetUser",
      entry: "services/api/handlers/users/getUser.ts",
      description: "Get User Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Create User Handler
    const createUser = new NodejsFunction(this, "MyRecipeAppCreateUser", {
      functionName: "MyRecipeAppCreateUser",
      entry: "services/api/handlers/users/createUser.ts",
      description: "Create New User Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Create User Handler
    const deleteUser = new NodejsFunction(this, "MyRecipeAppDeleteUser", {
      functionName: "MyRecipeAppDeleteUser",
      entry: "services/api/handlers/users/deleteUser.ts",
      description: "Delete User Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Create User Handler
    const updateUser = new NodejsFunction(this, "MyRecipeAppUpdateUser", {
      functionName: "MyRecipeAppUpdateUser",
      entry: "services/api/handlers/users/updateUser.ts",
      description: "Update User Lambda Handler",
      ...nodeFunctionConfig,
    });

    // Rest API With Lambda Integration
    const api = new RestApi(this, "MyPortfolioAppRestApi", {
      restApiName: "MyRecipesAppApi",
      apiKeySourceType: ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
        ],
        allowCredentials: true,
      },
    });

    // Add DynamoDB Read/Write permissions to handlers
    appTable.grantReadWriteData(createRecipe);
    appTable.grantReadWriteData(deleteRecipe);
    appTable.grantReadWriteData(getRecipe);
    appTable.grantReadWriteData(updateRecipe);
    appTable.grantReadWriteData(getAllRecipes);

    // Integrate Lambdas with API
    const createRecipeIntegration = new LambdaIntegration(createRecipe);
    const deleteRecipeIntegration = new LambdaIntegration(deleteRecipe);
    const getRecipeIntegration = new LambdaIntegration(getRecipe);
    const updateRecipeIntegration = new LambdaIntegration(updateRecipe);
    const getAllRecipesIntegration = new LambdaIntegration(getAllRecipes);

    const createUserIntegration = new LambdaIntegration(createUser);
    const getUserIntegration = new LambdaIntegration(getUser);
    const updateUserIntegration = new LambdaIntegration(updateUser);
    const deleteUserIntegration = new LambdaIntegration(deleteUser);

    // Add resources and methods
    const apiVersion = "v1";
    const apiBase = api.root.addResource(apiVersion);

    // /recipes
    const recipesBase = apiBase.addResource("recipes");
    const recipesWithUsername = recipesBase.addResource("{username}");
    const recipeWithID = recipesWithUsername.addResource("{id}");

    // /recipes/{username}
    recipesWithUsername.addMethod("POST", createRecipeIntegration);
    recipesWithUsername.addMethod("GET", getAllRecipesIntegration);

    // /recipes/{username}/{id}
    recipeWithID.addMethod("GET", getRecipeIntegration);
    recipeWithID.addMethod("PATCH", updateRecipeIntegration);
    recipeWithID.addMethod("DELETE", deleteRecipeIntegration);

    // Users
    const usersBase = apiBase.addResource("users");
    const usersWithUsername = usersBase.addResource("{username}");

    // /users
    usersWithUsername.addMethod("POST", createUserIntegration);

    // /users/{username}
    usersWithUsername.addMethod("GET", getUserIntegration);
    usersWithUsername.addMethod("PATCH", updateUserIntegration);
    usersWithUsername.addMethod("DELETE", deleteUserIntegration);

    // resource.addMethod("POST", sendEmailIntegration, {
    //   apiKeyRequired: true,
    //   requestParameters: {
    //     "method.request.header.x-api-key": true,
    //   },
    // });
  }
}