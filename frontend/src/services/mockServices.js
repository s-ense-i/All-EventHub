/**
 * Mock Services
 * 
 * These services return mock data with realistic delays.
 * They have the exact same interface as real services for easy swapping.
 * When backend is ready, switch to realServices.
 */

import {
  mockCategories,
  mockEvents,
  mockReviews,
  mockUsers,
  mockTickets,
  mockFavorites,
  mockPendingAccounts,
  mockPendingEvents,
  searchMockEvents,
  delay,
} from './mockData';

// ============================================
// MOCK EVENT SERVICE
// ============================================
export const eventService = {
  async getApprovedEvents() {
    await delay(400);
    return {
      data: mockEvents.filter((e) => e.status === 'Approved'),
    };
  },

  async searchEvents(filters) {
    await delay(300);
    const results = searchMockEvents(filters);
    return { data: results };
  },

  async getAllEvents() {
    await delay(400);
    return { data: mockEvents };
  },

  async getPendingEvents() {
    await delay(300);
    return { data: mockPendingEvents };
  },

  async getUpcomingEvents(count = 5) {
    await delay(300);
    return {
      data: mockEvents
        .filter((e) => new Date(e.eventDate) > new Date())
        .slice(0, count),
    };
  },

  async getEventById(id) {
    await delay(300);
    const event = mockEvents.find((e) => e.id === parseInt(id));
    if (!event) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    return { data: event };
  },

  async getEventAnalytics(eventId) {
    await delay(300);
    return {
      data: {
        eventId,
        totalTicketsSold: 243,
        totalRevenue: 24299.57,
        averageRating: 4.8,
        reviewCount: 156,
        viewCount: 3421,
        conversionRate: 7.1,
      },
    };
  },

  async getEventsByOrganizer(organizerId) {
    await delay(300);
    return {
      data: mockEvents.filter((e) => e.organizerId === parseInt(organizerId)),
    };
  },

  async getEventsByCategory(categoryId) {
    await delay(300);
    return {
      data: mockEvents.filter((e) => e.categoryId === parseInt(categoryId)),
    };
  },

  async createEvent(eventData) {
    await delay(600);
    const newEvent = {
      id: Math.max(...mockEvents.map((e) => e.id)) + 1,
      ...eventData,
      status: 'Pending',
      rating: 0,
      reviews: 0,
      availableTickets: eventData.totalTickets,
      createdAt: new Date().toISOString(),
    };
    mockEvents.push(newEvent);
    return { data: newEvent, status: 201 };
  },

  async updateEvent(id, eventData) {
    await delay(500);
    const event = mockEvents.find((e) => e.id === parseInt(id));
    if (!event) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    Object.assign(event, eventData);
    return { data: event, status: 204 };
  },

  async deleteEvent(id) {
    await delay(400);
    const index = mockEvents.findIndex((e) => e.id === parseInt(id));
    if (index === -1) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    mockEvents.splice(index, 1);
    return { status: 204 };
  },

  async approveEvent(id) {
    await delay(400);
    const event = mockEvents.find((e) => e.id === parseInt(id));
    if (!event) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    event.status = 'Approved';
    return { data: event, status: 204 };
  },

  async rejectEvent(id, reason) {
    await delay(400);
    const event = mockEvents.find((e) => e.id === parseInt(id));
    if (!event) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    event.status = 'Rejected';
    event.rejectionReason = reason;
    return { data: event, status: 204 };
  },
};

