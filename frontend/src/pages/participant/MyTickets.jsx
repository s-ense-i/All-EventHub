import { useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import { AuthContext } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { useParticipantTickets } from '../../hooks/useParticipantTickets';

function formatDate(dateString) {
  if (!dateString) return 'TBD';

  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString) {
  if (!dateString) return 'TBD';

  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getEventCategoryName(event) {
  return event?.categoryName || event?.category?.name || event?.category || 'General';
}

function getEventOrganizerName(event) {
  if (event?.organizerName) return event.organizerName;

  const organizer = event?.organizer;
  const fullName = [organizer?.firstName, organizer?.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Event host';
}

function normalizeBookedTicket(ticket, approvedEvents) {
  const matchingEvent = approvedEvents.find((event) => String(event.id) === String(ticket.eventId));
  const quantity = toNumber(ticket.quantity, 1);
  const totalPrice = toNumber(ticket.totalPrice, toNumber(ticket.ticketPrice, toNumber(matchingEvent?.price)));
  const eventDate = ticket.eventDate || ticket.date || matchingEvent?.eventDate || matchingEvent?.date || null;

  return {
    ...ticket,
    event: matchingEvent || null,
    title: ticket.title || matchingEvent?.title || 'Booked event',
    description: ticket.description || matchingEvent?.description || 'Your booking details are ready.',
    venue: ticket.venue || matchingEvent?.venue || 'Venue TBD',
    date: eventDate,
    bookingDate: ticket.bookingDate || ticket.purchasedAt || ticket.createdAt || null,
    categoryName: ticket.categoryName || getEventCategoryName(matchingEvent),
    organizerName: ticket.organizerName || getEventOrganizerName(matchingEvent),
    image: ticket.image || matchingEvent?.image || 'https://picsum.photos/seed/eventhub-ticket/800/500',
    ticketPrice: toNumber(ticket.ticketPrice, toNumber(matchingEvent?.price)),
    quantity,
    totalPrice,
  };
}

function getTicketQrPayload(ticket) {
  return String(ticket?.qrCode || ticket?.id || '');
}

export default function MyTickets() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);

  const {
    data: approvedEventsResponse,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['approved-events'],
    queryFn: async () => {
      const response = await eventService.getApprovedEvents();
      return Array.isArray(response) ? response : (response?.data || []);
    },
  });

  const approvedEvents = Array.isArray(approvedEventsResponse) ? approvedEventsResponse : [];

  const {
    tickets: bookedTicketsData = [],
    isLoading: ticketsLoading,
    isError: ticketsError,
  } = useParticipantTickets(user?.id, isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const bookedTickets = bookedTicketsData.map((ticket) => normalizeBookedTicket(ticket, approvedEvents));
  const isLoading = eventsLoading || ticketsLoading;
  const totalTickets = bookedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const totalSpent = bookedTickets.reduce((sum, ticket) => sum + ticket.totalPrice, 0);
  const now = new Date();
  const upcomingTicketsList = bookedTickets.filter((t) => t.date && new Date(t.date) > now);
  const upcomingCount = upcomingTicketsList.length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      <Header />

      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '300px',
        padding: '4rem 1.5rem',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #E63946 52%, #f08a5d 100%)',
        color: '#ffffff',
      }}>
        <div style={{
          position: 'absolute',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.12)',
          top: '12%',
          left: '8%',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.08)',
          bottom: '-8%',
          right: '6%',
          animation: 'float 8s ease-in-out infinite 0.8s',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 35%), radial-gradient(circle at bottom left, rgba(255,255,255,0.16), transparent 30%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.35rem 0.9rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            fontSize: '0.8rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
            color: '#ffffff',
            animation: 'fadeInUp 0.6s ease-out backwards',
          }}>
            My tickets
          </span>
          <h1 style={{
            fontFamily: "'Lobster Two', cursive",
            fontSize: 'clamp(2.5rem, 5vw, 4.4rem)',
            lineHeight: '1.05',
            margin: '0 0 1rem 0',
            maxWidth: '12ch',
            textShadow: '0 10px 30px rgba(0,0,0,0.25)',
            color: '#ffffff',
            animation: 'fadeInUp 0.6s ease-out 0.15s backwards',
          }}>
            Your booked events
            <br />
            in one place.
          </h1>
          <p style={{
            maxWidth: '680px',
            fontSize: '1.05rem',
            lineHeight: '1.8',
            margin: '0 0 1.5rem 0',
            color: '#ffffff',
            opacity: 0.95,
            animation: 'fadeInUp 0.6s ease-out 0.3s backwards',
          }}>
            Review every ticket you have already booked, including the event date, venue, ticket type, booking status, and booking summary.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', animation: 'fadeInUp 0.6s ease-out 0.45s backwards' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.2rem' }}>Booked events</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{bookedTickets.length}</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', animation: 'fadeInUp 0.6s ease-out 0.6s backwards' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.2rem' }}>Tickets booked</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{totalTickets}</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', animation: 'fadeInUp 0.6s ease-out 0.75s backwards' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.2rem' }}>Total spent</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>${totalSpent.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {isLoading ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} style={{ height: '340px', borderRadius: '18px', backgroundColor: '#f3ece5', animation: 'pulse 1.6s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
        ) : ticketsError ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
          }}>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e', margin: '0 0 0.75rem 0' }}>
              Could not load your tickets
            </h2>
            <p style={{ color: '#666', lineHeight: '1.8', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
              Please refresh the page or try again in a moment.
            </p>
          </div>
        ) : bookedTickets.length > 0 ? (
          <>
            {upcomingCount > 0 && (
              <section style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: '#1a1a2e' }}>Upcoming Booked Events</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  {upcomingTicketsList.slice(0, 4).map((t) => (
                    <div key={t.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                      <img src={t.image} alt={t.title} style={{ width: '86px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: '#1a1a2e' }}>{t.title}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>{formatDate(t.date)} • {t.venue}</div>
                      </div>
                      <button onClick={() => navigate(`/events/${t.eventId}`)} style={{ padding: '0.45rem 0.75rem', borderRadius: '10px', backgroundColor: '#E63946', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>View</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {bookedTickets.map((ticket) => (
                <article key={ticket.id} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: '1px solid #f0f0f0',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{ position: 'relative', height: '190px', overflow: 'hidden' }}>
                    <img
                      src={ticket.image}
                      alt={ticket.title}
                      onError={(e) => {
                        e.currentTarget.src = 'https://picsum.photos/seed/eventhub-ticket-fallback/800/500';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(26,26,46,0.05), rgba(26,26,46,0.55))',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {ticket.categoryName}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      right: '1rem',
                      color: '#ffffff',
                    }}>
                      <h2 style={{ margin: '0 0 0.35rem 0', fontFamily: "'Lobster Two', cursive", fontSize: '2rem', lineHeight: '1.05', color: '#ffffff' }}>
                        {ticket.title}
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.95 }}>
                        {formatDate(ticket.date)} at {formatTime(ticket.date)}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '999px',
                        backgroundColor: '#f9f2f3',
                        color: '#E63946',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                      }}>
                        {ticket.status || 'Confirmed'}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '999px',
                        backgroundColor: '#eef6ff',
                        color: '#2457d6',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                      }}>
                        Ticket type: General Admission
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Booking ID</span>
                        <strong style={{ color: '#1a1a2e' }}>#{ticket.id}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Tickets</span>
                        <strong style={{ color: '#1a1a2e' }}>{ticket.quantity}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Venue</span>
                        <strong style={{ color: '#1a1a2e', textAlign: 'right' }}>{ticket.venue}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Booked on</span>
                        <strong style={{ color: '#1a1a2e' }}>{formatDate(ticket.bookingDate)}</strong>
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #faf6f7, #fff8f5)',
                      border: '1px solid #f1e3e5',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.7rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Host / talker</span>
                        <strong style={{ color: '#1a1a2e', textAlign: 'right' }}>{ticket.organizerName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: '#7a7a7a', fontSize: '0.9rem' }}>Event date</span>
                        <strong style={{ color: '#1a1a2e', textAlign: 'right' }}>{formatDate(ticket.date)}</strong>
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      borderRadius: '16px',
                      backgroundColor: '#fcfcfc',
                      border: '1px solid #ececec',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getTicketQrPayload(ticket))}`}
                        alt="Ticket QR code"
                        style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#1a1a2e', fontWeight: '700' }}>Ticket QR</p>
                        <p style={{ margin: '0 0 0.35rem 0', color: '#666', fontSize: '0.88rem', lineHeight: '1.5' }}>
                          Show this code at check-in.
                        </p>
                        <p style={{ margin: 0, color: '#7a7a7a', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Code: {getTicketQrPayload(ticket)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid #f0f0f0' }}>
                      <div>
                        <p style={{ margin: '0 0 0.2rem 0', color: '#7a7a7a', fontSize: '0.85rem' }}>Total paid</p>
                        <p style={{ margin: 0, color: '#E63946', fontSize: '1.2rem', fontWeight: '800' }}>${ticket.totalPrice.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${ticket.eventId}`)}
                        style={{
                          padding: '0.7rem 1rem',
                          borderRadius: '999px',
                          border: 'none',
                          backgroundColor: '#E63946',
                          color: '#ffffff',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 10px 24px rgba(230,57,70,0.22)',
                        }}
                      >
                        View event
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e', margin: '0 0 0.75rem 0' }}>
              No tickets booked yet
            </h2>
            <p style={{ color: '#666', lineHeight: '1.8', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
              Once you book an event, it will appear here with the full booking details, event date, and ticket summary.
            </p>
            <button
              type="button"
              onClick={() => navigate('/events')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1.4rem',
                borderRadius: '999px',
                backgroundColor: '#E63946',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                boxShadow: '0 10px 24px rgba(230,57,70,0.25)',
                cursor: 'pointer',
              }}
            >
              Browse events
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-24px); }
        }
      `}</style>
    </div>
  );
}
