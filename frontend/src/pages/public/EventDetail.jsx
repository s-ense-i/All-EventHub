import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import { eventService } from '../../services/eventService';
import { favoriteService } from '../../services/favoriteService';
import { ticketService } from '../../services/ticketService';
import { reviewService } from '../../services/reviewService';
import { useParticipantTickets } from '../../hooks/useParticipantTickets';
import { getEventAvailableTickets, getEventCategory, getEventDate, getEventImageUrl, getEventPrice, getEventTotalTickets } from '../../utils/eventUtils';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useContext(AuthContext);
  const { showToast } = useContext(NotificationContext);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookedPurchase, setBookedPurchase] = useState(location.state?.bookedPurchase || null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const isAdmin = user?.applyAs === 'Admin';

  const { data: favoriteRecords = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: async () => {
      const response = await favoriteService.getUserFavorites(user.id);
      return Array.isArray(response) ? response : (response?.data || []);
    },
    enabled: isAuthenticated && !!user?.id,
  });
  const favoriteList = Array.isArray(favoriteRecords) ? favoriteRecords : [];

  const {
    tickets: participantTickets = [],
    isLoading: ticketsLoading,
    refetch: refetchParticipantTickets,
  } = useParticipantTickets(user?.id, isAuthenticated);
  const purchase = bookedPurchase || participantTickets.find((ticket) => String(ticket.eventId) === String(id)) || location.state?.bookedPurchase || null;
  const hasPurchased = Boolean(purchase);
  const purchaseLoading = ticketsLoading;

  useEffect(() => {
    if (location.state?.bookedPurchase) {
      setBookedPurchase(location.state.bookedPurchase);
    }
  }, [id, location.state]);

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id),
    select: (response) => response.data,
  });

  const currentFavorite = favoriteList.find((favorite) => String(favorite.eventId) === String(id));
  const isFavorited = Boolean(currentFavorite);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited && currentFavorite) {
        await favoriteService.removeFavorite(currentFavorite.id);
        return 'removed';
      }

      await favoriteService.addFavorite(id);
      return 'added';
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-favorites', user?.id] });
    },
  });

  const handleFavoriteToggle = () => {
    if (favoriteMutation.isPending || favoritesLoading) return;
    favoriteMutation.mutate();
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Ensure participant tickets are fresh when auth/user changes,
  // and clear any optimistic bookedPurchase when the user changes or logs out.
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Invalidate then refetch to ensure we don't use stale cache
      queryClient.invalidateQueries({ queryKey: ['participant-tickets', user.id] });
      refetchParticipantTickets?.();
    } else {
      setBookedPurchase(null);
    }
  }, [isAuthenticated, user?.id]);



  const handleBookTicket = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (purchaseLoading) return;

    if (hasPurchased) {
      setBookingError('You have already booked this event.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      const bookingResponse = await ticketService.bookTicket(id, user.id, ticketCount);
      const createdPurchase = bookingResponse?.data || null;
      if (createdPurchase) {
        setBookedPurchase({
          ...createdPurchase,
          eventId: String(createdPurchase.eventId ?? id),
          participantId: createdPurchase.participantId ?? user.id,
        });
      }
      setBookingSuccess('Ticket booked successfully! Check your email for the digital ticket.');
      setShowBookingModal(false);
      setTicketCount(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['participant-tickets', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['event', id] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
      ]);
      // show toast instead of redirecting
      if (showToast) showToast('success', 'Ticket booked successfully!');
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book ticket. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!hasPurchased || isAdmin) {
      setReviewError('You can only review an event after booking it.');
      return;
    }

    setReviewLoading(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      await reviewService.submitReview({
        eventId: String(id),
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      setReviewSuccess('Your review was submitted successfully.');
      setReviewComment('');
      setReviewRating(5);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event', id] }),
        queryClient.invalidateQueries({ queryKey: ['event-reviews', id] }),
        queryClient.invalidateQueries({ queryKey: ['my-reviews'] }),
      ]);

      if (showToast) showToast('success', 'Review submitted successfully!');
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (eventLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1.1rem', color: '#666' }}>Loading event details...</p>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2.5rem', color: '#1a1a2e', marginBottom: '1rem' }}>
            Event Not Found
          </h1>
          <Link to="/events" style={{ color: '#E63946', fontWeight: '600', textDecoration: 'none' }}>
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
        <Header />
        <div style={{
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '2rem',
            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.12)',
            border: '1px solid #f0f0f0',
            textAlign: 'center',
          }}>
            <h2 style={{
              margin: '0 0 0.75rem 0',
              color: '#1a1a2e',
              fontFamily: "'Lobster Two', cursive",
              fontSize: '2rem',
            }}>
              Login Required
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', color: '#4b5563', lineHeight: 1.6 }}>
              You need to login to start browsing event details and booking tickets.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#E63946',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.75rem 1.2rem',
                  cursor: 'pointer',
                }}
              >
                Go to Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                style={{
                  border: '2px solid #E63946',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#E63946',
                  fontWeight: 700,
                  padding: '0.75rem 1.2rem',
                  cursor: 'pointer',
                }}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/events')}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#eef2f7',
                  color: '#1f2937',
                  fontWeight: 700,
                  padding: '0.75rem 1.2rem',
                  cursor: 'pointer',
                }}
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ticketTiers = [
    { name: 'Standard', price: getEventPrice(event), quantity: getEventTotalTickets(event), description: 'General admission access' },
    { name: 'VIP', price: getEventPrice(event) * 1.5, quantity: Math.floor(getEventTotalTickets(event) / 2), description: 'Priority seating & exclusive lounge' },
    { name: 'Premium', price: getEventPrice(event) * 2, quantity: Math.floor(getEventTotalTickets(event) / 5), description: 'Front row + meet & greet' },
  ];

  const facilities = [
    { icon: '🚻', label: 'Restrooms' },
    { icon: '🅿️', label: 'Parking' },
    { icon: '🍔', label: 'Food Services' },
    { icon: '🛡️', label: 'Security' },
  ];

  const eventDate = new Date(getEventDate(event));
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    year: 'numeric'
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div style={{ backgroundColor: '#f5f3f0', minHeight: '100vh' }}>
      <Header />

      {/* Hero Section with Title on Top (like Landing Page) */}
      <section style={{
        background: 'linear-gradient(-45deg, #E63946, #E63946cc, #1a1a2e)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 8s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        padding: '3rem 1.5rem 4rem',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Event Image Overlay - Semi-transparent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
        }}>
          <img
            src={getEventImageUrl(event)}
            alt={event.title}
            onError={(e) => {
              e.currentTarget.src = 'https://picsum.photos/seed/eventhub-fallback-detail/1200/800';
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              animation: 'fadeInImage 1s ease-out 0.3s both, imageSlowZoom 20s ease-in-out 0.3s forwards',
              filter: 'blur(1px)',
            }}
          />
          {/* Additional overlay to ensure text readability */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(-45deg, #E63946dd, #E63946aa, #1a1a2eee)',
          }}></div>
        </div>

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
          zIndex: 1,
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
          zIndex: 1,
        }}></div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto' }}>
          {/* Category Badge */}
          <span style={{
            display: 'inline-block',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.35rem 1rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '1rem',
            backdropFilter: 'blur(10px)',
            animation: 'fadeInUp 0.6s ease-out backwards',
          }}>
            {getEventCategory(event)}
          </span>

          {/* Event Title */}
          <h1 style={{
            fontFamily: "'Lobster Two', cursive",
            fontSize: '3rem',
            color: '#ffffff',
            marginBottom: '1rem',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            lineHeight: '1.2',
            animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
          }}>
            {event.title}
          </h1>

          {/* Quick Info Row */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1rem',
            animation: 'fadeInUp 0.6s ease-out 0.4s backwards',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📅</span>
              <span>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🕐</span>
              <span>{formattedTime || 'TBD'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📍</span>
              <span>{event.venue}</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '1.5rem',
          }}>
            {/* Price Badge */}
            {!isAdmin && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                color: '#E63946',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                fontSize: '1.25rem',
                fontWeight: '700',
                lineHeight: 1,
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                animation: 'fadeInUp 0.6s ease-out 0.6s backwards',
              }}>
                From ${getEventPrice(event).toFixed(0)}
              </div>
            )}

            {!isAdmin && (
              <button
                type="button"
                onClick={handleFavoriteToggle}
                disabled={favoriteMutation.isPending || favoritesLoading}
                aria-pressed={isFavorited}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '30px',
                  border: isFavorited ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.55)',
                  backgroundColor: isFavorited ? '#ffffff' : 'rgba(255,255,255,0.12)',
                  color: isFavorited ? '#E63946' : '#ffffff',
                  fontWeight: '700',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  cursor: favoriteMutation.isPending || favoritesLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.25s ease',
                  animation: 'fadeInUp 0.6s ease-out 0.75s backwards',
                }}
                onMouseEnter={(e) => {
                  if (!favoriteMutation.isPending && !favoritesLoading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.22)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.18)';
                }}
              >
                <span aria-hidden="true">{isFavorited ? '♥' : '♡'}</span>
                <span>{isFavorited ? 'Saved to favorites' : 'Add to favorites'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Organized By - Far Bottom Left */}
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1.5rem',
          color: '#ffffff',
          fontSize: '0.95rem',
          opacity: 0.95,
          animation: 'fadeInUp 0.6s ease-out 0.8s backwards',
          zIndex: 2,
        }}>
          <p style={{ margin: 0 }}>Organized by <strong>{event.organizerName || 'EventsHub'}</strong></p>
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
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInImage {
            from {
              opacity: 0;
            }
            to {
              opacity: 0.45;
            }
          }
          @keyframes imageSlowZoom {
            from {
              transform: scale(1);
            }
            to {
              transform: scale(1.15);
            }
          }
          @keyframes fadeInScale {
            from { opacity: 0; transform: translateY(-8px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </section>

      {/* Main Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Two Column Layout: Main Content + Sidebar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 350px',
          gap: '2rem',
          alignItems: 'start',
        }}>

          {/* Left Column: About & Venue */}
          <div>
            {/* About Event Section */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              marginBottom: '2rem',
            }}>
              <h2 style={{
                fontFamily: "'Lobster Two', cursive",
                fontSize: '1.75rem',
                color: '#1a1a2e',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span>About this event</span>
              </h2>
              <p style={{ color: '#666', fontSize: '1rem', lineHeight: '1.8' }}>
                {event.description || 'Join us for an unforgettable experience at this amazing event. Whether you are a first-time attendee or a seasoned event-goer, this event promises to deliver entertainment, networking opportunities, and memorable moments.'}
              </p>
            </div>

            {/* Venue Section */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              marginBottom: '2rem',
            }}>
              <h2 style={{
                fontFamily: "'Lobster Two', cursive",
                fontSize: '1.75rem',
                color: '#1a1a2e',
                marginBottom: '1.5rem',
              }}>
                Venue
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#1a1a2e', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                    {event.venue}
                  </h3>
                  <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                    123 Event Street, Downtown District, Cairo, Egypt
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <a href="#" style={{
                      color: '#E63946',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      padding: '0.5rem 1rem',
                      border: '2px solid #E63946',
                      borderRadius: '8px',
                      transition: 'all 0.3s',
                    }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#E63946';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#E63946';
                      }}
                    >
                      Venue Profile
                    </a>
                    <a href="#" style={{
                      color: '#E63946',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      padding: '0.5rem 1rem',
                      border: '2px solid #E63946',
                      borderRadius: '8px',
                      transition: 'all 0.3s',
                    }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#E63946';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#E63946';
                      }}
                    >
                      Get Directions
                    </a>
                  </div>

                  <h4 style={{ fontSize: '0.85rem', color: '#999', fontWeight: '600', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Facilities
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {facilities.map((facility, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#f8f8f8',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: '#666',
                      }}>
                        <span>{facility.icon}</span>
                        <span>{facility.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Venue Image */}
                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  height: '250px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                }}>
                  <img
                    src="https://images.unsplash.com/photo-1514539079130-25950c84af65?w=500&h=300&fit=crop"
                    alt="Venue"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tickets Sidebar (Sticky) */}
          <div style={{ position: 'sticky', top: '1.5rem', alignSelf: 'start', transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '2px solid #E63946',
                position: 'relative',
                overflow: 'hidden',
                filter: hasPurchased ? 'blur(4px)' : 'none',
                opacity: hasPurchased ? 0.6 : 1,
                pointerEvents: hasPurchased || isAdmin ? 'none' : 'auto',
                transition: 'filter 0.35s ease, opacity 0.35s ease'
              }}>
                <h2 style={{
                  fontFamily: "'Lobster Two', cursive",
                  fontSize: '1.5rem',
                  color: '#1a1a2e',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}>
                  {isAdmin ? 'Ticket Prices' : 'Select Tickets'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ticketTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      onClick={() => { if (purchaseLoading || hasPurchased || isAdmin) return; setSelectedTicket(idx); }}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        border: selectedTicket === idx ? '2px solid #E63946' : '2px solid #e0e0e0',
                        backgroundColor: selectedTicket === idx ? '#fef2f2' : '#ffffff',
                        cursor: purchaseLoading || hasPurchased || isAdmin ? 'default' : 'pointer',
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontWeight: '700',
                          color: selectedTicket === idx ? '#E63946' : '#1a1a2e',
                          fontSize: '1.1rem',
                        }}>
                          {tier.name}
                        </span>
                        <span style={{
                          fontWeight: '700',
                          color: '#E63946',
                          fontSize: '1.25rem',
                        }}>
                          ${tier.price.toFixed(0)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0' }}>
                        {tier.description}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#999', margin: '0' }}>
                        {tier.quantity} tickets available
                      </p>
                    </div>
                  ))}
                </div>

                {!isAdmin && (
                  <button
                    onClick={() => {
                      if (purchaseLoading) return;
                      if (hasPurchased) return;
                      if (selectedTicket === null) return;
                      if (!isAuthenticated) {
                        navigate('/login');
                        return;
                      }
                      setShowBookingModal(true);
                    }}
                    disabled={selectedTicket === null || hasPurchased || purchaseLoading}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      backgroundColor: selectedTicket !== null ? '#E63946' : '#ccc',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '1rem',
                      cursor: selectedTicket !== null ? 'pointer' : 'not-allowed',
                      marginTop: '1.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {purchaseLoading ? 'Checking...' : (selectedTicket !== null ? 'Book Now' : 'Select a Ticket')}
                  </button>
                )}

                {selectedTicket !== null && !isAdmin && (
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', marginTop: '0.75rem' }}>
                    Total: <strong style={{ color: '#E63946' }}>${(ticketTiers[selectedTicket].price).toFixed(0)}</strong>
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎟️</span>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: '#999', margin: '0', fontWeight: '600' }}>AVAILABILITY</p>
                    <p style={{ fontSize: '0.95rem', color: '#22c55e', margin: '0', fontWeight: '500' }}>{getEventAvailableTickets(event)} tickets left</p>
                  </div>
                </div>
              </div>

              {hasPurchased && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  gap: '1rem',
                  animation: 'fadeInScale 0.35s ease'
                }}>
                  <div style={{
                    backgroundColor: '#087f5b',
                    color: '#fff',
                    padding: '0.75rem 2.5rem',
                    borderRadius: '30px',
                    fontWeight: '800',
                    fontSize: '1.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    boxShadow: '0 8px 25px rgba(8,127,91,0.4)',
                    transform: 'rotate(-5deg)'
                  }}>
                    BOOKED
                  </div>
                  {purchase?.quantity && (
                    <div style={{
                      backgroundColor: '#fff',
                      color: '#1a1a2e',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                    }}>
                      {purchase.quantity} ticket(s) • #{purchase.id}
                    </div>
                  )}
                  <button onClick={() => setShowBookingDetailsModal(true)} style={{ padding: '0.5rem 1.25rem', borderRadius: '12px', backgroundColor: '#fff', color: '#E63946', border: '2px solid #E63946', fontWeight: '700', cursor: 'pointer', marginTop: '0.5rem', boxShadow: '0 4px 10px rgba(230,57,70,0.2)' }}>View Booking</button>
                </div>
              )}
            </div>

            {hasPurchased && !isAdmin && (
              <button
                onClick={() => setShowReviewModal(true)}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(26,26,46,0.2)',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a4a';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1a2e';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⭐</span> Add a Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
          onClick={() => !bookingLoading && setShowBookingModal(false)}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '2.5rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'fadeInUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                Book Your Tickets
              </h2>
              <p style={{ color: '#666', margin: '0' }}>
                {event.title}
              </p>
            </div>

            {/* Success Message */}
            {bookingSuccess && (
              <div style={{
                backgroundColor: '#d4edda',
                border: '1px solid #28a745',
                color: '#155724',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
              }}>
                {bookingSuccess}
              </div>
            )}

            {/* Error Message */}
            {bookingError && (
              <div style={{
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                color: '#721c24',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
              }}>
                {bookingError}
              </div>
            )}

            {/* Selected Ticket Info */}
            <div style={{
              backgroundColor: '#fef2f2',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontWeight: '700', color: '#E63946', margin: '0', fontSize: '1.1rem' }}>
                  {ticketTiers[selectedTicket].name}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0 0' }}>
                  {ticketTiers[selectedTicket].description}
                </p>
              </div>
              <p style={{ fontWeight: '700', color: '#E63946', fontSize: '1.5rem', margin: 0 }}>
                ${parseFloat(ticketTiers[selectedTicket].price).toFixed(2)}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                Number of Tickets
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  disabled={bookingLoading}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    backgroundColor: bookingLoading ? '#f0f0f0' : '#ffffff',
                    fontSize: '1.25rem',
                    cursor: bookingLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    opacity: bookingLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!bookingLoading) {
                      e.target.style.borderColor = '#E63946';
                      e.target.style.color = '#E63946';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!bookingLoading) {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.color = '#333';
                    }
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={bookingLoading}
                  style={{
                    width: '80px',
                    padding: '0.75rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1a1a2e',
                    opacity: bookingLoading ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                  disabled={bookingLoading}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    backgroundColor: bookingLoading ? '#f0f0f0' : '#ffffff',
                    fontSize: '1.25rem',
                    cursor: bookingLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    opacity: bookingLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!bookingLoading) {
                      e.target.style.borderColor = '#E63946';
                      e.target.style.color = '#E63946';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!bookingLoading) {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.color = '#333';
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#f8f8f8',
              borderRadius: '10px',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontWeight: '600', color: '#666' }}>Total Amount</span>
              <span style={{ fontWeight: '700', color: '#E63946', fontSize: '1.5rem' }}>
                ${(parseFloat(ticketTiers[selectedTicket].price) * ticketCount).toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingError('');
                  setBookingSuccess('');
                }}
                disabled={bookingLoading}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  backgroundColor: '#f5f3f0',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  color: '#666',
                  transition: 'all 0.3s',
                  opacity: bookingLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!bookingLoading) e.target.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  if (!bookingLoading) e.target.style.backgroundColor = '#f5f3f0';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBookTicket}
                disabled={bookingLoading || !isAuthenticated}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  backgroundColor: bookingLoading ? '#ccc' : '#E63946',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  if (!bookingLoading) {
                    e.target.style.backgroundColor = '#c92a37';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!bookingLoading) {
                    e.target.style.backgroundColor = '#E63946';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {bookingLoading ? 'Processing...' : (isAuthenticated ? 'Confirm Booking' : 'Login to Book')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal (for already-booked users) */}
      {showBookingDetailsModal && purchase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
        }} onClick={() => setShowBookingDetailsModal(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem', maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Your booking</h3>
              <button onClick={() => setShowBookingDetailsModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Booking ID</span><strong>#{purchase.id}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Quantity</span><strong>{purchase.quantity}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Booked on</span><strong>{new Date(purchase.bookingDate).toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Total paid</span><strong style={{ color: '#E63946' }}>${(purchase.totalPrice || 0).toFixed(2)}</strong></div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <img alt="QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(purchase.qrCode || purchase.id)}`} style={{ borderRadius: '8px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setShowBookingDetailsModal(false); navigate('/my-tickets'); }} style={{ padding: '0.65rem 1rem', borderRadius: '10px', backgroundColor: '#E63946', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Go to My Tickets</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
        }} onClick={() => !reviewLoading && setShowReviewModal(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2rem', color: '#1a1a2e', margin: 0 }}>
                Leave a Review
              </h2>
              <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {reviewSuccess && (
              <div style={{ padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '1rem' }}>
                {reviewSuccess}
              </div>
            )}
            {reviewError && (
              <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '1rem' }}>
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>Rating</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '2px solid #e0e0e0', width: '100%', fontSize: '1rem', backgroundColor: '#f8f8f8' }}
                >
                  <option value="5">5 - Excellent ⭐⭐⭐⭐⭐</option>
                  <option value="4">4 - Good ⭐⭐⭐⭐</option>
                  <option value="3">3 - Average ⭐⭐⭐</option>
                  <option value="2">2 - Poor ⭐⭐</option>
                  <option value="1">1 - Terrible ⭐</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows="4"
                  placeholder="Share your experience with this event..."
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '2px solid #e0e0e0', width: '100%', fontSize: '1rem', resize: 'vertical', backgroundColor: '#f8f8f8' }}
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={reviewLoading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: reviewLoading ? '#ccc' : '#E63946',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {reviewLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#f8f9fa', padding: '3rem 1.5rem 2rem', borderTop: '3px solid #E63946', marginTop: '3rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                <Link to="/contact" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>Help Center</Link>
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