// ============================================
// MOCK TICKET SERVICE
// ============================================
export const ticketService = {
  async bookTicket(eventId, participantId, quantity) {
    await delay(500);
    const event = mockEvents.find((e) => e.id === parseInt(eventId));
    if (!event) {
      throw { status: 404, data: { message: 'Event not found' } };
    }
    const existingPurchase = mockTickets.find(
      (ticket) =>
        ticket.participantId === parseInt(participantId) &&
        ticket.eventId === parseInt(eventId)
    );
    if (existingPurchase) {
      throw {
        status: 409,
        data: { message: 'You have already booked this event.' },
      };
    }
    if (event.availableTickets < quantity) {
      throw {
        status: 400,
        data: { message: `Only ${event.availableTickets} tickets available` },
      };
    }

    const totalPrice = event.ticketPrice * quantity;
    const ticket = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      participantId,
      quantity,
      totalPrice,
      bookingDate: new Date().toISOString(),
      status: 'Confirmed',
      qrCode: 'QR' + Math.random().toString(36).substr(2, 12).toUpperCase(),
    };

    mockTickets.push(ticket);
    event.availableTickets -= quantity;

    return { data: ticket, status: 201 };
  },

  async getParticipantTickets(participantId) {
    await delay(300);
    return {
      data: mockTickets.filter((t) => t.participantId === parseInt(participantId)),
    };
  },

  async checkEventPurchase(participantId, eventId) {
    await delay(200);
    const purchase = mockTickets.find(
      (t) =>
        t.participantId === parseInt(participantId) &&
        t.eventId === parseInt(eventId)
    );
    return {
      data: { hasPurchased: !!purchase, purchase: purchase || null },
    };
  },

  async getEventTickets(eventId) {
    await delay(300);
    return {
      data: mockTickets.filter((t) => t.eventId === parseInt(eventId)),
    };
  },

  async getTicketById(id) {
    await delay(200);
    const ticket = mockTickets.find((t) => t.id === id);
    if (!ticket) {
      throw { status: 404, data: { message: 'Ticket not found' } };
    }
    return { data: ticket };
  },

  async getTicketByQRCode(qrCode) {
    await delay(300);
    const ticket = mockTickets.find((t) => t.qrCode === qrCode);
    if (!ticket) {
      throw { status: 404, data: { message: 'Ticket not found' } };
    }
    return { data: ticket };
  },

  async getTicketLookupByQRCode(qrCode) {
    await delay(300);
    const ticket = mockTickets.find((t) => t.qrCode === qrCode);
    if (!ticket) {
      throw { status: 404, data: { message: 'Ticket not found' } };
    }
    const event = mockEvents.find((e) => e.id === ticket.eventId);
    const participant = mockParticipants.find((p) => p.id === ticket.participantId);
    return {
      data: {
        ticketId: ticket.id,
        qrCode: ticket.qrCode,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        venue: event.venue,
        participantId: participant?.id,
        participantFullName: participant?.fullName || 'Unknown',
        participantEmail: participant?.email || '',
        participantPhoneNumber: participant?.phoneNumber || null,
        purchasedAt: ticket.bookingDate,
        isUsed: !!ticket.usedAtUtc,
        usedAtUtc: ticket.usedAtUtc || null,
      },
    };
  },

  async verifyTicketByQrCode(qrCode) {
    await delay(300);
    const ticket = mockTickets.find((t) => t.qrCode === qrCode);
    if (!ticket) {
      throw { status: 404, data: { message: 'Ticket not found' } };
    }
    const event = mockEvents.find((e) => e.id === ticket.eventId);
    const participant = mockParticipants.find((p) => p.id === ticket.participantId);
    return {
      data: {
        ticketId: ticket.id,
        qrCode: ticket.qrCode,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        venue: event.venue,
        participantFullName: participant?.fullName || 'Unknown',
        purchasedAt: ticket.bookingDate,
        verifiedAtUtc: new Date().toISOString(),
      },
    };
  },
};

// ============================================
// MOCK CATEGORY SERVICE
// ============================================
export const categoryService = {
  async getCategories() {
    await delay(200);
    return { data: mockCategories };
  },

  async getCategoriesWithCounts() {
    await delay(300);
    return { data: mockCategories };
  },

  async getCategoryById(id) {
    await delay(200);
    const category = mockCategories.find((c) => c.id === parseInt(id));
    if (!category) {
      throw { status: 404, data: { message: 'Category not found' } };
    }
    return { data: category };
  },

  async getCategoryByName(name) {
    await delay(200);
    const category = mockCategories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (!category) {
      throw { status: 404, data: { message: 'Category not found' } };
    }
    return { data: category };
  },

  async createCategory(data) {
    await delay(300);
    const newCategory = {
      id: Math.max(...mockCategories.map((c) => c.id)) + 1,
      ...data,
      count: 0,
    };
    mockCategories.push(newCategory);
    return { data: newCategory, status: 201 };
  },

  async updateCategory(id, data) {
    await delay(300);
    const category = mockCategories.find((c) => c.id === parseInt(id));
    if (!category) {
      throw { status: 404, data: { message: 'Category not found' } };
    }
    Object.assign(category, data);
    return { data: category, status: 204 };
  },

  async deleteCategory(id) {
    await delay(300);
    const index = mockCategories.findIndex((c) => c.id === parseInt(id));
    if (index === -1) {
      throw { status: 404, data: { message: 'Category not found' } };
    }
    mockCategories.splice(index, 1);
    return { status: 204 };
  },
};

