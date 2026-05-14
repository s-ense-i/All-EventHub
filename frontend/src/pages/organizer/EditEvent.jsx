import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { AuthContext } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { attachmentService } from '../../services/attachmentService';
import { useCategories } from '../../hooks/useCategories';
import { getEventAvailableTickets, getEventDate, getEventPrice, getEventTotalTickets } from '../../utils/eventUtils';

function splitDateTime(value) {
	if (!value) return { eventDate: '', eventTime: '' };

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return { eventDate: '', eventTime: '' };

	const eventDate = date.toISOString().slice(0, 10);
	const eventTime = date.toISOString().slice(11, 16);
	return { eventDate, eventTime };
}

export default function EditEvent() {
	const { id } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, isAuthenticated } = useContext(AuthContext);
	const { data: categories = [] } = useCategories();

	const [error, setError] = useState('');
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		venue: '',
		categoryId: '',
		eventDate: '',
		eventTime: '',
		ticketPrice: '',
		totalTickets: '',
		image: '',
	});
	const [imagePreview, setImagePreview] = useState(null);
	const [attachmentFile, setAttachmentFile] = useState(null);
	const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);

	const { data: event, isLoading } = useQuery({
		queryKey: ['event', id],
		queryFn: () => eventService.getEventById(id),
		select: (response) => response.data,
		enabled: !!id,
	});

	useEffect(() => {
		if (!event) return;

		const dateTime = splitDateTime(getEventDate(event));
		const image = event.image || '';

		setFormData({
			title: event.title || '',
			description: event.description || '',
			venue: event.venue || '',
			categoryId: String(event.categoryId || ''),
			eventDate: dateTime.eventDate,
			eventTime: dateTime.eventTime,
			ticketPrice: String(getEventPrice(event) || ''),
			totalTickets: String(getEventTotalTickets(event) || ''),
			image,
		});
		setImagePreview(image || null);
	}, [event]);

	const updateMutation = useMutation({
		mutationFn: ({ eventId, payload }) => eventService.updateEvent(eventId, payload),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['event', id] }),
				queryClient.invalidateQueries({ queryKey: ['organizer-events', user?.id] }),
				queryClient.invalidateQueries({ queryKey: ['events'] }),
				queryClient.invalidateQueries({ queryKey: ['approved-events'] }),
			]);
		},
	});

	const canEdit = useMemo(() => {
		if (!event || !user) return true;
		if (typeof event.organizerId === 'undefined' || event.organizerId === null) return true;
		return String(event.organizerId) === String(user.id);
	}, [event, user]);

	if (!isAuthenticated || user?.applyAs !== 'EventOrganizer') {
		navigate('/');
		return null;
	}

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleImageChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			const image = String(reader.result || '');
			setImagePreview(image);
			setFormData((prev) => ({ ...prev, image }));
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		if (!formData.title || !formData.description || !formData.venue || !formData.categoryId || !formData.eventDate || !formData.eventTime || !formData.ticketPrice || !formData.totalTickets) {
			setError('Please fill in all required fields.');
			return;
		}

		const payload = {
			title: formData.title,
			description: formData.description,
			venue: formData.venue,
			categoryId: String(formData.categoryId),
			eventDate: `${formData.eventDate}T${formData.eventTime}:00`,
			price: Number(formData.ticketPrice),
			totalTickets: Number(formData.totalTickets),
			availableTickets: getEventAvailableTickets(event),
			image: formData.image,
			organizerId: user.id,
		};

		try {
			await updateMutation.mutateAsync({ eventId: id, payload });
			await Promise.all(attachmentsToDelete.map((attachmentId) => attachmentService.deleteAttachment(attachmentId)));
			if (attachmentFile) {
				await attachmentService.uploadAttachment(id, attachmentFile);
			}
			navigate('/my-events');
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update event.');
		}
	};

	const inputStyle = {
		width: '100%',
		padding: '0.75rem 1rem',
		border: '2px solid #e0e0e0',
		borderRadius: '8px',
		fontSize: '0.95rem',
		fontFamily: 'inherit',
		backgroundColor: '#f8f8f8',
		color: '#333',
		transition: 'all 0.3s ease',
		boxSizing: 'border-box',
	};

	if (isLoading) {
		return (
			<div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
				<Header />
				<div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', color: '#666' }}>Loading event...</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
				<Header />
				<div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
					<div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
						<p style={{ margin: 0, color: '#666' }}>Event not found.</p>
					</div>
				</div>
			</div>
		);
	}

	if (!canEdit) {
		return (
			<div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
				<Header />
				<div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
					<div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
						<p style={{ margin: 0, color: '#b42318', fontWeight: '700' }}>You do not have permission to edit this event.</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div style={{ backgroundColor: '#f5f3f0', minHeight: '100vh' }}>
			<Header />
			<div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
				<div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 2px 15px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
					<div style={{ textAlign: 'center', marginBottom: '2rem' }}>
						<h1 style={{ fontFamily: "'Lobster Two', cursive", fontSize: '2.5rem', color: '#E63946', marginBottom: '0.5rem' }}>Edit Event</h1>
						<p style={{ color: '#666', fontSize: '0.95rem' }}>Update your event details and save changes</p>
					</div>

					{error && (
						<div style={{ backgroundColor: '#ffe0e6', border: '1px solid #E63946', color: '#E63946', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Event Title *</label>
							<input type="text" name="title" value={formData.title} onChange={handleChange} style={inputStyle} required />
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Description *</label>
							<textarea name="description" value={formData.description} onChange={handleChange} rows="4" style={{ ...inputStyle, resize: 'vertical' }} required />
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Venue *</label>
							<input type="text" name="venue" value={formData.venue} onChange={handleChange} style={inputStyle} required />
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Category *</label>
							<select name="categoryId" value={formData.categoryId} onChange={handleChange} style={inputStyle} required>
								<option value="">Select a category</option>
								{Array.isArray(categories) && categories.map((cat) => (
									<option key={cat.id} value={cat.id}>{cat.name}</option>
								))}
							</select>
							{Array.isArray(categories) && categories.length === 0 && (
								<p style={{ marginTop: '0.5rem', color: '#b45309', fontSize: '0.85rem' }}>
									No categories available yet. Ask an admin to create categories first.
								</p>
							)}
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Event Date *</label>
								<input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} style={inputStyle} required />
							</div>
							<div>
								<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Event Time *</label>
								<input type="time" name="eventTime" value={formData.eventTime} onChange={handleChange} style={inputStyle} required />
							</div>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Ticket Price ($) *</label>
								<input type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} step="0.01" min="0" style={inputStyle} required />
							</div>
							<div>
								<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Total Tickets *</label>
								<input type="number" name="totalTickets" value={formData.totalTickets} onChange={handleChange} min="1" style={inputStyle} required />
							</div>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Event Image</label>
							<input type="file" accept="image/*" onChange={handleImageChange} style={{ ...inputStyle, padding: '0.5rem' }} />
							{imagePreview && (
								<div style={{ marginTop: '1rem' }}>
									<img src={imagePreview} alt="Preview" style={{ maxWidth: '220px', maxHeight: '200px', borderRadius: '8px', border: '2px solid #E63946' }} />
								</div>
							)}
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.5rem' }}>Attachments</label>
							{Array.isArray(event.attachments) && event.attachments.length > 0 && (
								<div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
									{event.attachments.map((attachment) => {
										const isMarked = attachmentsToDelete.includes(attachment.id);
										const filePath = attachment.filePath || attachment.FilePath || '';
										const fileName = filePath.split(/[\\/]/).pop() || 'Attachment';
										return (
											<label key={attachment.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isMarked ? '#999' : '#1a1a2e', textDecoration: isMarked ? 'line-through' : 'none' }}>
												<input
													type="checkbox"
													checked={isMarked}
													onChange={(e) => {
														setAttachmentsToDelete((prev) => e.target.checked
															? [...prev, attachment.id]
															: prev.filter((id) => id !== attachment.id));
													}}
												/>
												Remove {fileName}
											</label>
										);
									})}
								</div>
							)}
							<input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: '0.5rem' }} />
							{attachmentFile && <p style={{ marginTop: '0.5rem', color: '#087f5b', fontSize: '0.85rem' }}>Selected: {attachmentFile.name}</p>}
						</div>

						<div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
							<button type="button" onClick={() => navigate('/my-events')} style={{ flex: 1, padding: '0.875rem 1rem', backgroundColor: '#f5f3f0', color: '#1a1a2e', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
							<button type="submit" disabled={updateMutation.isPending} style={{ flex: 1, padding: '0.875rem 1rem', backgroundColor: updateMutation.isPending ? '#ccc' : '#E63946', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: updateMutation.isPending ? 'not-allowed' : 'pointer' }}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
