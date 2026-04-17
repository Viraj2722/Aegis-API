export async function uploadLogFile(file, apiClient) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const raw = await file.text();
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of log records.");
  }

  const hasInvalidRecord = parsed.some(
    (row) => !row || typeof row !== "object" || Array.isArray(row),
  );
  if (hasInvalidRecord) {
    throw new Error("Each log entry must be an object.");
  }

  await apiClient.post("/upload", parsed);
  return { count: parsed.length };
}
