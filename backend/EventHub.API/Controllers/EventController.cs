using EventHub.API.Security;
using EventHub.BLL.Mapping;
using EventHub.BLL.Models;
using EventHub.BLL.Services.Interfaces;
using EventHub.Domain.Entities;
using EventHub.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventHub.API.Controllers
{
    [Route("api/event")]
    [ApiController]
    public class EventController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly IUserService _userService;

        public EventController(IEventService eventService, IUserService userService)
        {
            _eventService = eventService;
            _userService = userService;
        }

        private async Task<bool> HasApprovedOrganizerAccessAsync(string userId)
        {
            var currentUser = await _userService.GetUserByIdAsync(userId);
            return currentUser != null && currentUser.ApplyAs == UserRole.EventOrganizer && currentUser.Status == AccountStatus.Approved;
        }

        [HttpGet("{eventId}/analytics")]
        [Authorize(Roles = nameof(UserRole.EventOrganizer))]
        public async Task<IActionResult> GetEventAnalytics(string eventId)
        {
            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            if (!EventManagementAuth.IsAdmin(User) && !await HasApprovedOrganizerAccessAsync(userId))
                return Forbid();

            var analytics = await _eventService.GetEventAnalyticsForOrganizerAsync(userId, eventId);
            if (analytics == null)
                return NotFound();

            return Ok(analytics);
        }
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchEvents([FromQuery] string? keyword, [FromQuery] string? venue, [FromQuery] string? categoryId, [FromQuery] DateTime? eventDate)
        {
            var events = await _eventService.SearchEventsAsync(keyword, venue, categoryId, eventDate);
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }

        [HttpGet("upcoming")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUpcomingEvents([FromQuery] int count = 10)
        {
            var events = await _eventService.GetUpcomingEventsAsync(count);
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }


        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetEventById(string id)
        {
            var @event = await _eventService.GetEventByIdAsync(id);
            if (@event == null)
                return NotFound();
            return Ok(EventDtoMapper.ToResponseDto(@event));
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllEvents()
        {
            var events = await _eventService.GetAllEventsAsync();
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }

        [HttpGet("approved")]
        [AllowAnonymous]
        public async Task<IActionResult> GetApprovedEvents()
        {
            var events = await _eventService.GetApprovedEventsAsync();
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }

        [HttpGet("pending")]
        [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.EventOrganizer)}")]
        public async Task<IActionResult> GetPendingEvents()
        {
            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            if (!EventManagementAuth.IsAdmin(User) && !await HasApprovedOrganizerAccessAsync(userId))
                return Forbid();

            IEnumerable<Event> events;
            if (EventManagementAuth.IsAdmin(User))
                events = await _eventService.GetPendingEventsAsync();
            else
                events = await _eventService.GetPendingEventsForOrganizerAsync(userId);

            return Ok(EventDtoMapper.ToResponseDtos(events));
        }

        [HttpGet("organizer/{organizerId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetEventsByOrganizer(string organizerId)
        {
            var events = await _eventService.GetEventsByOrganizerAsync(organizerId);
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }

        [HttpGet("category/{categoryId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetEventsByCategory(string categoryId)
        {
            var events = await _eventService.GetEventsByCategoryAsync(categoryId);
            return Ok(EventDtoMapper.ToResponseDtos(events));
        }


        [HttpPost]
        [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.EventOrganizer)}")]
        public async Task<IActionResult> CreateEvent([FromBody] EventCreateDto dto)
        {
            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            if (!EventManagementAuth.IsAdmin(User) && !await HasApprovedOrganizerAccessAsync(userId))
                return Forbid();

            string organizerId;
            if (EventManagementAuth.IsAdmin(User))
            {
                if (string.IsNullOrWhiteSpace(dto.OrganizerId))
                    return BadRequest("OrganizerId is required when creating an event as an administrator.");
                organizerId = dto.OrganizerId.Trim();
            }
            else
                organizerId = userId;

            if (dto.TotalTickets < 1)
                return BadRequest("Total tickets must be at least 1.");

            var newEvent = new Event
            {
                OrganizerId = organizerId,
                CategoryId = dto.CategoryId,
                Title = dto.Title,
                Description = dto.Description,
                Venue = dto.Venue,
                EventDate = dto.EventDate,
                Image = dto.Image,
                Price = dto.Price,
                TotalTickets = dto.TotalTickets,
                AvailableTickets = dto.TotalTickets
            };

            try
            {
                var created = await _eventService.CreateEventAsync(newEvent);
                var withDetails = await _eventService.GetEventByIdAsync(created.Id);
                return CreatedAtAction(nameof(GetEventById), new { id = created.Id },
                    withDetails != null ? EventDtoMapper.ToResponseDto(withDetails) : EventDtoMapper.ToResponseDto(created));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.EventOrganizer)}")]
        public async Task<IActionResult> UpdateEvent(string id, [FromBody] EventUpdateDto dto)
        {
            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var existing = await _eventService.GetEventByIdAsync(id);
            if (existing == null)
                return NotFound();

            if (!EventManagementAuth.CanMutateEvent(User, existing.OrganizerId))
                return Forbid();

            var previousTotalTickets = existing.TotalTickets;
            var previousAvailableTickets = existing.AvailableTickets;
            var soldTickets = Math.Max(0, previousTotalTickets - previousAvailableTickets);

            if (dto.TotalTickets < soldTickets)
                return BadRequest($"Total tickets cannot be lower than the {soldTickets} tickets already sold.");

            existing.CategoryId = dto.CategoryId;
            existing.Title = dto.Title;
            existing.Description = dto.Description;
            existing.Venue = dto.Venue;
            existing.EventDate = dto.EventDate;
            existing.Image = dto.Image;
            existing.Price = dto.Price;
            existing.TotalTickets = dto.TotalTickets;
            existing.AvailableTickets = Math.Max(0, dto.TotalTickets - soldTickets);

            try
            {
                await _eventService.UpdateEventAsync(existing);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.EventOrganizer)}")]
        public async Task<IActionResult> DeleteEvent(string id)
        {
            var userId = EventManagementAuth.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var existing = await _eventService.GetEventByIdAsync(id);
            if (existing == null)
                return NotFound();

            if (!EventManagementAuth.CanMutateEvent(User, existing.OrganizerId))
                return Forbid();

            try
            {
                await _eventService.DeleteEventAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
