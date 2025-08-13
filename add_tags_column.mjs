
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function addTagsColumn() {
  try {
    // Check if tags column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'tags'
    `;
    
    if (columns.length === 0) {
      console.log('Adding tags column to customers table...');
      await sql`ALTER TABLE customers ADD COLUMN tags TEXT`;
      console.log('Tags column added successfully');
    } else {
      console.log('Tags column already exists');
    }
  } catch (error) {
    console.error('Error adding tags column:', error);
  }
}

addTagsColumn();
