import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc,
  query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, increment
} from 'firebase/firestore';
import { db } from './firebase';

export const subscribeToComments = (listingId, callback) => {
  const ref = collection(db, 'listings', listingId, 'comments');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const postComment = async (listingId, { authorId, authorDisplayName, authorUsername,
  authorPhotoURL, content, mentions, parentId }) => {
  const ref = collection(db, 'listings', listingId, 'comments');
  return addDoc(ref, {
    listingId, authorId, authorDisplayName, authorUsername,
    authorPhotoURL: authorPhotoURL || null,
    content, mentions: mentions || [],
    parentId: parentId || null,
    likes: 0, likedBy: [], edited: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
};

export const toggleLike = async (listingId, commentId, userId, currentlyLiked) => {
  const ref = doc(db, 'listings', listingId, 'comments', commentId);
  if (currentlyLiked) {
    await updateDoc(ref, { likedBy: arrayRemove(userId), likes: increment(-1) });
  } else {
    await updateDoc(ref, { likedBy: arrayUnion(userId), likes: increment(1) });
  }
};

export const deleteComment = async (listingId, commentId) => {
  await deleteDoc(doc(db, 'listings', listingId, 'comments', commentId));
};

export const editComment = async (listingId, commentId, newContent, newMentions) => {
  await updateDoc(doc(db, 'listings', listingId, 'comments', commentId), {
    content: newContent, mentions: newMentions, edited: true, updatedAt: serverTimestamp()
  });
};

export const parseMentions = (text, knownUsers) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    const user = knownUsers.find(u => u.username === username);
    if (user) mentions.push(user.uid);
  }
  return mentions;
};