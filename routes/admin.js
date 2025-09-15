const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { comparePassword } = require('../middleware/auth');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Simple admin interface without AdminJS to avoid ES module issues

// Admin login page
router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login - Football Marketplace</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 50px; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { text-align: center; color: #333; margin-bottom: 30px; }
            input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .error { color: red; text-align: center; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Admin Login</h1>
            <form method="post" action="/admin/login">
                <input type="email" name="email" placeholder="Admin Email" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
            ${req.query.error ? '<div class="error">Invalid credentials</div>' : ''}
        </div>
    </body>
    </html>
  `);
});

// Handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const rows = await query(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [email, 'admin']
    );

    if (rows.length === 0) {
      return res.redirect('/admin/login?error=1');
    }

    const user = rows[0];
    const isValid = await comparePassword(password, user.password_hash);
    
    if (isValid) {
      // Set session
      req.session = req.session || {};
      req.session.adminUser = { email: user.email, role: user.role, id: user.id };
      
      // Log audit event
      await autoAuditLog(req, user.id, AUDIT_ACTIONS.LOGIN, 'users', user.id, 
        { email }, { email }, 'Admin login');
      
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/admin/login?error=1');
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.redirect('/admin/login?error=1');
  }
});

// Dashboard route
router.get('/dashboard', (req, res) => {
  if (!req.session?.adminUser) {
    return res.redirect('/admin/login');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard - Football Marketplace</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .card h3 { margin-top: 0; color: #333; }
            .stat { font-size: 2em; font-weight: bold; color: #007bff; }
            .logout { float: right; color: #dc3545; text-decoration: none; }
            .logout:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Admin Dashboard</h1>
            <p>Welcome, ${req.session.adminUser.email}</p>
            <a href="/admin/logout" class="logout">Logout</a>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>Quick Stats</h3>
                <p>Total Users: <span class="stat" id="totalUsers">Loading...</span></p>
                <p>Active Listings: <span class="stat" id="activeListings">Loading...</span></p>
                <p>Pending Requests: <span class="stat" id="pendingRequests">Loading...</span></p>
            </div>
            
            <div class="card">
                <h3>Recent Activity</h3>
                <p>System is running normally</p>
                <p>Database connected</p>
                <p>All services operational</p>
            </div>
            
            <div class="card">
                <h3>Management</h3>
                <p><a href="/api/users">View Users API</a></p>
                <p><a href="/api/listings">View Listings API</a></p>
                <p><a href="/api/requests">View Requests API</a></p>
                <p><a href="/admin/events">Manage Events</a></p>
                <p><strong>Note:</strong> Use API endpoints for data management.</p>
            </div>
        </div>

        <script>
            // Load stats
            fetch('/admin/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
                    document.getElementById('activeListings').textContent = data.activeListings || 0;
                    document.getElementById('pendingRequests').textContent = data.pendingRequests || 0;
                })
                .catch(error => {
                    console.error('Failed to load stats:', error);
                    document.getElementById('totalUsers').textContent = 'N/A';
                    document.getElementById('activeListings').textContent = 'N/A';
                    document.getElementById('pendingRequests').textContent = 'N/A';
                });
        </script>
    </body>
    </html>
  `);
});

// Logout
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.redirect('/admin/login');
});

