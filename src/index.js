import "dotenv/config";
import linear from "./linear.js";
import slack from "./slack.js";

async function main() {
  // Verify Linear connection
  const viewer = await linear.viewer;
  console.log(`Linear connected as: ${viewer.name}`);

  // Verify Slack connection
  const auth = await slack.auth.test();
  console.log(`Slack connected as: ${auth.user} in ${auth.team}`);
}

main().catch(console.error);
