using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EventHub.BLL.Models;
using EventHub.Domain.Entities;

namespace EventHub.BLL.Services.Interfaces
{
    public interface ITicketService
    {
        Task<Ticket?> GetTicketByIdAsync(string ticketId);
        Task<Ticket?> GetTicketByQrCodeAsync(string qrCode);
        Task<IEnumerable<Ticket>> GetTicketsByParticipantAsync(string participantId);
        Task<IEnumerable<BookedTicketDto>> GetBookedTicketsByParticipantAsync(string participantId);
        Task<IEnumerable<Ticket>> GetTicketsByEventAsync(string eventId);
        Task<bool> HasParticipantPurchasedAsync(string participantId, string eventId);
        Task<TicketLookupDto?> GetTicketLookupByQrCodeAsync(string qrCode);

        Task<TicketPurchaseResult> PurchaseTicketAsync(string eventId, string participantId);

        /// <summary>Validates a ticket by QR token, marks it used on first successful verification, and returns outcome for the verify API.</summary>
        Task<TicketVerifyOutcome> VerifyTicketByQrCodeAsync(string qrCode, CancellationToken cancellationToken = default);
    }
}
