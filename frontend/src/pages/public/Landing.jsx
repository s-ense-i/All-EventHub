import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import EventCard from '../../components/EventCard';
import { AuthContext } from '../../context/AuthContext';
import { getEventCategory, getEventDate, getEventPrice, getEventImageUrl } from '../../utils/eventUtils';
import { useEvents } from '../../hooks/useEvents';
import { useCategories } from '../../hooks/useCategories';
import { useParticipantTickets } from '../../hooks/useParticipantTickets';

export default function Landing() {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const { isAuthenticated, user } = useContext(AuthContext);
  const isAdmin = user?.applyAs === 'Admin';
  const { bookedEventIds } = useParticipantTickets(user?.id, isAuthenticated);
  const { data: liveEvents = [] } = useEvents({});
  const { data: liveCategories = [] } = useCategories();

  const featuredEvents = useMemo(() => liveEvents.slice(0, 8), [liveEvents]);
  const hotEvents = useMemo(() => liveEvents.slice(0, 6), [liveEvents]);
  const upcomingEvents = useMemo(
    () => [...liveEvents]
      .filter((event) => getEventDate(event))
      .sort((left, right) => new Date(getEventDate(left)) - new Date(getEventDate(right)))
      .slice(0, 6),
    [liveEvents]
  );

  // Auto-rotate featured events
  useEffect(() => {
    if (featuredEvents.length === 0) return undefined;

    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredEvents.length]);

  const handlePrev = () => {
    if (featuredEvents.length === 0) return;
    setCurrentEventIndex((prev) =>
      prev === 0 ? featuredEvents.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    if (featuredEvents.length === 0) return;
    setCurrentEventIndex((prev) => (prev + 1) % featuredEvents.length);
  };

  const currentEvent = featuredEvents[currentEventIndex] || featuredEvents[0] || {};
  const currentEventBooked = bookedEventIds.has(String(currentEvent?.id));

  return (
    <div className="landing-page">
      <Header />

      {/* Hero Welcome Section */}
      <section style={{
        background: 'linear-gradient(-45deg, #E63946, #E63946cc, #1a1a2e, #f5f3f0)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 8s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          top: '10%',
          left: '10%',
          animation: 'float 6s ease-in-out infinite',
        }}></div>
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          bottom: '10%',
          right: '10%',
          animation: 'float 8s ease-in-out infinite 1s',
        }}></div>
        <div style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          top: '50%',
          right: '20%',
          animation: 'float 7s ease-in-out infinite 2s',
        }}></div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: "'Lobster Two', cursive",
            fontSize: '3rem',
            color: '#ffffff',
            marginBottom: '1rem',
            animation: 'fadeInUp 0.6s ease-out backwards',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}>
            Welcome to EventsHub
          </h1>
          <p style={{
            fontSize: '1.15rem',
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            textShadow: '0 1px 5px rgba(0,0,0,0.1)',
          }}>
            Discover, explore, and book the best events happening around you
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeInUp 0.6s ease-out 0.4s both',
          }}>
            <Link
              to="/events"
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Explore Events
            </Link>
            {!isAuthenticated && (
              <Link
                to="/signup"
                className="btn btn-secondary"
                style={{ color: '#ffffff', borderColor: '#ffffff', textDecoration: 'none' }}
              >
                Create Account
              </Link>
            )}
          </div>
        </div>

        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
        `}</style>
      </section>

      {/* Featured Event Carousel */}
      <section style={{ padding: '2rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e' }}>
              Featured Events
            </h2>
            <Link to="/events" style={{ color: '#E63946', textDecoration: 'none', fontWeight: '500' }}>
              View All →
            </Link>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            maxHeight: '400px',
            animation: 'slideCarousel 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
            key: `carousel-${currentEventIndex}`,
          }}>
            {/* Image with Sliding Animation */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: '300px' }}>
              <img
                src={getEventImageUrl(currentEvent)}
                alt={currentEvent.title || 'Featured event'}
                onError={(e) => {
                  const fallbackUrl = `https://picsum.photos/seed/eventhub-${currentEvent?.id || Math.random()}/800/500`;
                  if (e.currentTarget.src !== fallbackUrl) {
                    e.currentTarget.src = fallbackUrl;
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  transform: `translateX(0)`,
                }}
                key={currentEvent.id || 'featured-event'}
              />
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                backgroundColor: '#E63946',
                color: '#ffffff',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
              }}>
                FEATURED
              </div>
            </div>

            {/* Details */}
            <div style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              animation: 'slideIn 0.6s ease-out',
            }}
              key={`details-${currentEvent.id || 'featured-event'}`}
            >
              <span style={{ color: '#E63946', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {getEventCategory(currentEvent)}
              </span>
              <h3 style={{
                fontFamily: "'Lobster Two', cursive",
                fontSize: '1.75rem',
                color: '#1a1a2e',
                marginBottom: '1rem',
                lineHeight: '1.2',
              }}>
                {currentEvent.title || 'Featured event'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  <span>📅</span>
                  <span>
                    {currentEvent.id ? (
                      (() => {
                        const dateStr = getEventDate(currentEvent);
                        if (!dateStr) return 'TBD';
                        const dateObj = new Date(dateStr);
                        if (isNaN(dateObj.getTime())) return dateStr;
                        return dateObj.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      })()
                    ) : 'TBD'}{currentEvent.time ? ` at ${currentEvent.time}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  <span>📍</span>
                  <span>{currentEvent.venue}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#E63946', fontWeight: '600', fontSize: '1.1rem' }}>
                  <span>💰</span>
                  <span>${getEventPrice(currentEvent).toFixed(0)}</span>
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                {currentEvent.description || 'Experience an amazing event with great atmosphere and unforgettable memories.'}
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isAdmin && (
                  currentEventBooked ? (
                    <span
                      className="btn btn-primary"
                      style={{ textDecoration: 'none', backgroundColor: '#eef7f6', color: '#087f5b', borderColor: '#cdebe3', cursor: 'default' }}
                    >
                      Booked
                    </span>
                  ) : (
                    <Link
                      to={currentEvent.id ? `/events/${currentEvent.id}` : '/events'}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      Book Now
                    </Link>
                  )
                )}
                <Link
                  to={currentEvent.id ? `/events/${currentEvent.id}` : '/events'}
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  More Info
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={handlePrev}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '2px solid #e0e0e0',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#E63946';
                e.target.style.borderColor = '#E63946';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.color = '#333';
              }}
            >
              ←
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {featuredEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentEventIndex(index)}
                  style={{
                    width: index === currentEventIndex ? '28px' : '10px',
                    height: '10px',
                    borderRadius: '10px',
                    backgroundColor: index === currentEventIndex ? '#E63946' : '#e0e0e0',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '2px solid #e0e0e0',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#E63946';
                e.target.style.borderColor = '#E63946';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.color = '#333';
              }}
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* Hot Events Section */}
      <section style={{ padding: '3rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e' }}>
              Hot Events
            </h2>
            <Link to="/events" style={{ color: '#E63946', textDecoration: 'none', fontWeight: '500' }}>
              View All →
            </Link>
          </div>
          <div className="events-grid">
            {hotEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSoldOut={event.availableTickets === 0}
                isBooked={bookedEventIds.has(String(event.id))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section style={{ padding: '3rem 0', backgroundColor: '#f5f3f0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e' }}>
              Upcoming Events
            </h2>
            <Link to="/events" style={{ color: '#E63946', textDecoration: 'none', fontWeight: '500' }}>
              View All →
            </Link>
          </div>
          <div className="events-grid">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSoldOut={event.availableTickets === 0}
                isBooked={bookedEventIds.has(String(event.id))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Browse Categories */}
      <section style={{ padding: '3rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <h2 style={{
            fontFamily: "'Lobster Two', cursive",
            fontSize: '2rem',
            color: '#1a1a2e',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            Browse by Category
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {liveCategories.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: '#666',
                backgroundColor: '#fafafa',
                border: '1px dashed #d1d5db',
                borderRadius: '8px',
                padding: '1.25rem',
              }}>
                No categories are available yet.
              </div>
            ) : (
              liveCategories.map((category) => (
                <Link
                  key={category.id || category.name}
                  to={`/events?category=${encodeURIComponent(category.name || category)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#1a1a2e',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#E63946';
                    e.currentTarget.style.backgroundColor = '#E63946';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#1a1a2e';
                  }}
                >
                  {category.name || category}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ backgroundColor: '#1a1a2e', color: '#ffffff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2.5rem', color: '#ffffff', marginBottom: '1rem' }}>
            Ready to Host Your Event?
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0' }}>
            Join thousands of organizers who are using EventsHub to reach millions of potential attendees.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#f8f9fa', padding: '3rem 1.5rem 2rem', borderTop: '3px solid #E63946' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h4 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '1.5rem', color: '#E63946', marginBottom: '1rem' }}>
                EventsHub
              </h4>
              <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Your gateway to unforgettable experiences. Discover and book the best events in your area.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#1a1a2e', marginBottom: '1rem', fontWeight: '600' }}>
                Quick Links
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/events" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>Browse Events</Link>
                <Link to="/register" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>Become an Organizer</Link>
                <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>Help Center</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#1a1a2e', marginBottom: '1rem', fontWeight: '600' }}>
                Contact
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>support@eventshub.com</span>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>1-800-EVENTS</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#999', fontSize: '0.85rem' }}>
              © 2024 EventsHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}