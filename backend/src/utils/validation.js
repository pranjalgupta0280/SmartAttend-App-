export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
    if (typeof email !== "string") return false;
    return EMAIL_REGEX.test(email.trim());
};
