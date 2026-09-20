const readJwtSecret = () => {
  const value = process.env.JWT_SECRET?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[JWT] JWT_SECRET is missing. Using temporary development fallback. Set JWT_SECRET in server/.env."
    );
    return "dev_jwt_secret_change_me";
  }

  throw new Error("JWT_SECRET is required. Set it in server/.env");
};

export const JWT_SECRET = readJwtSecret();
