import { ObjectId } from "mongodb";

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
export function eventId(value) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
    throw httpError(400, "Invalid event ID.");
  return new ObjectId(value);
}
export function validateEvent(body, now = new Date()) {
  const data = {};
  for (const [key, max] of Object.entries({
    title: 120,
    description: 5000,
    location: 200,
    image: 2048,
    type: 30,
  })) {
    if (
      typeof body?.[key] !== "string" ||
      !body[key].trim() ||
      body[key].trim().length > max
    )
      throw httpError(400, `Enter a valid ${key} (maximum ${max} characters).`);
    data[key] = body[key].trim();
  }
  if (
    !["Cleanup", "Plantation", "Donation", "Education", "Other"].includes(
      data.type,
    )
  )
    throw httpError(400, "Select a valid event type.");
  try {
    if (!["http:", "https:"].includes(new URL(data.image).protocol))
      throw new Error();
  } catch {
    throw httpError(400, "Enter a valid image URL.");
  }
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    throw httpError(400, "Choose a valid event date.");
  const date = new Date(`${body.date}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== body.date ||
    date <= now
  )
    throw httpError(400, "The event date must be in the future.");
  return { ...data, date };
}
