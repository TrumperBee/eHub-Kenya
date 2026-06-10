import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';

export const sendMessageToAI = async (messages) => {
  const res = await axios.post(`${BACKEND_URL}/api/ai/chat`, { messages });
  return res.data.reply;
};
