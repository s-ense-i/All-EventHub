namespace EventHub.BLL.Models
{
    public enum TicketVerifyOutcomeKind
    {
        NotFound,
        AlreadyUsed,
        Valid
    }

    public sealed class TicketVerificationDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string QrCode { get; set; } = string.Empty;
        public string EventId { get; set; } = string.Empty;
        public string EventTitle { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }
        public string Venue { get; set; } = string.Empty;
        public string ParticipantId { get; set; } = string.Empty;
        public string ParticipantFullName { get; set; } = string.Empty;
        public string ParticipantEmail { get; set; } = string.Empty;
        public string? ParticipantPhoneNumber { get; set; }
        public DateTime PurchasedAt { get; set; }
        public DateTime VerifiedAtUtc { get; set; }
    }

    public sealed class TicketLookupDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string QrCode { get; set; } = string.Empty;
        public string EventId { get; set; } = string.Empty;
        public string EventTitle { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }
        public string Venue { get; set; } = string.Empty;
        public string ParticipantId { get; set; } = string.Empty;
        public string ParticipantFullName { get; set; } = string.Empty;
        public string ParticipantEmail { get; set; } = string.Empty;
        public string? ParticipantPhoneNumber { get; set; }
        public DateTime PurchasedAt { get; set; }
        public bool IsUsed { get; set; }
        public DateTime? UsedAtUtc { get; set; }
    }

    public sealed class TicketVerifyOutcome
    {
        public TicketVerifyOutcomeKind Kind { get; init; }
        public TicketVerificationDto? Details { get; init; }

        public static TicketVerifyOutcome NotFound() =>
            new() { Kind = TicketVerifyOutcomeKind.NotFound };

        public static TicketVerifyOutcome AlreadyUsed() =>
            new() { Kind = TicketVerifyOutcomeKind.AlreadyUsed };

        public static TicketVerifyOutcome Valid(TicketVerificationDto dto) =>
            new() { Kind = TicketVerifyOutcomeKind.Valid, Details = dto };
    }
}
