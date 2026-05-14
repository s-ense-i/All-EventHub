/**
 * Real API Services
 * 
 * These services make actual HTTP calls to the backend API.
 * They are used when backend is ready (toggle USE_MOCK_SERVICES = false).
 * 
 * Currently placeholder - will use real API when backend is available.
 */

import api from './api';

function shouldFallbackToAlternativeEndpoint(error) {
  const status = error?.response?.status;
  return !status || status === 404 || status === 405;
}

async function requestWithFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest();
  } catch (error) {
    if (!fallbackRequest || !shouldFallbackToAlternativeEndpoint(error)) {
      throw error;
    }

    return fallbackRequest();
  }
}

// ============================================
// REAL EVENT SERVICE
// ============================================
export const eventService = {
  getApprovedEvents: () =>
    api.get('/api/event/approved').then((res) => ({ data: res.data })),

  searchEvents: (filters) =>
    api
      .get('/api/event/search', { params: filters })
      .then((res) => ({ data: res.data })),

  getAllEvents: () =>
    api.get('/api/event').then((res) => ({ data: res.data })),

  getPendingEvents: () =>
    api.get('/api/event/pending').then((res) => ({ data: res.data })),

  getUpcomingEvents: (count = 5) =>
    api
      .get(`/api/event/upcoming?count=${count}`)
      .then((res) => ({ data: res.data })),

  getEventById: (id) =>
    api.get(`/api/event/${id}`).then((res) => ({ data: res.data })),

  getEventAnalytics: (eventId) =>
    api
      .get(`/api/event/${eventId}/analytics`)
      .then((res) => ({ data: res.data })),

  getEventsByOrganizer: (organizerId) =>
    api
      .get(`/api/event/organizer/${organizerId}`)
      .then((res) => ({ data: res.data })),

  getEventsByCategory: (categoryId) =>
    api
      .get(`/api/event/category/${categoryId}`)
      .then((res) => ({ data: res.data })),

  createEvent: (eventData) =>
    api
      .post('/api/event', eventData)
      .then((res) => ({ data: res.data, status: res.status })),

  updateEvent: (id, eventData) =>
    api
      .put(`/api/event/${id}`, eventData)
      .then((res) => ({ data: res.data, status: res.status })),

  deleteEvent: (id) =>
    api
      .delete(`/api/event/${id}`)
      .then((res) => ({ status: res.status })),

  approveEvent: (id) =>
    api
      .post(`/api/admin/events/${id}/approve`)
      .then((res) => ({ data: res.data, status: res.status })),

  rejectEvent: (id, reason) =>
    api
      .post(`/api/admin/events/${id}/reject`, { reason })
      .then((res) => ({ data: res.data, status: res.status })),
};

// ============================================
// REAL TICKET SERVICE
// ============================================
export const ticketService = {
  bookTicket: async (eventId, participantId, quantity = 1) => {
    if (quantity === 1) {
      try {
        const purchaseResponse = await api.post(`/api/ticket/purchase/${eventId}`);
        return { data: purchaseResponse.data, status: purchaseResponse.status };
      } catch (error) {
        if (!shouldFallbackToAlternativeEndpoint(error)) {
          throw error;
        }
      }
    }

    const bookingResponse = await api.post('/api/ticket/book', { eventId, participantId, quantity });
    return { data: bookingResponse.data, status: bookingResponse.status };
  },

  getParticipantTickets: (participantId) =>
    api
      .get(`/api/ticket/participant/${participantId}`)
      .then((res) => ({ data: res.data })),

  checkEventPurchase: (participantId, eventId) =>
    api
      .get(`/api/ticket/participant/${participantId}/has-purchased/${eventId}`)
      .then((res) => ({ data: res.data })),

  getEventTickets: (eventId) =>
    api
      .get(`/api/ticket/event/${eventId}`)
      .then((res) => ({ data: res.data })),

  getTicketById: (id) =>
    api.get(`/api/ticket/${id}`).then((res) => ({ data: res.data })),

  getTicketByQRCode: (qrCode) =>
    api
      .get(`/api/ticket/qrcode/${qrCode}`)
      .then((res) => ({ data: res.data })),

  getTicketLookupByQRCode: (qrCode) =>
    api
      .get(`/api/ticket/lookup/${qrCode}`)
      .then((res) => ({ data: res.data })),

  verifyTicketByQrCode: (qrCode) =>
    api
      .get(`/api/ticket/verify/${qrCode}`)
      .then((res) => ({ data: res.data })),
};

