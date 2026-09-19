import "dotenv/config";
import { PublicClientApplication } from "@azure/msal-node";

const clientId = process.env.AZURE_CLIENT_ID;
if (!clientId) {
  console.error("Set AZURE_CLIENT_ID in backend/.env first (the Application (client) ID from Entra app registration).");
  process.exit(1);
}

const pca = new PublicClientApplication({
  auth: { clientId, authority: "https://login.microsoftonline.com/consumers" },
});

const res = await pca.acquireTokenByDeviceCode({
  scopes: ["https://outlook.office.com/IMAP.AccessAsUser.All", "offline_access"],
  deviceCodeCallback: (r) => console.error(r.message),
});

if (!res?.accessToken) {
  console.error("No access token returned.");
  process.exit(1);
}
console.log(res.accessToken);
