using EventHub.API.Security;
using EventHub.API.Hubs;
using EventHub.BLL.Models;
using EventHub.BLL.Services.Interfaces;
using EventHub.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;

namespace EventHub.API.Controllers
{
    [Route("api/ticket")]
    [ApiController]
    [Authorize]
    public class TicketController : ControllerBase
    {
        private readonly ITicketService _ticketService;
        private readonly IHubContext<EventAvailabilityHub> _hubContext;
        private readonly IHostEnvironment _hostEnvironment;
        private readonly IUserService _userService;

        public TicketController(
            ITicketService ticketService,
            IHubContext<EventAvailabilityHub> hubContext,
            IHostEnvironment hostEnvironment,
            IUserService userService)
        {
            _ticketService = ticketService;
            _hubContext = hubContext;
            _hostEnvironment = hostEnvironment;
            _userService = userService;
        }

        private async Task<bool> HasApprovedOrganizerAccessAsync(string userId)
        {
            var currentUser = await _userService.GetUserByIdAsync(userId);
            return currentUser != null && currentUser.ApplyAs == UserRole.EventOrganizer && currentUser.Status == AccountStatus.Approved;
        }

        /// <summary>Public ticket verification (encoded in QR images). Marks ticket as used on first successful verification.</summary>
        [HttpGet("verify/{qrCode}")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyByQrCode(string qrCode, CancellationToken cancellationToken)
        {
            var outcome = await _ticketService.VerifyTicketByQrCodeAsync(qrCode, cancellationToken);
            return outcome.Kind switch
            {
                TicketVerifyOutcomeKind.NotFound => NotFound(new { message = "Ticket not found or invalid QR code." }),
                TicketVerifyOutcomeKind.AlreadyUsed => BadRequest(new { message = "This ticket has already been used." }),
                TicketVerifyOutcomeKind.Valid => Ok(outcome.Details),
                _ => Problem(statusCode: 500)
            };
        }

        [HttpGet("lookup/{qrCode}")]
        [AllowAnonymous]
        public async Task<IActionResult> LookupByQrCode(string qrCode)
        {
            var details = await _ticketService.GetTicketLookupByQrCodeAsync(qrCode);
            if (details == null)
                return NotFound(new { message = "Ticket not found or invalid QR code." });

            return Ok(details);
        }

        [HttpGet("{id}/qr-image")]
        public async Task<IActionResult> GetQrCodeImage(string id)
        {
            var ticket = await _ticketService.GetTicketByIdAsync(id);
            if (ticket == null)
                return NotFound();

            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var isParticipantOwner = ticket.ParticipantId == userId;
            var isAdmin = EventManagementAuth.IsAdmin(User);
            var isOrganizer = User.IsInRole(nameof(UserRole.EventOrganizer)) &&
                await HasApprovedOrganizerAccessAsync(userId) &&
                ticket.Event != null &&
                ticket.Event.OrganizerId == userId;

            if (!isParticipantOwner && !isAdmin && !isOrganizer)
                return Forbid();

            if (string.IsNullOrEmpty(ticket.QrCodeImagePath))
                return NotFound("No QR image for this ticket.");

            var relative = ticket.QrCodeImagePath.Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(_hostEnvironment.ContentRootPath, relative);
            if (!System.IO.File.Exists(fullPath))
                return NotFound();

            return PhysicalFile(fullPath, "image/png", Path.GetFileName(fullPath));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTicketById(string id)
        {
            var ticket = await _ticketService.GetTicketByIdAsync(id);
            if (ticket == null)
            {
                return NotFound();
            }
            return Ok(ticket);
        }

        [HttpGet("qrcode/{qrCode}")]
        public async Task<IActionResult> GetTicketByQrCode(string qrCode)
        {
            var ticket = await _ticketService.GetTicketByQrCodeAsync(qrCode);
            if (ticket == null)
            {
                return NotFound();
            }
            return Ok(ticket);
        }

        [HttpGet("participant/{participantId}")]
        public async Task<IActionResult> GetTicketsByParticipant(string participantId)
        {
            var tickets = await _ticketService.GetBookedTicketsByParticipantAsync(participantId);
            return Ok(tickets);
        }

        [HttpGet("event/{eventId}")]
        public async Task<IActionResult> GetTicketsByEvent(string eventId)
        {
            var tickets = await _ticketService.GetTicketsByEventAsync(eventId);
            return Ok(tickets);
        }

        [HttpGet("participant/{participantId}/has-purchased/{eventId}")]
        public async Task<IActionResult> HasParticipantPurchased(string participantId, string eventId)
        {
            var hasPurchased = await _ticketService.HasParticipantPurchasedAsync(participantId, eventId);
            return Ok(hasPurchased);
        }

        [HttpPost("purchase/{eventId}")]
        [Authorize(Roles = nameof(UserRole.Participant))]
        public async Task<IActionResult> PurchaseTicket(string eventId)
        {
            var participantId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(participantId))
                return Unauthorized();

            try
            {
                var purchase = await _ticketService.PurchaseTicketAsync(eventId, participantId);
                await _hubContext.Clients.Group(EventAvailabilityHub.GroupName(eventId))
                    .SendAsync("TicketAvailabilityChanged", new
                    {
                        eventId = purchase.EventId,
                        availableTickets = purchase.RemainingAvailableTickets
                    });

                return Ok(purchase);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
