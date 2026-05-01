import { LinearClient } from "@linear/sdk"

const apiKey = process.env.LINEAR_API_KEY

if (!apiKey) {
  console.error(
    "Missing LINEAR_API_KEY.\n" +
    "Create a .env file with:\n" +
    "  LINEAR_API_KEY=lin_api_xxxxx\n" +
    "Get a personal API key at https://linear.app/settings/account/security",
  )
  process.exit(1)
}

export const linear = new LinearClient({ apiKey })
