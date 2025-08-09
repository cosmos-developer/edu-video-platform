const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the student user
    const student = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    });

    if (!student) {
      console.log('❌ Student user not found');
      
      // Create the student user
      console.log('Creating student user...');
      const passwordHash = await bcrypt.hash('Demo123!', 10);
      
      const newStudent = await prisma.user.create({
        data: {
          email: 'student@example.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Student',
          role: 'STUDENT',
          status: 'ACTIVE'
        }
      });
      
      console.log('✅ Student user created:', newStudent.email);
    } else {
      console.log('✅ Student user exists:', student.email);
      console.log('User details:', {
        id: student.id,
        email: student.email,
        role: student.role,
        tenantId: student.tenantId,
        status: student.status
      });
      
      // Test the password
      const passwordMatch = await bcrypt.compare('Demo123!', student.passwordHash);
      console.log('Password "Demo123!" is', passwordMatch ? 'correct ✅' : 'incorrect ❌');
      
      if (!passwordMatch) {
        // Update the password
        console.log('Updating password...');
        const newHash = await bcrypt.hash('Demo123!', 10);
        await prisma.user.update({
          where: { id: student.id },
          data: { passwordHash: newHash }
        });
        console.log('✅ Password updated to "Demo123!"');
      }
    }
    
    // List all users
    console.log('\nAll users in database:');
    const users = await prisma.user.findMany({
      select: { email: true, role: true, status: true }
    });
    users.forEach(u => console.log(`  - ${u.email} (${u.role}, ${u.status})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();