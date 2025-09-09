async function fetchEvents() {
  const resp = await fetch('/api/events');
  if (!resp.ok) return [];
  return resp.json();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderEvents(events) {
  const grid = document.getElementById('events-grid');
  if (!grid) return;
  if (events.length === 0) {
    grid.innerHTML = '<p class="card">No posts yet. Be the first to add one above.</p>';
    return;
  }
  grid.innerHTML = '';
  for (const ev of events) {
    const card = document.createElement('article');
    card.className = 'card event-card';

    if (ev.mediaType === 'image') {
      const img = document.createElement('img');
      img.className = 'event-media';
      img.src = ev.mediaUrl;
      img.alt = 'Event image';
      card.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.className = 'event-media';
      video.src = ev.mediaUrl;
      video.controls = true;
      card.appendChild(video);
    }

    const story = document.createElement('div');
    story.className = 'event-story';
    story.textContent = ev.story || '';
    card.appendChild(story);

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = formatDate(ev.createdAt);
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'event-actions';
    const del = document.createElement('button');
    del.className = 'btn ghost';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      const adminKey = document.getElementById('adminKey')?.value || '';
      if (!adminKey) return alert('Enter admin key in the form above.');
      if (!confirm('Delete this post?')) return;
      const resp = await fetch(`/api/events/${ev.id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } });
      if (resp.ok) {
        loadEvents();
      } else {
        alert('Failed to delete');
      }
    });
    actions.appendChild(del);
    card.appendChild(actions);

    grid.appendChild(card);
  }
}

async function loadEvents() {
  const events = await fetchEvents();
  renderEvents(events);
}

function setupEventForm() {
  const form = document.getElementById('event-form');
  const status = document.getElementById('event-form-status');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Uploading...';
    const fd = new FormData(form);
    const adminKey = document.getElementById('adminKey')?.value || '';
    try {
      const resp = await fetch('/api/events', {
        method: 'POST',
        body: fd,
        headers: { 'x-admin-key': adminKey }
      });
      if (!resp.ok) {
        let msg = 'Upload failed';
        try {
          const data = await resp.json();
          if (data && data.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }
      status.textContent = 'Uploaded!';
      form.reset();
      loadEvents();
    } catch (err) {
      status.textContent = 'Failed to upload: ' + (err?.message || 'Unknown error');
    }
  });
}

function setupContactForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-form-status');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Sending...';
    const payload = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value,
    };
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Send failed');
      status.textContent = 'Message sent! I will reply soon.';
      form.reset();
    } catch (err) {
      status.textContent = 'Failed to send. Please try again later.';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventForm();
  setupContactForm();
  loadEvents();
});