// ============================================
// REAL CATEGORY SERVICE
// ============================================
export const categoryService = {
  getCategories: () =>
    api.get('/api/category').then((res) => ({ data: res.data })),

  getCategoriesWithCounts: () =>
    api
      .get('/api/category/with-counts')
      .then((res) => ({ data: res.data })),

  getCategoryById: (id) =>
    api.get(`/api/category/${id}`).then((res) => ({ data: res.data })),

  getCategoryByName: (name) =>
    api
      .get(`/api/category/name/${name}`)
      .then((res) => ({ data: res.data })),

  createCategory: (data) =>
    api
      .post('/api/category', data)
      .then((res) => ({ data: res.data, status: res.status })),

  updateCategory: (id, data) =>
    api
      .put(`/api/category/${id}`, data)
      .then((res) => ({ data: res.data, status: res.status })),

  deleteCategory: (id) =>
    api
      .delete(`/api/category/${id}`)
      .then((res) => ({ status: res.status })),
};

// ============================================
// REAL FAVORITE SERVICE
// ============================================
export const favoriteService = {
  addFavorite: (favoriteDataOrEventId) => {
    const eventId = typeof favoriteDataOrEventId === 'object'
      ? favoriteDataOrEventId?.eventId
      : favoriteDataOrEventId;

    return api
      .post(`/api/favorite/event/${eventId}`)
      .then((res) => ({ data: res.data, status: res.status }));
  },

  getUserFavorites: (userId) =>
    api
      .get(`/api/favorite/user/${userId}`)
      .then((res) => ({ data: res.data })),

  removeFavorite: (favoriteId) =>
    api
      .delete(`/api/favorite/${favoriteId}`)
      .then((res) => ({ status: res.status })),
};

// ============================================
// REAL REVIEW SERVICE
// ============================================
export const reviewService = {
  submitReview: (reviewData) =>
    api
      .post('/api/review', reviewData)
      .then((res) => ({ data: res.data, status: res.status })),

  getEventReviews: (eventId) =>
    api
      .get(`/api/review/event/${eventId}`)
      .then((res) => ({ data: res.data })),

  getMyReviews: () =>
    api
      .get('/api/review/my-reviews')
      .then((res) => ({ data: res.data })),

  getOrganizerReviews: () =>
    api
      .get('/api/review/organizer')
      .then((res) => ({ data: res.data })),

  getAllReviews: () =>
    api
      .get('/api/review/all')
      .then((res) => ({ data: res.data })),

  deleteReview: (reviewId) =>
    api
      .delete(`/api/review/${reviewId}`)
      .then((res) => ({ status: res.status })),
};

// ============================================
// REAL USER SERVICE
// ============================================
export const userService = {
  getUserById: (id) =>
    api.get(`/api/user/${id}`).then((res) => ({ data: res.data })),

  getUserByEmail: (email) =>
    api
      .get(`/api/user/email/${email}`)
      .then((res) => ({ data: res.data })),

  emailExists: (email) =>
    api
      .get(`/api/user/email-exists/${email}`)
      .then((res) => ({ data: res.data })),

  updateUser: (id, userData) =>
    api
      .put(`/api/user/${id}`, userData)
      .then((res) => ({ data: res.data, status: res.status })),

  deleteUser: (id) =>
    api
      .delete(`/api/user/${id}`)
      .then((res) => ({ status: res.status })),

  resetPassword: (resetData) =>
    api
      .post('/api/auth/reset-password', resetData)
      .then((res) => ({ data: res.data, status: res.status })),

  logout: () =>
    api
      .post('/api/auth/logout')
      .then((res) => ({ data: res.data, status: res.status })),
};

// ============================================
// REAL AUTH SERVICE
// ============================================
export const authService = {
  register: (registerData) =>
    api
      .post('/api/auth/register', registerData)
      .then((res) => ({ data: res.data, status: res.status })),

  login: (email, password) =>
    api
      .post('/api/auth/login', { email, password })
      .then((res) => ({ data: res.data, status: res.status })),
};

// ============================================
// REAL ADMIN SERVICE
// ============================================
export const adminService = {
  getPendingAccounts: () =>
    api
      .get('/api/admin/pending-accounts')
      .then((res) => ({ data: res.data })),

  approveOrganizer: (organizerId) =>
    requestWithFallback(
      () => api.post(`/api/admin/accounts/${organizerId}/approve`).then((res) => ({ data: res.data, status: res.status })),
      () => api.post(`/api/admin/organizers/${organizerId}/approve`).then((res) => ({ data: res.data, status: res.status }))
    ),

  rejectOrganizer: (organizerId, reason = 'Rejected by admin') =>
    requestWithFallback(
      () => api.post(`/api/admin/accounts/${organizerId}/reject`, { reason }).then((res) => ({ data: res.data, status: res.status })),
      () => api.post(`/api/admin/organizers/${organizerId}/reject`, { reason }).then((res) => ({ data: res.data, status: res.status }))
    ),

  getPendingEvents: () =>
    api
      .get('/api/admin/pending-events')
      .then((res) => ({ data: res.data })),

  approveEvent: (eventId) =>
    api
      .post(`/api/admin/events/${eventId}/approve`)
      .then((res) => ({ data: res.data, status: res.status })),

  rejectEvent: (eventId) =>
    api
      .post(`/api/admin/events/${eventId}/reject`)
      .then((res) => ({ data: res.data, status: res.status })),
};
