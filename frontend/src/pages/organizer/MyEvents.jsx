import { useContext, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { AuthContext } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { getEventDate } from '../../utils/eventUtils';

function formatDate(dateString) {
  if (!dateString) return 'TBD';

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useContext(AuthContext);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const pendingBannerTitle = location.state?.eventTitle || 'Your event';
  const showPendingBanner = Boolean(location.state?.justCreatedPendingEvent);

  const { data: organizerEvents = [], isLoading } = useQuery({
    queryKey: ['organizer-events', user?.id],
    queryFn: () => eventService.getEventsByOrganizer(user.id),
    select: (response) => response.data || [],
    enabled: isAuthenticated && user?.applyAs === 'EventOrganizer' && !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId) => eventService.deleteEvent(eventId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer-events', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['approved-events'] }),
      ]);
    },
  });

  if (!isAuthenticated || user?.applyAs !== 'EventOrganizer') {
    navigate('/');
    return null;
  }

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return organizerEvents.filter((event) => {
      const status = (event.status || 'Pending').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      if (!matchesStatus) return false;

      if (!search) return true;

      return (
        (event.title || '').toLowerCase().includes(search) ||
        (event.venue || '').toLowerCase().includes(search)
      );
    });
  }, [organizerEvents, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const counts = { total: organizerEvents.length, approved: 0, pending: 0, rejected: 0 };

    organizerEvents.forEach((event) => {
      const status = (event.status || 'Pending').toLowerCase();
      if (status === 'approved') counts.approved += 1;
      else if (status === 'rejected') counts.rejected += 1;
      else counts.pending += 1;
    });

    return counts;
  }, [organizerEvents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setError('');

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      <Header />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Lobster Two', cursive", fontSize: '2.25rem', color: '#1a1a2e' }}>My Events</h1>
            <p style={{ marginTop: '0.4rem', color: '#666' }}>Manage created events, edit details, and remove drafts or published posts.</p>
          </div>
          <Link
            to="/create-event"
            style={{ padding: '0.7rem 1rem', borderRadius: '10px', backgroundColor: '#E63946', color: '#fff', textDecoration: 'none', fontWeight: '700' }}
          >
            + Create Event
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}><p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>Total</p><p style={{ margin: '0.3rem 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#1a1a2e' }}>{summary.total}</p></div>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}><p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>Approved</p><p style={{ margin: '0.3rem 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#087f5b' }}>{summary.approved}</p></div>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}><p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>Pending</p><p style={{ margin: '0.3rem 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#b26a00' }}>{summary.pending}</p></div>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}><p style={{ color: '#777', margin: 0, fontSize: '0.85rem' }}>Rejected</p><p style={{ margin: '0.3rem 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#b42318' }}>{summary.rejected}</p></div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or venue"
            style={{ flex: '1 1 240px', minWidth: '240px', padding: '0.65rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.65rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff' }}
          >
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {showPendingBanner && (
          <div style={{ marginBottom: '1rem', backgroundColor: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', padding: '0.75rem 0.9rem', borderRadius: '10px' }}>
            <strong>{pendingBannerTitle}</strong> was submitted and is waiting for admin approval. It will appear publicly after approval.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '1rem', backgroundColor: '#fff1f3', color: '#b42318', border: '1px solid #fecdd3', padding: '0.75rem 0.9rem', borderRadius: '10px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', color: '#666' }}>Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#666', margin: 0 }}>No events found for this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredEvents.map((event) => {
              const status = event.status || 'Pending';
              const statusColor = status === 'Approved' ? '#087f5b' : status === 'Rejected' ? '#b42318' : '#b26a00';
              const statusBg = status === 'Approved' ? '#e8fff4' : status === 'Rejected' ? '#fff1f3' : '#fff7ed';

              return (
                <div key={event.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'grid', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1a1a2e' }}>{event.title}</h3>
                      <p style={{ margin: '0.3rem 0 0', color: '#666' }}>{event.venue} • {formatDate(getEventDate(event))}</p>
                    </div>
                    <span style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', fontWeight: '700', fontSize: '0.8rem', color: statusColor, backgroundColor: statusBg }}>
                      {status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Tickets: <strong style={{ color: '#1a1a2e' }}>{event.availableTickets ?? event.totalTickets ?? 0}</strong> / {event.totalTickets ?? 0}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button onClick={() => navigate(`/events/${event.id}`)} style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', fontWeight: '700', cursor: 'pointer' }}>View</button>
                      <button onClick={() => navigate(`/edit-event/${event.id}`)} style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
                      <button
                        onClick={() => setDeleteTarget({ id: event.id, title: event.title })}
                        disabled={deleteMutation.isPending}
                        style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#b42318', color: '#fff', fontWeight: '700', cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer', opacity: deleteMutation.isPending ? 0.7 : 1 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(15, 23, 42, 0.28)',
              border: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '999px', backgroundColor: '#fee2e2', color: '#b42318', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800' }}>!</div>
              <div>
                <h3 style={{ margin: 0, color: '#1a1a2e', fontSize: '1.2rem' }}>Delete event?</h3>
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.92rem' }}>This action cannot be undone.</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '0.9rem 1rem', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, color: '#111827', fontWeight: '700' }}>{deleteTarget.title}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#1f2937',
                  fontWeight: '700',
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: deleteMutation.isPending ? '#fca5a5' : '#b42318',
                  color: '#fff',
                  fontWeight: '800',
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

