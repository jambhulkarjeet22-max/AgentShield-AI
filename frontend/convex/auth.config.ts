import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ||
        "https://evolving-mole-1548.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
