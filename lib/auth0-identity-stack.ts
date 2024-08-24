import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
export class Auth0IdentityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const auth0Provider = new iam.OpenIdConnectProvider(this, "Auth0Provider", {
      url: "https://DOMAIN_NAME", // Replace with your Auth0 domain
      clientIds: ["CLIENT_ID"],
    });

    // Define the Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: false,
      identityPoolName: "MyAuth0IdentityPool",
      openIdConnectProviderArns: [auth0Provider.openIdConnectProviderArn],
    });

    const authenticatedRole = new iam.Role(
      this,
      "CognitoKinesesAuthenticatedRole",
      {
        assumedBy: new iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFullAccess"),
        ],
      }
    );

    // Attach the authenticated role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          authenticated: authenticatedRole.roleArn,
        },
      }
    );

    new kinesis.CfnStream(this, "MyKinesisStream", {
      name: "Auth0Kinesis",
      shardCount: 1,
    });
    // Outputs
    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });
  }
}
