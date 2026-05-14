using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EventHub.BLL.Configuration;
using EventHub.BLL.Models;
using EventHub.BLL.Services.Interfaces;
using EventHub.DAL.Repositories.Interfaces;
using EventHub.Domain.Entities;
using EventHub.Domain.Enums;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EventHub.BLL.Services.Implementations
{
    public class TicketService : ITicketService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ITicketQrCodeImageService _qrCodeImageService;
        private readonly TicketQrCodeStorageOptions _ticketQrOptions;

        public TicketService(
            IUnitOfWork unitOfWork,
            ITicketQrCodeImageService qrCodeImageService,
            IOptions<TicketQrCodeStorageOptions> ticketQrOptions)
        {
            _unitOfWork = unitOfWork;
            _qrCodeImageService = qrCodeImageService;
            _ticketQrOptions = ticketQrOptions.Value;
        }

        public async Task<TicketPurchaseResult> PurchaseTicketAsync(string eventId, string participantId)
        {
            const int maxRetries = 3;
            for (var attempt = 1; attempt <= maxRetries; attempt++)
            {
                await _unitOfWork.BeginTransactionAsync();
                try
                {
                    var alreadyBooked = await _unitOfWork.Tickets.HasParticipantPurchasedAsync(participantId, eventId);
                    if (alreadyBooked)
                        throw new InvalidOperationException("You already have a ticket for this event.");

                    var eventObj = await _unitOfWork.Events.GetByIdAsync(eventId);
                    if (eventObj == null)
                        throw new KeyNotFoundException("Event not found.");

                    if (eventObj.Status != EventStatus.Approved)
                        throw new InvalidOperationException("Only approved events can be booked.");

                    if (eventObj.EventDate <= DateTime.UtcNow)
                        throw new InvalidOperationException("You can only book upcoming events.");

                    if (eventObj.AvailableTickets < 1)
                        throw new InvalidOperationException("No tickets are available for this event.");

                    var reserved = await _unitOfWork.Events.TryDecrementAvailableTicketsAsync(eventId);
                    if (!reserved)
                        throw new InvalidOperationException("No tickets are available for this event.");

                    var order = new Order
                    {
                        ParticipantId = participantId,
                        EventId = eventObj.Id,
                        TotalPrice = eventObj.Price
                    };

                    var qrCode = Guid.NewGuid().ToString("N");
                    var verifyUrl = _ticketQrOptions.BuildTicketVerifyUrl(qrCode);
                    var qrImagePath = _qrCodeImageService.SavePngForQrToken(qrCode, verifyUrl);
                    var ticket = new Ticket
                    {
                        EventId = eventId,
                        ParticipantId = participantId,
                        OrderId = order.Id,
                        PurchasedAt = DateTime.UtcNow,
                        QrCode = qrCode,
                        QrCodeImagePath = qrImagePath
                    };

                    await _unitOfWork.Orders.AddAsync(order);
                    await _unitOfWork.Tickets.AddAsync(ticket);
                    await _unitOfWork.SaveChangesAsync();
                    await _unitOfWork.CommitTransactionAsync();

                    return new TicketPurchaseResult
                    {
                        OrderId = order.Id,
                        EventId = eventObj.Id,
                        ParticipantId = participantId,
                        TotalPrice = order.TotalPrice,
                        RemainingAvailableTickets = await _unitOfWork.Events.GetAvailableTicketsCountAsync(eventId),
                        TicketId = ticket.Id,
                        TicketQrCode = ticket.QrCode,
                        TicketQrCodeImagePath = ticket.QrCodeImagePath ?? string.Empty
                    };
                }
                catch (DbUpdateConcurrencyException) when (attempt < maxRetries)
                {
                    await _unitOfWork.RollbackTransactionAsync();
                }
                catch (DbUpdateException ex) when (IsUniqueViolation(ex))
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    throw new InvalidOperationException("You already have a ticket for this event.");
                }
                catch
                {
                    await _unitOfWork.RollbackTransactionAsync();
                    throw;
                }
            }

            throw new InvalidOperationException("Could not complete purchase due to concurrent bookings. Please try again.");
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            if (ex.InnerException is SqlException sql)
                return sql.Number is 2627 or 2601;
            return ex.InnerException?.InnerException is SqlException nested &&
                   nested.Number is 2627 or 2601;
        }

        public async Task<Ticket?> GetTicketByIdAsync(string ticketId)
        {
            return await _unitOfWork.Tickets.GetWithDetailsAsync(ticketId);
        }

        public async Task<Ticket?> GetTicketByQrCodeAsync(string qrCode)
        {
            return await _unitOfWork.Tickets.GetByQrCodeAsync(qrCode);
        }

        public async Task<IEnumerable<Ticket>> GetTicketsByEventAsync(string eventId)
        {
            return await _unitOfWork.Tickets.GetByEventAsync(eventId);
        }

        public async Task<IEnumerable<Ticket>> GetTicketsByParticipantAsync(string participantId)
        {
            return await _unitOfWork.Tickets.GetByParticipantAsync(participantId);
        }

        public async Task<IEnumerable<BookedTicketDto>> GetBookedTicketsByParticipantAsync(string participantId)
        {
            var orders = await _unitOfWork.Orders.GetByParticipantAsync(participantId);
            var dtos = new List<BookedTicketDto>();

            foreach (var order in orders)
            {
                var ticketCount = order.Tickets?.Count ?? 1;
                foreach (var ticket in order.Tickets ?? new List<Ticket>())
                {
                    dtos.Add(new BookedTicketDto
                    {
                        Id = ticket.Id,
                        EventId = ticket.EventId,
                        ParticipantId = ticket.ParticipantId,
                        OrderId = ticket.OrderId ?? string.Empty,
                        QrCode = ticket.QrCode,
                        PurchasedAt = ticket.PurchasedAt,
                        UsedAtUtc = ticket.UsedAtUtc,
                        Title = order.Event?.Title ?? string.Empty,
                        Description = order.Event?.Description,
                        EventDate = order.Event?.EventDate ?? DateTime.MinValue,
                        Venue = order.Event?.Venue ?? string.Empty,
                        Image = order.Event?.Image,
                        CategoryName = order.Event?.Category?.Name ?? "General",
                        OrganizerName = $"{order.Event?.Organizer?.FirstName ?? ""} {order.Event?.Organizer?.LastName ?? ""}".Trim(),
                        TotalPrice = order.TotalPrice,
                        Quantity = ticketCount,
                        Status = ticket.UsedAtUtc.HasValue ? "Used" : "Confirmed"
                    });
                }
            }

            return dtos;
        }

        public async Task<bool> HasParticipantPurchasedAsync(string participantId, string eventId)
        {
            return await _unitOfWork.Tickets.HasParticipantPurchasedAsync(participantId, eventId);
        }

        public async Task<TicketLookupDto?> GetTicketLookupByQrCodeAsync(string qrCode)
        {
            if (string.IsNullOrWhiteSpace(qrCode))
                return null;

            var ticket = await _unitOfWork.Tickets.GetByQrCodeWithDetailsAsync(qrCode.Trim());
            if (ticket == null)
                return null;

            var participant = ticket.Participant;
            return new TicketLookupDto
            {
                TicketId = ticket.Id,
                QrCode = ticket.QrCode,
                EventId = ticket.EventId,
                EventTitle = ticket.Event?.Title ?? string.Empty,
                EventDate = ticket.Event?.EventDate ?? default,
                Venue = ticket.Event?.Venue ?? string.Empty,
                ParticipantId = ticket.ParticipantId,
                ParticipantFullName = participant == null
                    ? string.Empty
                    : $"{participant.FirstName} {participant.LastName}".Trim(),
                ParticipantEmail = participant?.Email ?? string.Empty,
                ParticipantPhoneNumber = participant?.PhoneNumber,
                PurchasedAt = ticket.PurchasedAt,
                IsUsed = ticket.UsedAtUtc.HasValue,
                UsedAtUtc = ticket.UsedAtUtc
            };
        }

        public async Task<TicketVerifyOutcome> VerifyTicketByQrCodeAsync(string qrCode, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(qrCode))
                return TicketVerifyOutcome.NotFound();

            var token = qrCode.Trim();
            var ticket = await _unitOfWork.Tickets.GetByQrCodeWithDetailsAsync(token, cancellationToken);
            if (ticket == null)
                return TicketVerifyOutcome.NotFound();

            if (ticket.UsedAtUtc.HasValue)
                return TicketVerifyOutcome.AlreadyUsed();

            var verifiedAt = DateTime.UtcNow;
            ticket.UsedAtUtc = verifiedAt;
            _unitOfWork.Tickets.Update(ticket);
            await _unitOfWork.SaveChangesAsync();

            var participant = ticket.Participant;
            var fullName = participant == null
                ? string.Empty
                : $"{participant.FirstName} {participant.LastName}".Trim();

            var dto = new TicketVerificationDto
            {
                TicketId = ticket.Id,
                QrCode = ticket.QrCode,
                EventId = ticket.EventId,
                EventTitle = ticket.Event?.Title ?? string.Empty,
                EventDate = ticket.Event?.EventDate ?? default,
                Venue = ticket.Event?.Venue ?? string.Empty,
                ParticipantId = ticket.ParticipantId,
                ParticipantFullName = fullName,
                ParticipantEmail = participant?.Email ?? string.Empty,
                ParticipantPhoneNumber = participant?.PhoneNumber,
                PurchasedAt = ticket.PurchasedAt,
                VerifiedAtUtc = verifiedAt
            };

            return TicketVerifyOutcome.Valid(dto);
        }
    }
}
