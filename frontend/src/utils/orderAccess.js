import { ADMIN_EMAIL } from './constants.js';

export function isAdminUser(user) {
  return !!user && user.email === ADMIN_EMAIL;
}

export function canViewOrder(order, user) {
  if (!order || !user) return false;
  if (isAdminUser(user)) return true;
  return order.buyerId === user.uid || order.sellerId === user.uid;
}