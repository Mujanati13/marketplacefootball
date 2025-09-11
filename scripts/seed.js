const { query, testConnection } = require('../config/database');
const { hashPassword } = require('../middleware/auth');
require('dotenv').config();

const seedData = async () => {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    console.log('Starting database seeding...');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    await query(
      `INSERT INTO users (email, password_hash, name, role, is_active) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['admin@footballmarketplace.com', adminPassword, 'Admin User', 'admin', true]
    );
    console.log('✓ Admin user created');

    // Create sample coach users
    const coachPassword = await hashPassword('coach123');
    const coaches = [
      {
        email: 'john.coach@example.com',
        name: 'John Smith',
        phone: '+1234567890'
      },
      {
        email: 'maria.trainer@example.com',
        name: 'Maria Rodriguez',
        phone: '+1234567891'
      },
      {
        email: 'david.mentor@example.com',
        name: 'David Wilson',
        phone: '+1234567892'
      }
    ];

    for (const coach of coaches) {
      const result = await query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [coach.email, coachPassword, coach.name, coach.phone, 'coach', true]
      );

      const userId = result.insertId || (await query('SELECT id FROM users WHERE email = ?', [coach.email]))[0].id;

      // Create coach profile
      await query(
        `INSERT INTO profiles (user_id, type, bio, location, years_experience, hourly_rate, currency, positions, skills, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE bio = VALUES(bio)`,
        [
          userId,
          'coach',
          `Experienced football coach with expertise in ${coach.name.includes('John') ? 'defensive strategies' : coach.name.includes('Maria') ? 'offensive tactics' : 'youth development'}.`,
          coach.name.includes('John') ? 'New York, NY' : coach.name.includes('Maria') ? 'Los Angeles, CA' : 'Chicago, IL',
          Math.floor(Math.random() * 10) + 5, // 5-15 years experience
          Math.floor(Math.random() * 50) + 50, // $50-100 per hour
          'USD',
          JSON.stringify(['Midfielder', 'Defender']),
          JSON.stringify(['Tactical Analysis', 'Player Development', 'Team Leadership']),
          JSON.stringify(['Professional', 'Experienced', 'Certified'])
        ]
      );

      // Create coach listing
      await query(
        `INSERT INTO listings (owner_user_id, type, title, description, price, currency, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [
          userId,
          'coach',
          `Professional Football Coaching by ${coach.name}`,
          `Get expert football coaching from ${coach.name}. Specialized in tactical development and skill improvement.`,
          Math.floor(Math.random() * 50) + 50,
          'USD',
          'active'
        ]
      );
    }
    console.log('✓ Coach users and profiles created');

    // Create sample player users
    const playerPassword = await hashPassword('player123');
    const players = [
      {
        email: 'alex.player@example.com',
        name: 'Alex Johnson',
        phone: '+1234567893'
      },
      {
        email: 'sarah.striker@example.com',
        name: 'Sarah Davis',
        phone: '+1234567894'
      }
    ];

    for (const player of players) {
      const result = await query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [player.email, playerPassword, player.name, player.phone, 'player', true]
      );

      const userId = result.insertId || (await query('SELECT id FROM users WHERE email = ?', [player.email]))[0].id;

      // Create player profile
      await query(
        `INSERT INTO profiles (user_id, type, bio, location, years_experience, hourly_rate, currency, positions, skills, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE bio = VALUES(bio)`,
        [
          userId,
          'player',
          `Talented football player looking for opportunities to grow and compete at higher levels.`,
          player.name.includes('Alex') ? 'Miami, FL' : 'Seattle, WA',
          Math.floor(Math.random() * 5) + 2, // 2-7 years experience
          Math.floor(Math.random() * 30) + 20, // $20-50 per hour
          'USD',
          JSON.stringify(player.name.includes('Alex') ? ['Forward', 'Midfielder'] : ['Forward', 'Winger']),
          JSON.stringify(['Ball Control', 'Speed', 'Shooting']),
          JSON.stringify(['Ambitious', 'Team Player', 'Dedicated'])
        ]
      );

      // Create player listing
      await query(
        `INSERT INTO listings (owner_user_id, type, title, description, price, currency, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [
          userId,
          'player',
          `${player.name} - Available for Team Opportunities`,
          `Skilled ${player.name.includes('Alex') ? 'midfielder/forward' : 'striker'} seeking team opportunities. Available for trials and matches.`,
          Math.floor(Math.random() * 30) + 20,
          'USD',
          'active'
        ]
      );
    }
    console.log('✓ Player users and profiles created');

    // Create sample customer users
    const customerPassword = await hashPassword('customer123');
    const customers = [
      {
        email: 'mike.customer@example.com',
        name: 'Mike Brown',
        phone: '+1234567895'
      },
      {
        email: 'jenny.fan@example.com',
        name: 'Jenny Wilson',
        phone: '+1234567896'
      }
    ];

    for (const customer of customers) {
      await query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [customer.email, customerPassword, customer.name, customer.phone, 'customer', true]
      );
    }
    console.log('✓ Customer users created');

    // Create sample requests
    const users = await query('SELECT id, role FROM users WHERE role IN ("customer", "player")');
    const listings = await query('SELECT id, owner_user_id, type FROM listings LIMIT 3');

    if (users.length > 0 && listings.length > 0) {
      for (let i = 0; i < Math.min(3, users.length); i++) {
        const user = users[i];
        const listing = listings[i % listings.length];
        
        // Don't create request if user owns the listing
        if (user.id !== listing.owner_user_id) {
          await query(
            `INSERT INTO requests (requester_user_id, target_user_id, listing_id, type, message, status) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE message = VALUES(message)`,
            [
              user.id,
              listing.owner_user_id,
              listing.id,
              listing.type === 'coach' ? 'hire' : 'buy',
              `Hi, I'm interested in your ${listing.type} services. Please let me know about availability.`,
              'pending'
            ]
          );
        }
      }
      console.log('✓ Sample requests created');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSample credentials:');
    console.log('Admin: admin@footballmarketplace.com / admin123');
    console.log('Coach: john.coach@example.com / coach123');
    console.log('Player: alex.player@example.com / player123');
    console.log('Customer: mike.customer@example.com / customer123');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedData().then(() => {
    console.log('Seeding completed successfully!');
    process.exit(0);
  });
}

module.exports = seedData;
