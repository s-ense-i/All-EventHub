import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import EventGrid from '../../components/EventGrid';
import { AuthContext } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { favoriteService } from '../../services/favoriteService';
import { useParticipantTickets } from '../../hooks/useParticipantTickets';

function normalizeFavoriteEvent(favorite, approvedEvents, participantTickets) {
  const fallbackEvent = approvedEvents.find((event) => String(event.id) === String(favorite.eventId ?? favorite.id));
  const bookedPurchase = participantTickets.find((ticket) => String(ticket.eventId) === String(favorite.eventId ?? favorite.id)) || null;
  const source = fallbackEvent || favorite;

  return {
    ...source,
    ...favorite,
    id: fallbackEvent?.id ?? favorite.eventId ?? favorite.id,
    eventId: favorite.eventId ?? fallbackEvent?.id ?? favorite.id,
    favoriteId: favorite.id,
    title: fallbackEvent?.title ?? favorite.title,
    venue: fallbackEvent?.venue ?? favorite.venue,
    date: fallbackEvent?.date ?? favorite.eventDate ?? favorite.date,
    eventDate: fallbackEvent?.eventDate ?? favorite.eventDate ?? favorite.date,
    image: fallbackEvent?.image ?? favorite.image,
    category: fallbackEvent?.category ?? favorite.category,
    categoryName: fallbackEvent?.categoryName ?? favorite.categoryName ?? favorite.category,
    ticketPrice: fallbackEvent?.ticketPrice ?? favorite.ticketPrice ?? fallbackEvent?.price ?? favorite.price,
    price: fallbackEvent?.price ?? favorite.price ?? fallbackEvent?.ticketPrice ?? favorite.ticketPrice,
    availableTickets: fallbackEvent?.availableTickets ?? favorite.availableTickets ?? 0,
    totalTickets: fallbackEvent?.totalTickets ?? favorite.totalTickets ?? 0,
    bookedPurchase,
  };
}

export default function Favorites() {
  const { user, isAuthenticated } = useContext(AuthContext);

  const { data: approvedEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['approved-events'],
    queryFn: () => eventService.getApprovedEvents(),
    select: (response) => response.data || [],
  });

  const { data: favoriteRecords = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: () => favoriteService.getUserFavorites(user.id),
    select: (response) => response.data || [],
    enabled: isAuthenticated && !!user?.id,
  });

  const { tickets: participantTickets = [] } = useParticipantTickets(user?.id, isAuthenticated);

  const favoriteEvents = favoriteRecords.map((favorite) => normalizeFavoriteEvent(favorite, approvedEvents, participantTickets));
  const isLoading = eventsLoading || favoritesLoading;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      <Header />

      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '300px',
        padding: '4rem 1.5rem',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #E63946 55%, #f08a5d 100%)',
        color: '#ffffff',
      }}>
        <div style={{
          position: 'absolute',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.12)',
          top: '12%',
          left: '8%',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.08)',
          bottom: '8%',
          right: '10%',
          animation: 'float 8s ease-in-out infinite 0.8s',
        }} />
        <div style={{
          position: 'absolute',
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          top: '28%',
          right: '22%',
          animation: 'float 7s ease-in-out infinite 1.4s',
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
            Saved Events
          </span>
          <h1 style={{
            fontFamily: "'Lobster Two', cursive",
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            lineHeight: '1.05',
            margin: '0 0 1rem 0',
            maxWidth: '11ch',
            textShadow: '0 10px 30px rgba(0,0,0,0.25)',
            color: '#ffffff',
            animation: 'fadeInUp 0.6s ease-out 0.15s backwards',
          }}>
            Your favorites<br />in one place.
          </h1>
          <p style={{
            maxWidth: '620px',
            fontSize: '1.05rem',
            lineHeight: '1.8',
            margin: '0 0 1.5rem 0',
            color: '#ffffff',
            opacity: 0.95,
            animation: 'fadeInUp 0.6s ease-out 0.3s backwards',
          }}>
            Revisit the events you have saved, track what you want to attend next, and keep your shortlist ready whenever you need it.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', color: '#ffffff', animation: 'fadeInUp 0.6s ease-out 0.45s backwards' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.2rem', color: '#ffffff' }}>Saved events</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ffffff' }}>{favoriteEvents.length}</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', color: '#ffffff', animation: 'fadeInUp 0.6s ease-out 0.6s backwards' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.2rem', color: '#ffffff' }}>Quick access</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ffffff' }}>Bookmarked</div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {isLoading ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} style={{ height: '280px', borderRadius: '12px', backgroundColor: '#f3ece5', animation: 'pulse 1.6s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
        ) : favoriteEvents.length > 0 ? (
          <EventGrid
            events={favoriteEvents}
            isLoading={false}
            isEmpty={false}
            bookedEventIds={new Set(participantTickets.map((ticket) => String(ticket.eventId)))}
          />
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>♡</div>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e', margin: '0 0 0.75rem 0' }}>
              Your favorites list is empty
            </h2>
            <p style={{ color: '#666', lineHeight: '1.8', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
              Save events from the details page to build a personal shortlist here. Your favorite picks will appear with the same card layout as the rest of the app.
            </p>
            <Link
              to="/events"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.85rem 1.4rem',
                borderRadius: '999px',
                backgroundColor: '#E63946',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '700',
                boxShadow: '0 10px 24px rgba(230,57,70,0.25)',
                animation: 'fadeInUp 0.6s ease-out 0.4s backwards',
              }}
            >
              Browse events
            </Link>
          </div>
        )}
      </div>

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