// Stats API - Enhanced for dashboard
router.get('/stats', async (req, res) => {
  try {
    console.log('Admin stats requested');
    
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log('User count query executed:', userCount[0].count);
    
    const activeUserCount = await query('SELECT COUNT(*) as count FROM users WHERE updated_at >= CURDATE() - INTERVAL 7 DAY');
    console.log('Active user count query executed:', activeUserCount[0].count);
    
    const listingCount = await query('SELECT COUNT(*) as count FROM listings WHERE is_active = 1');
    console.log('Active listing count query executed:', listingCount[0].count);
    
    const totalListingCount = await query('SELECT COUNT(*) as count FROM listings');
    console.log('Total listing count query executed:', totalListingCount[0].count);
    
    const requestCount = await query('SELECT COUNT(*) as count FROM requests WHERE status = "pending"');
    console.log('Pending request count query executed:', requestCount[0].count);
    
    const totalRequestCount = await query('SELECT COUNT(*) as count FROM requests');
    console.log('Total request count query executed:', totalRequestCount[0].count);
    
    const meetingCount = await query('SELECT COUNT(*) as count FROM meetings');
    console.log('Meeting count query executed:', meetingCount[0].count);

    // Simplified recent activity query
    const recentActivity = await query(`
      SELECT 
        'USER_REGISTERED' as action,
        CONCAT('New user: ', COALESCE(name, email)) as description,
        COALESCE(name, 'Unknown') as userName,
        CAST(id as CHAR) as userId,
        created_at
      FROM users 
      WHERE created_at >= NOW() - INTERVAL 7 DAY
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('Recent activity query executed:', recentActivity.length, 'activities');

    const stats = {
      totalUsers: userCount[0].count,
      activeUsers: activeUserCount[0].count,
      totalListings: totalListingCount[0].count,
      activeListings: listingCount[0].count,
      totalRequests: totalRequestCount[0].count,
      pendingRequests: requestCount[0].count,
      totalMeetings: meetingCount[0].count,
      recentActivity: recentActivity.map(activity => ({
        id: activity.userId,
        action: activity.action,
        description: activity.description,
        userName: activity.userName,
        userId: activity.userId,
        createdAt: activity.created_at
      }))
    };

    console.log('Stats compiled successfully:', JSON.stringify(stats, null, 2));
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
      activeListings: 0,
      totalRequests: 0,
      pendingRequests: 0,
      totalMeetings: 0,
      recentActivity: []
    });
  }
});

// Get all users for admin management
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const users = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.is_active as status,
        u.created_at,
        u.last_login_at,
        p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalCount = await query('SELECT COUNT(*) as count FROM users');
    const total = totalCount[0].count;
    const pages = Math.ceil(total / limit);

    res.json({
      data: users.map(user => ({
        id: user.id.toString(),
        email: user.email,
        name: user.name || 'N/A',
        role: user.role,
        status: user.status ? 'active' : 'inactive',
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        avatarUrl: user.avatar_url
      })),
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;
    
    const isActive = status === 'active' ? 1 : 0;
    
    await query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive, userId]
    );

    res.json({ 
      success: true, 
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get all listings for admin
router.get('/listings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const listings = await query(`
      SELECT 
        l.*,
        u.name as user_name,
        u.email as user_email
      FROM listings l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalCount = await query('SELECT COUNT(*) as count FROM listings');
    const total = totalCount[0].count;
    const pages = Math.ceil(total / limit);

    res.json({
      data: listings,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get all requests for admin
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const requests = await query(`
      SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email,
        l.title as listing_title
      FROM requests r
      JOIN users u ON r.sender_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalCount = await query('SELECT COUNT(*) as count FROM requests');
    const total = totalCount[0].count;
    const pages = Math.ceil(total / limit);

    res.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get all meetings for admin
router.get('/meetings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const meetings = await query(`
      SELECT 
        m.*,
        coach.name as coach_name,
        player.name as player_name,
        r.type as request_type
      FROM meetings m
      JOIN users coach ON m.coach_user_id = coach.id
      JOIN users player ON m.player_user_id = player.id
      LEFT JOIN requests r ON m.request_id = r.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalCount = await query('SELECT COUNT(*) as count FROM meetings');
    const total = totalCount[0].count;
    const pages = Math.ceil(total / limit);

    res.json({
      data: meetings,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Events management page
router.get('/events', (req, res) => {
  if (!req.session?.adminUser) {
    return res.redirect('/admin/login');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Events Management - Football Marketplace Admin</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            .form-group textarea { height: 100px; resize: vertical; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
            .btn:hover { background: #0056b3; }
            .btn-danger { background: #dc3545; }
            .btn-danger:hover { background: #c82333; }
            .events-list { margin-top: 20px; }
            .event-item { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
            .event-date { color: #007bff; font-weight: bold; }
            .event-type { background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; }
            .back-link { color: #007bff; text-decoration: none; }
            .back-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Events Management</h1>
            <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
        </div>
        
        <div class="card">
            <h3>Create New Event</h3>
            <form id="eventForm">
                <div class="form-group">
                    <label for="title">Event Title *</label>
                    <input type="text" id="title" name="title" required>
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" placeholder="Enter event description..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="event_date">Event Date & Time *</label>
                    <input type="datetime-local" id="event_date" name="event_date" required>
                </div>
                
                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location" placeholder="Enter event location...">
                </div>
                
                <div class="form-group">
                    <label for="event_type">Event Type</label>
                    <select id="event_type" name="event_type">
                        <option value="announcement">Announcement</option>
                        <option value="match">Match</option>
                        <option value="training">Training</option>
                        <option value="meeting">Meeting</option>
                        <option value="tournament">Tournament</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="image_url">Image URL</label>
                    <input type="url" id="image_url" name="image_url" placeholder="https://example.com/image.jpg">
                </div>
                
                <button type="submit" class="btn">Create Event</button>
                <button type="button" class="btn" onclick="clearForm()">Clear</button>
            </form>
        </div>
        
        <div class="card">
            <h3>Upcoming Events</h3>
            <div id="eventsList" class="events-list">
                Loading events...
            </div>
        </div>

        <script>
            let currentEditId = null;

            // Load events
            function loadEvents() {
                fetch('/api/events?limit=50')
                    .then(response => response.json())
                    .then(data => {
                        const eventsList = document.getElementById('eventsList');
                        if (data.events && data.events.length > 0) {
                            eventsList.innerHTML = data.events.map(event => {
                                const eventDate = new Date(event.event_date);
                                return \`
                                    <div class="event-item">
                                        <h4>\${event.title} <span class="event-type">\${event.event_type}</span></h4>
                                        <p class="event-date">📅 \${eventDate.toLocaleString()}</p>
                                        \${event.location ? \`<p>📍 \${event.location}</p>\` : ''}
                                        \${event.description ? \`<p>\${event.description}</p>\` : ''}
                                        <p><small>Created by: \${event.creator_first_name} \${event.creator_last_name}</small></p>
                                        <button class="btn" onclick="editEvent(\${event.id})">Edit</button>
                                        <button class="btn btn-danger" onclick="deleteEvent(\${event.id})">Delete</button>
                                    </div>
                                \`;
                            }).join('');
                        } else {
                            eventsList.innerHTML = '<p>No upcoming events found.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Failed to load events:', error);
                        document.getElementById('eventsList').innerHTML = '<p>Failed to load events.</p>';
                    });
            }

            // Create or update event
            document.getElementById('eventForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const eventData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    event_date: formData.get('event_date'),
                    location: formData.get('location'),
                    event_type: formData.get('event_type'),
                    image_url: formData.get('image_url')
                };

                const url = currentEditId ? \`/api/events/\${currentEditId}\` : '/api/events';
                const method = currentEditId ? 'PUT' : 'POST';

                fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(eventData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error: ' + data.error);
                    } else {
                        alert(currentEditId ? 'Event updated successfully!' : 'Event created successfully!');
                        clearForm();
                        loadEvents();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to save event');
                });
            });

            // Edit event
            function editEvent(id) {
                fetch(\`/api/events/\${id}\`)
                    .then(response => response.json())
                    .then(event => {
                        document.getElementById('title').value = event.title;
                        document.getElementById('description').value = event.description || '';
                        document.getElementById('event_date').value = new Date(event.event_date).toISOString().slice(0, 16);
                        document.getElementById('location').value = event.location || '';
                        document.getElementById('event_type').value = event.event_type;
                        document.getElementById('image_url').value = event.image_url || '';
                        
                        currentEditId = id;
                        document.querySelector('button[type="submit"]').textContent = 'Update Event';
                    })
                    .catch(error => {
                        console.error('Failed to load event:', error);
                        alert('Failed to load event for editing');
                    });
            }

            // Delete event
            function deleteEvent(id) {
                if (confirm('Are you sure you want to delete this event?')) {
                    fetch(\`/api/events/\${id}\`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert('Error: ' + data.error);
                        } else {
                            alert('Event deleted successfully!');
                            loadEvents();
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Failed to delete event');
                    });
                }
            }

            // Clear form
            function clearForm() {
                document.getElementById('eventForm').reset();
                currentEditId = null;
                document.querySelector('button[type="submit"]').textContent = 'Create Event';
            }

            // Load events on page load
            loadEvents();
        </script>
    </body>
    </html>
  `);
});

// Default route
router.get('/', (req, res) => {
  res.redirect('/admin/login');
});

module.exports = router;
