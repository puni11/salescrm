// lib/validation.js

export const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PHONE_REGEX =
  /^(?:\+91)?[6-9]\d{9}$/;

export function sanitize(value) {
  if (value === undefined || value === null) return "";

  return String(value)
    .trim()
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "");
}

export function validateName(name) {
  if (!name) {
    return {
      valid: false,
      message: "Name is required.",
    };
  }

  if (name.length < 3) {
    return {
      valid: false,
      message: "Name must be at least 3 characters.",
    };
  }

  if (name.length > 80) {
    return {
      valid: false,
      message: "Name cannot exceed 80 characters.",
    };
  }

  if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
    return {
      valid: false,
      message: "Invalid name.",
    };
  }

  return {
    valid: true,
  };
}

export function validatePhone(phone) {
  if (!phone) {
    return {
      valid: false,
      message: "Phone number is required.",
    };
  }

  let cleaned = phone.replace(/\s+/g, "");

  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  }

  if (!PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      message: "Please enter a valid Indian mobile number.",
    };
  }

  return {
    valid: true,
    phone: cleaned,
  };
}

export function validateEmail(email) {
  if (!email) {
    return {
      valid: true,
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      message: "Invalid email address.",
    };
  }

  if (email.length > 120) {
    return {
      valid: false,
      message: "Email is too long.",
    };
  }

  return {
    valid: true,
  };
}

export function validateMessage(message) {
  if (!message) {
    return {
      valid: true,
    };
  }

  if (message.length > 1000) {
    return {
      valid: false,
      message: "Message cannot exceed 1000 characters.",
    };
  }

  return {
    valid: true,
  };
}

export function validateEnquiryType(type) {
  if (!type) {
    return {
      valid: true,
    };
  }

  const allowed = [
    "myself",
    "company",
    "myself1",
    "company1",
  ];

  if (!allowed.includes(type)) {
    return {
      valid: false,
      message: "Invalid enquiry type.",
    };
  }

  return {
    valid: true,
    value: type,
  };
}