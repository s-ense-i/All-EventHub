using EventHub.DAL.Data;
using EventHub.DAL.Repositories.Interfaces;
using EventHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EventHub.DAL.Repositories.Implementations
{
    public sealed class OrderRepository : GenericRepository<Order>, IOrderRepository
    {
        public OrderRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Order?> GetByIdWithDetailsAsync(string orderId) =>
            await _dbSet
                .Include(o => o.Event)
                .Include(o => o.Tickets)
                .FirstOrDefaultAsync(o => o.Id == orderId);

        public async Task<IEnumerable<Order>> GetByParticipantAsync(string participantId) =>
            await _dbSet
                .Where(o => o.ParticipantId == participantId)
                .Include(o => o.Event)
                    .ThenInclude(e => e.Category)
                .Include(o => o.Event)
                    .ThenInclude(e => e.Organizer)
                .Include(o => o.Tickets)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Order>> GetByEventAsync(string eventId) =>
            await _dbSet
                .Where(o => o.EventId == eventId)
                .Include(o => o.Tickets)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
    }
}