// ============================================
// MOCK FAVORITE SERVICE
// ============================================
export const favoriteService = {
  async addFavorite(favoriteDataOrEventId) {
    await delay(300);
    // Handle both object {eventId} and raw eventId string/number
    const favoriteData = typeof favoriteDataOrEventId === 'object'
      ? favoriteDataOrEventId
      : { eventId: favoriteDataOrEventId };
    const eventId = favoriteData.eventId;
    const userId = favoriteData.userId || 1; // default user for mock
    const existing = mockFavorites.find(
      (f) => f.userId === userId && f.eventId === parseInt(eventId)
    );
    if (existing) {
      throw { status: 409, data: { message: 'Event already in favorites' } };
    }
    const newFavorite = {
      id: Math.max(...mockFavorites.map((f) => f.id), 0) + 1,
      userId,
      eventId: parseInt(eventId),
      addedAt: new Date().toISOString(),
    };
    mockFavorites.push(newFavorite);
    return { data: newFavorite, status: 201 };
  },

  async getUserFavorites(userId) {
    await delay(300);
    const favorites = mockFavorites.filter((f) => f.userId === parseInt(userId));
    const favoriteEvents = favorites
      .map((favorite) => {
        const event = mockEvents.find((item) => item.id === favorite.eventId);
        if (!event) {
          return null;
        }

        return {
          ...event,
          id: favorite.id,
          eventId: favorite.eventId,
          userId: favorite.userId,
          addedAt: favorite.addedAt,
        };
      })
      .filter(Boolean);

    return { data: favoriteEvents };
  },

  async removeFavorite(favoriteId) {
    await delay(300);
    const index = mockFavorites.findIndex((f) => f.id === parseInt(favoriteId));
    if (index === -1) {
      throw { status: 404, data: { message: 'Favorite not found' } };
    }
    mockFavorites.splice(index, 1);
    return { status: 204 };
  },
};

// ============================================
// MOCK REVIEW SERVICE
// ============================================
export const reviewService = {
  async submitReview(reviewData) {
    await delay(400);
    const newReview = {
      id: Math.max(...mockReviews.map((r) => r.id), 0) + 1,
      ...reviewData,
      createdAt: new Date().toISOString(),
    };
    mockReviews.push(newReview);
    return { data: newReview, status: 201 };
  },

  async getEventReviews(eventId) {
    await delay(300);
    return {
      data: mockReviews.filter((r) => r.eventId === parseInt(eventId)),
    };
  },

  async getMyReviews() {
    await delay(300);
    return {
      data: mockReviews,
    };
  },

  async getOrganizerReviews() {
    await delay(300);
    return {
      data: mockReviews,
    };
  },

  async getAllReviews() {
    await delay(300);
    return {
      data: mockReviews,
    };
  },

  async deleteReview(reviewId) {
    await delay(300);
    const index = mockReviews.findIndex((r) => r.id === parseInt(reviewId));
    if (index === -1) {
      throw { status: 404, data: { message: 'Review not found' } };
    }
    mockReviews.splice(index, 1);
    return { status: 204 };
  },
};

// ============================================
// MOCK USER SERVICE
// ============================================
export const userService = {
  async getUserById(id) {
    await delay(200);
    const user = mockUsers[id];
    if (!user) {
      throw { status: 404, data: { message: 'User not found' } };
    }
    return { data: user };
  },

  async getUserByEmail(email) {
    await delay(200);
    const user = Object.values(mockUsers).find((u) => u.email === email);
    if (!user) {
      throw { status: 404, data: { message: 'User not found' } };
    }
    return { data: user };
  },

  async emailExists(email) {
    await delay(150);
    const exists = Object.values(mockUsers).some((u) => u.email === email);
    return { data: { exists } };
  },

  async updateUser(id, userData) {
    await delay(300);
    const user = mockUsers[id];
    if (!user) {
      throw { status: 404, data: { message: 'User not found' } };
    }
    Object.assign(user, userData);
    return { data: user, status: 204 };
  },

  async deleteUser(id) {
    await delay(400);
    if (!mockUsers[id]) {
      throw { status: 404, data: { message: 'User not found' } };
    }
    delete mockUsers[id];
    return { status: 204 };
  },

  async resetPassword() {
    await delay(500);
    return { data: { message: 'Password reset successful' }, status: 204 };
  },

  async logout() {
    await delay(200);
    return { data: { message: 'Logged out successfully' }, status: 204 };
  },
};

