import { useState, useEffect } from 'react';
import { getBuyerOrders, getSellerOrders, subscribeToOrder } from '../services/ordersService';

export function useBuyerOrders(buyerId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buyerId) return;
    setLoading(true);
    getBuyerOrders(buyerId)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [buyerId]);

  return { orders, loading };
}

export function useSellerOrders(sellerId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    getSellerOrders(sellerId)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [sellerId]);

  return { orders, loading };
}

export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setOrder(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = subscribeToOrder(
      id,
      (data) => {
        setOrder(data);
        setLoading(false);
      },
      (err) => {
        console.error('Order subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [id]);

  return { order, loading, error };
}
