import { handleApiRequest } from "../src/api-handler.js";

export default async function handler(req, res) {
  return handleApiRequest(req, res);
}
