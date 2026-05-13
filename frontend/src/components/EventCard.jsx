import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getEventCategory, getEventDate, getEventPrice, getEventImageUrl } from '../utils/eventUtils';

export default function EventCard({ event, isSoldOut, isBooked = false }) {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.applyAs === 'Admin';
  const eventId = event?.eventId ?? event?.id;
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const linkState = event?.bookedPurchase ? { bookedPurchase: event.bookedPurchase } : undefined;

  return (
    <Link to={`/events/${eventId}`} state={linkState} style={{ textDecoration: 'none' }}>
      <div className={`event-card ${isSoldOut ? 'sold-out' : ''}`}>
        {/* Image Container */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={getEventImageUrl(event)}
            alt={event.title}
            onError={(e) => {
              if (e.currentTarget.src !== `https://picsum.photos/seed/eventhub-${event?.id || Math.random()}/500/300`) {
                e.currentTarget.src = `https://picsum.photos/seed/eventhub-${event?.id || Math.random()}/500/300`;
              }
            }}
            style={{
              width: '100%',
              height: '180px',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
            }}
          />
          {isSoldOut && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}>
              SOLD OUT
            </div>
          )}
          {isBooked && (
            <div style={{
              position: 'absolute',
              top: '0.85rem',
              right: '0.85rem',
              backgroundColor: '#eef7f6',
              color: '#087f5b',
              padding: '0.45rem 0.8rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Booked
            </div>
          )}
        </div>

        {/* Content Container */}
        <div style={{ padding: '1.25rem' }}>
          {/* Category */}
          <span style={{
            color: '#E63946',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.25rem',
            display: 'block',
          }}>
            {getEventCategory(event)}
          </span>

          {/* Title */}
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#1a1a2e',
            marginBottom: '0.5rem',
            fontFamily: "'Inter', sans-serif",
            lineHeight: '1.3',
          }}>
            {event.title}
          </h3>

          {/* Date & Time */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#666',
            fontSize: '0.85rem',
            marginBottom: '0.25rem',
          }}>
            <span>📅</span>
            <span>{formatDate(getEventDate(event))} | {event.time}</span>
          </div>

          {/* Venue */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#666',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            <span>📍</span>
            <span>{event.venue}</span>
          </div>

          {/* Price & Action */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1rem',
            borderTop: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
              }}></span>
              <span style={{
                fontWeight: '600',
                color: '#E63946',
                fontSize: '1.1rem',
              }}>
                ${getEventPrice(event).toFixed(0)}
              </span>
            </div>
            {!isAdmin && (
              <span style={{
                color: isBooked ? '#087f5b' : '#E63946',
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                {isBooked ? 'Booked' : 'Details'} <span style={{ transition: 'transform 0.3s' }}>→</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .event-card {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid #f0f0f0;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .event-card:hover img {
          transform: scale(1.05);
        }

        .event-card.sold-out {
          opacity: 0.75;
        }

        .event-card.sold-out:hover {
          opacity: 1;
        }
      `}</style>
    </Link>
  );
}