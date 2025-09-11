const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createSampleData() {
  try {
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });
    
    console.log('Connected to database');
    
    // Create sample users
    const sampleUsers = [
      {
        email: 'player1@example.com',
        password: 'password123',
        role: 'player',
        profile: {
          first_name: 'Alex',
          last_name: 'Rodriguez',
          date_of_birth: '1995-05-15',
          nationality: 'Spain',
          position: 'midfielder',
          preferred_foot: 'right',
          height: 175.5,
          weight: 70.0,
          experience_level: 'amateur',
          bio: 'Passionate midfielder with 5 years of experience',
          phone: '+1234567890',
          location: 'Madrid, Spain',
          achievements: 'Regional tournament winner 2023'
        }
      },
      {
        email: 'coach1@example.com',
        password: 'password123',
        role: 'coach',
        profile: {
          first_name: 'Maria',
          last_name: 'Santos',
          date_of_birth: '1980-08-20',
          nationality: 'Brazil',
          position: 'coach',
          experience_level: 'professional',
          bio: 'Professional coach with 15 years of experience',
          phone: '+1234567891',
          location: 'São Paulo, Brazil',
          achievements: 'UEFA Pro License, Youth development specialist'
        }
      },
      {
        email: 'club1@example.com',
        password: 'password123',
        role: 'club_representative',
        profile: {
          first_name: 'John',
          last_name: 'Thompson',
          date_of_birth: '1975-03-10',
          nationality: 'England',
          position: 'manager',
          experience_level: 'professional',
          bio: 'Club representative seeking talented players',
          phone: '+1234567892',
          location: 'London, England',
          achievements: 'Managed 3 successful youth teams'
        }
      }
    ];
    
    // Insert users and profiles
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insert user
      const userResult = await dbConnection.execute(
        'INSERT IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [userData.email, hashedPassword, userData.role]
      );
      
      if (userResult[0].affectedRows > 0) {
        const userId = userResult[0].insertId;
        console.log(`Created user: ${userData.email} (ID: ${userId})`);
        
        // Insert profile
        await dbConnection.execute(
          `INSERT INTO profiles (
            user_id, first_name, last_name, date_of_birth, nationality, 
            position, preferred_foot, height, weight, experience_level, 
            bio, phone, location, achievements
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            userData.profile.first_name,
            userData.profile.last_name,
            userData.profile.date_of_birth,
            userData.profile.nationality,
            userData.profile.position,
            userData.profile.preferred_foot || null,
            userData.profile.height || null,
            userData.profile.weight || null,
            userData.profile.experience_level,
            userData.profile.bio,
            userData.profile.phone,
            userData.profile.location,
            userData.profile.achievements
          ]
        );
        console.log(`Created profile for: ${userData.profile.first_name} ${userData.profile.last_name}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }
    
    // Create sample listings
    const sampleListings = [
      {
        email: 'player1@example.com',
        title: 'Experienced Midfielder Seeking Team',
        description: 'Versatile midfielder with excellent passing skills and tactical awareness. Looking for a competitive team in the Madrid area.',
        type: 'player_seeking_team',
        position: 'midfielder',
        experience_level: 'amateur',
        location: 'Madrid, Spain',
        salary_range: '€500-1000/month',
        requirements: 'Competitive level, training 3x per week'
      },
      {
        email: 'coach1@example.com',
        title: 'Youth Coach Available',
        description: 'Professional coach with UEFA license available for youth team coaching. Specialized in player development and tactical training.',
        type: 'coaching_opportunity',
        position: 'coach',
        experience_level: 'professional',
        location: 'São Paulo, Brazil',
        salary_range: '€2000-3000/month',
        requirements: 'Youth team, focus on development'
      },
      {
        email: 'club1@example.com',
        title: 'Premier Youth Club Seeking Wingers',
        description: 'Top London youth club looking for talented wingers aged 16-20. Excellent development program with pathway to professional football.',
        type: 'team_seeking_player',
        position: 'winger',
        experience_level: 'semi_professional',
        location: 'London, England',
        salary_range: '€1000-2000/month',
        requirements: 'Age 16-20, pace and technical skills essential'
      },
      {
        email: 'club1@example.com',
        title: 'Trial Day for Goalkeepers',
        description: 'Open trial for goalkeepers of all levels. Professional coaching staff will assess potential and offer opportunities.',
        type: 'trial_opportunity',
        position: 'goalkeeper',
        experience_level: 'amateur',
        location: 'London, England',
        salary_range: null,
        requirements: 'Bring own gloves, commitment to training'
      }
    ];
    
    // Get user IDs for listings
    const users = await dbConnection.execute('SELECT id, email FROM users');
    const userMap = {};
    users[0].forEach(user => {
      userMap[user.email] = user.id;
    });
    
    // Insert listings
    for (const listing of sampleListings) {
      const userId = userMap[listing.email];
      if (userId) {
        await dbConnection.execute(
          `INSERT INTO listings (
            user_id, title, description, type, position, 
            experience_level, location, salary_range, requirements
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            listing.title,
            listing.description,
            listing.type,
            listing.position,
            listing.experience_level,
            listing.location,
            listing.salary_range,
            listing.requirements
          ]
        );
        console.log(`Created listing: ${listing.title}`);
      }
    }
    
    await dbConnection.end();
    console.log('Sample data created successfully!');
    
  } catch (error) {
    console.error('Sample data creation error:', error.message);
    process.exit(1);
  }
}

createSampleData();