// ============================================
// MOCK AUTH SERVICE
// ============================================
export const authService = {
  async register(registerData) {
    await delay(600);
    // Check if email exists
    if (Object.values(mockUsers).some((u) => u.email === registerData.email) || mockPendingAccounts.some((u) => u.email === registerData.email)) {
      throw {
        status: 400,
        data: { message: 'Email already registered' },
      };
    }

    const normalizedRole = String(registerData.applyAs || '').toLowerCase();
    const isOrganizer = normalizedRole === 'eventorganizer' || normalizedRole === 'organizer';
    const nextId = Math.max(0, ...Object.keys(mockUsers).map(Number), ...mockPendingAccounts.map((account) => Number(account.id))) + 1;

    const newUser = {
      id: nextId,
      email: registerData.email,
      phoneNumber: registerData.phoneNumber || '',
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      applyAs: isOrganizer ? 'EventOrganizer' : registerData.applyAs,
      avatar: `https://i.pravatar.cc/150?u=${registerData.email}`,
      joinedAt: new Date().toISOString(),
      username: registerData.username || '',
      accountStatus: isOrganizer ? 'Pending' : 'Approved',
    };

    if (isOrganizer) {
      mockPendingAccounts.push({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        applyAs: 'EventOrganizer',
        appliedAt: new Date().toISOString(),
        companyName: registerData.companyName || '',
        username: newUser.username,
        avatar: newUser.avatar,
        accountStatus: 'Pending',
      });
    } else {
      mockUsers[newUser.id] = newUser;
    }

    return {
      data: {
        user: newUser,
        token: 'mock_token_' + Math.random().toString(36).substr(2, 20),
        expiresAtUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 201,
    };
  },

  async login(email) {
    await delay(500);
    const user = Object.values(mockUsers).find((u) => u.email === email) || mockPendingAccounts.find((u) => u.email === email);
    if (!user) {
      throw {
        status: 401,
        data: { message: 'Invalid email or password' },
      };
    }

    const isPending = String(user.accountStatus || user.status || '').toLowerCase() === 'pending';

    return {
      data: {
        user: {
          ...user,
          applyAs: user.applyAs || 'Participant',
          accountStatus: isPending ? 'Pending' : 'Approved',
        },
        token: 'mock_token_' + Math.random().toString(36).substr(2, 20),
        expiresAtUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  },
};

// ============================================
// MOCK ADMIN SERVICE
// ============================================
export const adminService = {
  async getPendingAccounts() {
    await delay(300);
    return { data: mockPendingAccounts };
  },

  async approveOrganizer(organizerId) {
    await delay(300);
    const organizerIdNumber = Number(organizerId);
    const index = mockPendingAccounts.findIndex((acc) => Number(acc.id) === organizerIdNumber);

    if (index === -1) {
      throw { status: 404, data: { message: 'Pending organizer account not found' } };
    }

    const account = mockPendingAccounts[index];
    mockPendingAccounts.splice(index, 1);

    mockUsers[organizerIdNumber] = {
      id: organizerIdNumber,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      applyAs: 'EventOrganizer',
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(account.email)}`,
      joinedAt: new Date().toISOString(),
      companyName: account.companyName,
      phoneNumber: account.phoneNumber || '',
      username: account.username || '',
      accountStatus: 'Approved',
    };

    return { data: { id: organizerIdNumber }, status: 204 };
  },

  async rejectOrganizer(organizerId) {
    await delay(300);
    const organizerIdNumber = Number(organizerId);
    const index = mockPendingAccounts.findIndex((acc) => Number(acc.id) === organizerIdNumber);

    if (index === -1) {
      throw { status: 404, data: { message: 'Pending organizer account not found' } };
    }

    mockPendingAccounts.splice(index, 1);
    return { data: { id: organizerIdNumber }, status: 204 };
  },

  async getPendingEvents() {
    await delay(300);
    return { data: mockPendingEvents };
  },

  async approveEvent(eventId) {
    await delay(300);
    const eventIdNumber = Number(eventId);
    const index = mockPendingEvents.findIndex((event) => Number(event.id) === eventIdNumber);

    if (index === -1) {
      throw { status: 404, data: { message: 'Pending event not found' } };
    }

    const pendingEvent = mockPendingEvents[index];
    mockPendingEvents.splice(index, 1);

    mockEvents.push({
      ...pendingEvent,
      status: 'Approved',
      availableTickets: pendingEvent.totalTickets,
      createdAt: new Date().toISOString(),
      rating: 0,
      reviews: 0,
    });

    return { data: { id: eventIdNumber }, status: 204 };
  },

  async rejectEvent(eventId) {
    await delay(300);
    const eventIdNumber = Number(eventId);
    const index = mockPendingEvents.findIndex((event) => Number(event.id) === eventIdNumber);

    if (index === -1) {
      throw { status: 404, data: { message: 'Pending event not found' } };
    }

    mockPendingEvents.splice(index, 1);
    return { data: { id: eventIdNumber }, status: 204 };
  },
};
