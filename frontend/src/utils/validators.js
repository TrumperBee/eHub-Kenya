export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return /^(0|254|\+254)?(7|1)\d{8}$/.test(cleaned);
};

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (password) => password.length >= 8;

export const validatePrice = (price) => {
  const num = Number(price);
  return !isNaN(num) && num >= 100 && num <= 500000;
};
