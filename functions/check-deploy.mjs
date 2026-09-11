// Read-only inventory: never enables APIs or changes IAM.
import { applicationDefault } from "firebase-admin/app";
const project = "galeriadovital";
const { access_token } = await applicationDefault().getAccessToken();
const services = [
  "cloudfunctions.googleapis.com", "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com", "run.googleapis.com",
  "eventarc.googleapis.com", "pubsub.googleapis.com",
  "storage.googleapis.com", "logging.googleapis.com",
  "firebaseextensions.googleapis.com", "firestore.googleapis.com",
];
console.log("API INVENTORY (read-only)");
await Promise.all(services.map(async (service) => {
  try {
    const response = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${project}/services/${service}`,
      { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(20000) },
    );
    const body = await response.json();
    console.log(`API ${service}: ${response.ok ? body.state : `UNKNOWN (HTTP ${response.status})`}`);
  } catch {
    console.log(`API ${service}: UNKNOWN (network)`);
  }
}));
