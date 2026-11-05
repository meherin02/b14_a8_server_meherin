export function validateProfileFields(body, { required = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Enter valid profile details.";
  if (required || Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim())
      return "Enter your name.";
    if (body.name.trim().length > 100)
      return "Your name must be at most 100 characters.";
  }
  if (required || Object.hasOwn(body, "image")) {
    if (
      typeof body.image !== "string" ||
      !body.image.trim() ||
      body.image.trim().length > 2048
    )
      return "Enter a photo URL of at most 2048 characters.";
    try {
      const image = new URL(body.image.trim());
      if (
        !["http:", "https:"].includes(image.protocol) ||
        !image.hostname ||
        image.username ||
        image.password
      )
        return "Use a photo URL starting with http:// or https:// without embedded login details.";
    } catch {
      return "Enter a valid photo URL.";
    }
  }
  return null;
}

export function validateSignupPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 6 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password)
  )
    return "Use at least 6 characters with uppercase and lowercase letters.";
  if (password.length > 128)
    return "Your password must be at most 128 characters.";
  return null;
}
